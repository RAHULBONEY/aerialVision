import cv2
from ultralytics import YOLO
import torch
import numpy as np

class InferenceEngine:
    def __init__(self, model_path):
        print(f"Loading model: {model_path}")
        
        # KAGGLE T4 GPU SETTINGS
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        if self.device == "cuda":
            # Clear cache for fresh start
            torch.cuda.empty_cache()
            print("✅ GPU Detected: Running in High Performance Mode")
        else:
            print("⚠️ WARNING: Running on CPU (Will be slow)")

        self.model = YOLO(model_path)
        self.model.to(self.device)
        
        # TARGET WIDTH (Standard for YOLO)
        # 640px width keeps aspect ratio (e.g. 640x360)
        # This prevents "Squashed cars looking like trucks"
        self.target_width = 640 

    def run(self, frame):
        try:
            # 1. SMART RESIZE (Maintain Aspect Ratio)
            # We resize ONLY for speed and AI accuracy. 
            # We do NOT resize back to 1080p (waste of bandwidth).
            height, width = frame.shape[:2]
            aspect_ratio = height / width
            new_width = self.target_width
            new_height = int(new_width * aspect_ratio)
            
            # This is the image we send to AI and Stream
            resized_frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)

            # 2. RUN INFERENCE
            # classes=[2, 3, 5, 7] -> Car, Motorcycle, Bus, Truck
            results = self.model(
                resized_frame, 
                conf=0.5, 
                iou=0.45, 
                classes=[2, 3, 5, 7], 
                verbose=False,
                imgsz=640
            )[0]

            # 3. DRAW BOXES
            # We plot directly on the smaller frame. 
            # This is 10x faster to process and upload.
            processed_frame = results.plot()

            return processed_frame
            
        except Exception as e:
            print(f"Inference error: {e}")
            return frame