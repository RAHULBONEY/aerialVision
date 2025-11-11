import os
import uvicorn
import shutil
import cv2
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO


MODEL_PATH = "best.pt" 
UPLOAD_DIR = "videos_uploaded"
PROCESSED_DIR = "videos_processed"


AMBULANCE_CLASS_ID = 4  
CONGESTION_THRESHOLD = 25


os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)


print(f"Loading model from {MODEL_PATH}...")
try:
    model = YOLO(MODEL_PATH)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None


app = FastAPI(
    title="Aerial Vision API",
    description="Processes videos for smart traffic monitoring."
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """ A simple endpoint to check if the API is running. """
    return {"message": "Welcome to the Aerial Vision API!", "model_loaded": model is not None}


@app.post("/process-video")
async def process_video_endpoint(video: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=500, detail="Model could not be loaded.")

    input_path = ""
    output_path = ""
    out = None  
    
    try:
        
        input_path = os.path.join(UPLOAD_DIR, video.filename)
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        print(f"DEBUG: File saved to {input_path}")

        
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise HTTPException(status_code=500, detail="Could not open uploaded video file.")
        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.release()
        if not fps or fps <= 0:
            fps = 30 

        
        basename = os.path.splitext(video.filename)[0]
        output_filename = f"processed_{basename}.mp4" 
        output_path = os.path.join(PROCESSED_DIR, output_filename)
        
        print(f"DEBUG: Output path will be: {output_path}")

        
        results_generator = model.predict(
            source=input_path,
            stream=True,
            tracker="deepsort.yaml"  
        )

        frame_count = 0
        for results in results_generator:
            annotated_frame = results.plot() 

          
            
            is_ambulance_detected = False
            vehicle_count = 0

           
            if results.boxes.id is not None:
                vehicle_count = len(results.boxes.id)
                class_ids = results.boxes.cls.int().cpu().tolist()
                
                
                if AMBULANCE_CLASS_ID in class_ids:
                    is_ambulance_detected = True

            
            if vehicle_count > CONGESTION_THRESHOLD:
                cv2.putText(
                    annotated_frame, 
                    "CONGESTION", 
                    (50, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    3, 
                    (0, 0, 255), 
                    5, 
                    cv2.LINE_AA
                )
            
            
            if is_ambulance_detected:
                cv2.putText(
                    annotated_frame, 
                    "AMBULANCE DETECTED", 
                    (50, 200),
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    3,
                    (0, 0, 255), 
                    5, 
                    cv2.LINE_AA
                )
            
           
            if out is None:
                frame_height, frame_width, _ = annotated_frame.shape
                fourcc = cv2.VideoWriter_fourcc(*'mp4v') 
                out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
                if not out.isOpened():
                    print("DEBUG: FATAL ERROR - cv2.VideoWriter failed to open. Check H.264 (avc1) codec support.")
                    raise HTTPException(status_code=500, detail="Could not create video writer.")
                print(f"DEBUG: VideoWriter initialized with size: {frame_width}x{frame_height} @ {fps} FPS")
            
            out.write(annotated_frame)
            frame_count += 1
        
        if frame_count == 0:
            raise HTTPException(status_code=500, detail="Model did not process any frames.")
        
        if out:
            out.release()
        
        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
        if file_size == 0:
             raise HTTPException(status_code=500, detail="Processed video file is empty (0 bytes).")

        
        return FileResponse(
            path=output_path,
            media_type="video/mp4",
            filename=output_filename
        )

    except Exception as e:
        print(f"DEBUG: Error during processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        
        if os.path.exists(input_path):
            os.remove(input_path)
            print(f"DEBUG: Cleaned up {input_path}")


if __name__ == "__main__":
    print(f"Starting API server on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)