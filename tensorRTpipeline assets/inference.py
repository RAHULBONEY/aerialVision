import cv2
from ultralytics import YOLO
import torch
import numpy as np

class InferenceEngine:
    def __init__(self, model_path):
        print(f"Loading model: {model_path}")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        if self.device == "cuda":
            torch.cuda.empty_cache()
            print("GPU Detected: Running in High Performance Mode")
        else:
            print("WARNING: Running on CPU (Will be slow)")

        self.model = YOLO(model_path)
        self.model.to(self.device)
        self.target_width = 640

    def run(self, frame):
        try:
            height, width = frame.shape[:2]
            aspect_ratio = height / width
            new_width = self.target_width
            new_height = int(new_width * aspect_ratio)

            resized_frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)

            results = self.model(
                resized_frame,
                conf=0.5,
                iou=0.45,
                classes=[2, 3, 5, 7],
                verbose=False,
                imgsz=640
            )[0]

            processed_frame = results.plot()

            return processed_frame

        except Exception as e:
            print(f"Inference error: {e}")
            return frame
