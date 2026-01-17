import cv2
from ultralytics import YOLO
import torch

class InferenceEngine:
    def __init__(self, model_path):
        print(f"Loading model: {model_path}")
        
        self.device = "cuda"
        self.model = YOLO(model_path)
        self.model.to(self.device)
        
        # GTX 1650: Slightly larger size for better quality
        self.inference_size = (640, 360)  # Increased from 512×288
        
        print(f"✅ Model loaded on {self.device.upper()}")
        print(f"🎯 Inference size: {self.inference_size}")

    def run(self, frame):
        try:
            # Store original
            original_shape = frame.shape[:2]
            
            # Resize with BICUBIC interpolation (better quality)
            resized = cv2.resize(frame, self.inference_size, interpolation=cv2.INTER_CUBIC)
            
            # Run inference
            results = self.model(
                resized,
                conf=0.30,
                iou=0.45,
                verbose=False,
                device=self.device,
                half=False  # Stable without FP16
            )[0]
            
            processed = results.plot()
            
            # Resize back with LANCZOS (best quality)
            if processed.shape[:2] != original_shape:
                processed = cv2.resize(processed, (original_shape[1], original_shape[0]), interpolation=cv2.INTER_LANCZOS4)
            
            return processed
            
        except Exception as e:
            print(f"Inference error: {e}")
            return frame  # Return original if error