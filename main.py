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
            print("DEBUG: FATAL ERROR - cv2.VideoCapture could not open the input file.")
            raise HTTPException(status_code=500, detail="Could not open uploaded video file.")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        
        if not fps or fps <= 0:
            print(f"DEBUG: Invalid FPS {fps} read from video. Defaulting to 30.")
            fps = 30
       
        
        print(f"DEBUG: Original video FPS read as: {fps}")
        cap.release()

        
        basename = os.path.splitext(video.filename)[0]
        output_filename = f"processed_{basename}.mp4"
        output_path = os.path.join(PROCESSED_DIR, output_filename)
        
        print(f"DEBUG: Output path will be: {output_path}")

        
        results_generator = model.predict(
            source=input_path,
            stream=True,
            tracker="botsort.yaml"
        )

        frame_count = 0
        for results in results_generator:
            annotated_frame = results.plot() 

            
            if out is None:
                frame_height, frame_width, _ = annotated_frame.shape
                fourcc = cv2.VideoWriter_fourcc(*'avc1') 
                out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
                
                if not out.isOpened():
                    print("DEBUG: FATAL ERROR - cv2.VideoWriter failed to open.")
                    raise HTTPException(status_code=500, detail="Could not create video writer.")
                print(f"DEBUG: VideoWriter initialized with size: {frame_width}x{frame_height} @ {fps} FPS")
            
            out.write(annotated_frame)
            frame_count += 1
        
        if frame_count == 0:
            print("DEBUG: FATAL ERROR - No frames were processed by the model.")
            raise HTTPException(status_code=500, detail="Model did not process any frames.")

        print(f"DEBUG: Processed {frame_count} frames.")
        
        
        if out:
            out.release()
        print("DEBUG: VideoWriter released.")

       
        file_size = 0
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            
        print(f"DEBUG: Final file created at {output_path} with size {file_size} bytes.")
        
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