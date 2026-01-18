# inference.py
import cv2
from ultralytics import YOLO
import torch
import time
import psutil

class InferenceEngine:
    def __init__(self, model_path):
        print(f"Loading model: {model_path}")
        
        # GTX 1650 CRASH PREVENTION
        self.FORCE_CPU = False  # Set to True if GPU still crashes
        
        if not self.FORCE_CPU and torch.cuda.is_available():
            # Check VRAM availability
            gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1e9
            if gpu_mem < 3.5:  # Less than 3.5GB? Use CPU
                print(f"⚠️  GPU has only {gpu_mem:.1f}GB VRAM, falling back to CPU")
                self.device = "cpu"
            else:
                self.device = "cuda"
                
                # CRITICAL: Set memory fraction to prevent OOM
                torch.cuda.set_per_process_memory_fraction(0.7, 0)  # Use max 70% of VRAM
        else:
            print("❌ CUDA disabled or forced CPU mode")
            self.device = "cpu"
            
        self.model = YOLO(model_path)
        self.model.to(self.device)
        
        # GTX 1650: Ultra-lightweight inference
        self.inference_size = (416, 416)
        self.frame_cooldown = 100 if self.device == "cuda" else 0  # 100ms cooldown on GPU
        
        # Memory management
        self._frame_count = 0
        
        print(f"✅ Model loaded on {self.device.upper()}")
        print(f"🎯 Inference size: {self.inference_size}")
        print(f"❄️  Frame cooldown: {self.frame_cooldown}ms")

    def run(self, frame):
        try:
            original_shape = frame.shape[:2]
            
            # Resize
            resized = cv2.resize(frame, self.inference_size, interpolation=cv2.INTER_AREA)
            
            # Clear cache logic (keep existing)...
            self._frame_count += 1
            if self._frame_count % 30 == 0 and self.device == "cuda":
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            # --- CHANGED SECTION START ---
            
            # 1. Define classes to keep (COCO IDs)
            # 2=Car, 3=Motorcycle, 5=Bus, 7=Truck
            VEHICLE_CLASSES = [2, 3, 5, 7] 
            
            # Inference with stricter filtering
            results = self.model(
                resized,
                conf=0.5,      # Increased from 0.35 to 0.5 to reduce garbage detections
                iou=0.45,      # Lower IOU helps merge overlapping boxes better
                classes=VEHICLE_CLASSES, # ONLY detect vehicles, ignore people/misc
                verbose=False,
                device=self.device,
                half=self.device == "cuda"
            )[0]
            
            # --- CHANGED SECTION END ---
            
            processed = results.plot()
            
            # Resize back
            if processed.shape[:2] != original_shape:
                processed = cv2.resize(processed, (original_shape[1], original_shape[0]), interpolation=cv2.INTER_LINEAR)
            
            # COOLDOWN logic (keep existing)...
            if self.frame_cooldown > 0:
                time.sleep(self.frame_cooldown / 1000.0)
            
            return processed
            
        except torch.cuda.OutOfMemoryError:
            print("🚨 CRITICAL: GPU OOM - Emergency fallback to CPU")
            self.device = "cpu"
            self.model.to("cpu")
            return frame  
            
        except Exception as e:
            print(f"Inference error: {e}")
            return frame