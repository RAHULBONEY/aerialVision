
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

# =========================
# CONFIG
# =========================

MODEL_PATH = "best.pt"
UPLOAD_DIR = "videos_uploaded"
PROCESSED_DIR = "videos_processed"
TRACKER_CONFIG = "botsort.yaml"

CONF_THRES = 0.25
IOU_THRES = 0.5

PIXELS_TO_METERS = 0.1

ZONES = [
    {"name": "Left Lane",  "xyxyn": (0.30, 0.25, 0.53, 0.98), "color": (255, 255, 0)},
    {"name": "Right Lane", "xyxyn": (0.53, 0.25, 0.78, 0.98), "color": (0, 255, 255)},
]

VEHICLE_CLASSES = {"car", "truck", "bus", "van"}

# =========================
# SETUP
# =========================

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

print("[INIT] Loading model...")
model = YOLO(MODEL_PATH)
print("[INIT] Model loaded")

# =========================
# FASTAPI
# =========================

app = FastAPI(title="Aerial Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ANALYTICS
# =========================

class TrafficAnalytics:
    def __init__(self):
        self.track_history = {}

    def calculate_speed(self, track_id, cx, cy, fps):
        speed = 0.0
        if track_id in self.track_history:
            px, py = self.track_history[track_id]
            dist = math.sqrt((cx - px) ** 2 + (cy - py) ** 2)
            speed = dist * fps * PIXELS_TO_METERS * 3.6
        self.track_history[track_id] = (cx, cy)
        return speed

analytics = TrafficAnalytics()

# =========================
# EMERGENCY VEHICLE LOGIC
# =========================

def is_emergency_vehicle(frame, box):
    x1, y1, x2, y2 = box
    roi = frame[y1:y2, x1:x2]

    if roi.size == 0:
        return False

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    # Red
    red1 = cv2.inRange(hsv, (0, 90, 60), (10, 255, 255))
    red2 = cv2.inRange(hsv, (170, 90, 60), (180, 255, 255))
    red_mask = red1 + red2

    # Blue
    blue_mask = cv2.inRange(hsv, (95, 80, 50), (140, 255, 255))

    # White (ambulance body cue)
    white_mask = cv2.inRange(hsv, (0, 0, 200), (180, 40, 255))

    red_ratio = red_mask.mean() / 255.0
    blue_ratio = blue_mask.mean() / 255.0
    white_ratio = white_mask.mean() / 255.0

    return (
        red_ratio > 0.010 or
        blue_ratio > 0.010 or
        (white_ratio > 0.25 and (red_ratio + blue_ratio) > 0.005)
    )


# =========================
# ROUTES
# =========================

@app.get("/")
def health():
    return {"status": "ok", "model": "loaded"}

@app.post("/process-video")
async def process_video(video: UploadFile = File(...)):

    clean_name = re.sub(r"[^\w\.]", "_", video.filename)
    input_path = os.path.join(UPLOAD_DIR, clean_name)
    output_path = os.path.join(PROCESSED_DIR, f"processed_{clean_name}")

    with open(input_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise HTTPException(500, "Cannot open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    results_gen = model.track(
        source=input_path,
        stream=True,
        tracker=TRACKER_CONFIG,
        conf=CONF_THRES,
        iou=IOU_THRES,
        persist=True,
        verbose=False,
    )

    out = None

    for results in tqdm(results_gen, total=total_frames, desc="Processing"):

        frame = results.orig_img.copy()
        h, w, _ = frame.shape

        # ================= DETECTIONS =================
        if results.boxes is not None and len(results.boxes) > 0:

            boxes = results.boxes.xyxy.cpu().numpy()
            confs = results.boxes.conf.cpu().numpy()
            class_ids = results.boxes.cls.cpu().numpy()
            track_ids = (
                results.boxes.id.cpu().numpy()
                if results.boxes.id is not None
                else [None] * len(boxes)
            )

            for (x1, y1, x2, y2), conf, cls, tid in zip(
                boxes, confs, class_ids, track_ids
            ):
                if conf < CONF_THRES:
                    continue

                x1, y1, x2, y2 = map(int, (x1, y1, x2, y2))
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

                speed = analytics.calculate_speed(tid, cx, cy, fps) if tid is not None else 0

                label_name = model.names[int(cls)]
                color = (0, 255, 0)

                # Emergency vehicle detection
                box_area = (x2 - x1) * (y2 - y1)
                frame_area = w * h

                is_large_vehicle = box_area / frame_area > 0.02
                if is_large_vehicle and is_emergency_vehicle(frame, (x1, y1, x2, y2)):
                    label_name = "EMERGENCY"
                    color = (0, 0, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                if label_name not in VEHICLE_CLASSES and is_large_vehicle:
                    label_name = "VEHICLE"

                label = f"{label_name} {int(speed)} km/h"
                cv2.putText(
                    frame,
                    label,
                    (x1, max(0, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2,
                )

        # ================= ZONES =================
        overlay = frame.copy()
        for z in ZONES:
            x1n, y1n, x2n, y2n = z["xyxyn"]
            zx1, zy1 = int(x1n * w), int(y1n * h)
            zx2, zy2 = int(x2n * w), int(y2n * h)
            cv2.rectangle(overlay, (zx1, zy1), (zx2, zy2), z["color"], -1)

        frame = cv2.addWeighted(overlay, 0.15, frame, 0.85, 0)

        if out is None:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

        out.write(frame)

    out.release()
    os.remove(input_path)

    return FileResponse(output_path, media_type="video/mp4")

# =========================
# ENTRY
# =========================

if __name__ == "__main__":
    print("[START] API running at http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
