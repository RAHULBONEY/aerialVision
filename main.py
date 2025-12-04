import os
import re
import math
import time
import shutil

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from tqdm import tqdm
from ultralytics import YOLO


MODEL_PATH = "best.pt"
UPLOAD_DIR = "videos_uploaded"
PROCESSED_DIR = "videos_processed"


TRACKER_CONFIG = "botsort.yaml"


AMBULANCE_CLASS_ID = 4


PIXELS_TO_METERS = 0.1 


MIN_CARS_FOR_JAM = 5       
JAM_SPEED_THRESHOLD = 20.0 


ZONES = [
    {
        "name": "Left Lane",
        "xyxyn": (0.30, 0.25, 0.53, 0.98),
        "color": (255, 255, 0),  # BGR
    },
    {
        "name": "Right Lane",
        "xyxyn": (0.53, 0.25, 0.78, 0.98),
        "color": (0, 255, 255),
    },
]

ZONE_JAM_THRESHOLD = 8  

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# model loading

print(f"Loading model from {MODEL_PATH}...")
try:
    model = YOLO(MODEL_PATH)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None



app = FastAPI(title="Aerial Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Analytics class for speed calculation

class TrafficAnalytics:
    def __init__(self):
        # track_id -> (x, y, t_last)
        self.track_history = {}

    def calculate_speed(self, track_id, center_x, center_y, fps: float) -> float:
        """
        Approximate speed in km/h from pixel motion.
        """
        current_time = time.time()
        speed = 0.0

        if track_id in self.track_history:
            prev_x, prev_y, prev_time = self.track_history[track_id]
            distance_pixels = math.sqrt(
                (center_x - prev_x) ** 2 + (center_y - prev_y) ** 2
            )
            
            speed = distance_pixels * fps * PIXELS_TO_METERS * 3.6

        self.track_history[track_id] = (center_x, center_y, current_time)
        return speed


analytics = TrafficAnalytics()


#Routes
@app.get("/")
def root():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/process-video")
async def process_video_endpoint(video: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=500, detail="Model could not be loaded.")

    input_path = ""
    out = None

    try:
        
        clean_name = re.sub(r"[^\w\.]", "_", video.filename)
        input_path = os.path.join(UPLOAD_DIR, clean_name)

        
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        print(f"DEBUG: File saved to {input_path}")

        
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            cap.release()
            raise HTTPException(status_code=500, detail="Could not open uploaded video.")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if not fps or fps <= 0:
            fps = 30.0
        cap.release()

        basename = os.path.splitext(clean_name)[0]
        output_filename = f"processed_{basename}.mp4"
        output_path = os.path.join(PROCESSED_DIR, output_filename)

        print(f"DEBUG: Processing {total_frames} frames @ {fps:.1f} FPS using BoT-SORT...")

        results_generator = model.track(
            source=input_path,
            stream=True,
            tracker=TRACKER_CONFIG,
            conf=0.25,
            persist=True,   
            verbose=False,
        )

        frame_count = 0

        for results in tqdm(results_generator, total=total_frames, desc="Processing", unit="frame"):
            annotated_frame = results.orig_img.copy()
            h, w, _ = annotated_frame.shape

            
            zone_counts = {z["name"]: 0 for z in ZONES}

            vehicle_count_on_screen = 0
            is_ambulance_present = False
            total_speed = 0.0

            if results.boxes.id is not None:
                boxes = results.boxes.xyxy.int().cpu().tolist()
                track_ids = results.boxes.id.int().cpu().tolist()
                class_ids = results.boxes.cls.int().cpu().tolist()
                vehicle_count_on_screen = len(track_ids)

                for box, track_id, class_id in zip(boxes, track_ids, class_ids):
                    x1, y1, x2, y2 = box
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

                    
                    speed = analytics.calculate_speed(track_id, cx, cy, fps)
                    total_speed += speed

                    
                    color = (0, 255, 0)
                    label_extra = ""
                    if int(class_id) == AMBULANCE_CLASS_ID:
                        is_ambulance_present = True
                        color = (0, 165, 255)  
                        label_extra = " [PRIORITY]"

                    
                    for zone in ZONES:
                        x1n, y1n, x2n, y2n = zone["xyxyn"]
                        zx1 = int(x1n * w)
                        zy1 = int(y1n * h)
                        zx2 = int(x2n * w)
                        zy2 = int(y2n * h)
                        if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
                            zone_counts[zone["name"]] += 1
                            break

                    
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)

                    
                    class_name = model.names[int(class_id)]
                    label = f"ID:{track_id} {class_name} {int(speed)}km/h{label_extra}"

                    font = cv2.FONT_HERSHEY_SIMPLEX
                    font_scale = 0.9  
                    thickness = 2
                    (tw, th), _ = cv2.getTextSize(label, font, font_scale, thickness)
                    label_y1 = max(y1 - th - 8, 0)
                    label_y2 = y1

                    cv2.rectangle(annotated_frame, (x1, label_y1), (x1 + tw + 4, label_y2), color, -1)
                    cv2.putText(
                        annotated_frame,
                        label,
                        (x1 + 2, label_y2 - 4),
                        font,
                        font_scale,
                        (255, 255, 255),
                        thickness,
                        lineType=cv2.LINE_AA,
                    )

           
            overlay = annotated_frame.copy()
            for zone in ZONES:
                x1n, y1n, x2n, y2n = zone["xyxyn"]
                zx1 = int(x1n * w)
                zy1 = int(y1n * h)
                zx2 = int(x2n * w)
                zy2 = int(y2n * h)

                base_color = zone["color"]
                name = zone["name"]
                count = zone_counts[name]

                
                color = base_color
                if count >= ZONE_JAM_THRESHOLD:
                    color = (0, 0, 255)

                
                cv2.rectangle(overlay, (zx1, zy1), (zx2, zy2), color, -1)

            
            alpha = 0.18
            annotated_frame = cv2.addWeighted(overlay, alpha, annotated_frame, 1 - alpha, 0)

           
            for zone in ZONES:
                x1n, y1n, x2n, y2n = zone["xyxyn"]
                zx1 = int(x1n * w)
                zy1 = int(y1n * h)
                name = zone["name"]
                count = zone_counts[name]

                label = f"{name}: {count} veh"
                if count >= ZONE_JAM_THRESHOLD:
                    label += " (HEAVY)"

                cv2.putText(
                    annotated_frame,
                    label,
                    (zx1 + 10, zy1 + 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 0, 0),
                    2,
                    lineType=cv2.LINE_AA,
                )

           
            avg_speed = 0.0
            if vehicle_count_on_screen > 0:
                avg_speed = total_speed / max(vehicle_count_on_screen, 1)

            
            if vehicle_count_on_screen >= MIN_CARS_FOR_JAM and avg_speed < JAM_SPEED_THRESHOLD:
                text = f"GLOBAL CONGESTION: {vehicle_count_on_screen} VEH, Avg {int(avg_speed)} km/h"
                cv2.rectangle(annotated_frame, (40, 30), (1100, 90), (0, 0, 255), -1)
                cv2.putText(
                    annotated_frame,
                    text,
                    (50, 75),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.95,
                    (255, 255, 255),
                    3,
                    lineType=cv2.LINE_AA,
                )

            
            if is_ambulance_present:
                cv2.rectangle(annotated_frame, (40, 100), (900, 160), (0, 255, 255), -1)
                cv2.putText(
                    annotated_frame,
                    "AMBULANCE DETECTED – PRIORITY GREEN WAVE",
                    (50, 145),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (0, 0, 0),
                    3,
                    lineType=cv2.LINE_AA,
                )

            
            if out is None:
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))
                if not out.isOpened():
                    raise HTTPException(status_code=500, detail="Could not create video writer.")

            out.write(annotated_frame)
            frame_count += 1

        if out:
            out.release()

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise HTTPException(status_code=500, detail="Processed video file is empty.")

        print(f"DEBUG: Finished {frame_count} frames -> {output_path}")

        return FileResponse(
            path=output_path,
            media_type="video/mp4",
            filename=output_filename,
        )

    except Exception as e:
        print(f"DEBUG Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            video.file.close()
        except Exception:
            pass

        try:
            cv2.destroyAllWindows()
        except Exception:
            pass

        if input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
                print(f"DEBUG: Cleaned up {input_path}")
            except PermissionError:
                print(f"WARNING: Could not delete {input_path} (file in use). Skipping.")


if __name__ == "__main__":
    print("Starting API server at http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
