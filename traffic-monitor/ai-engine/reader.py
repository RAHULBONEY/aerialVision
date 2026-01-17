import subprocess
import cv2
import threading
import queue
import time
import os

class StreamReader:
    def __init__(self, source, inference_engine, fps_limit=12, max_queue=2):
        self.running = False
        self.source = source
        self.inference_engine = inference_engine
        self.fps_limit = fps_limit
        self.max_queue = max_queue
        self.last_time = time.time()
        
        self.frame_queue = queue.Queue(maxsize=max_queue)
        self.result_queue = queue.Queue(maxsize=max_queue)
        
        os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '-8'

        # Initialize capture
        self._init_capture(source)

    def _init_capture(self, source):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if source.startswith("http"):
                    # Use BEST quality (not worst) for visual clarity
                    cmd = ["yt-dlp", "-f", "best[ext=mp4]", "--get-url", source]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                    direct_url = result.stdout.strip()
                    
                    if not direct_url:
                        raise ValueError("No URL returned")
                        
                    self.cap = cv2.VideoCapture(direct_url)
                    self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                else:
                    try:
                        self.cap = cv2.VideoCapture(int(source))
                    except ValueError:
                        self.cap = cv2.VideoCapture(source)

                if not self.cap.isOpened():
                    raise ValueError("Failed to open capture")
                
                print(f"✅ Capture initialized (attempt {attempt+1})")
                return
                
            except Exception as e:
                print(f"Capture init failed (attempt {attempt+1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(1)

    def start(self):
        self.running = True
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        self.inference_thread = threading.Thread(target=self._inference_loop, daemon=True)
        self.inference_thread.start()

    def _capture_loop(self):
        while self.running:
            now = time.time()
            if now - self.last_time < 1.0 / self.fps_limit:
                time.sleep(0.001)
                continue
            self.last_time = now

            ret, frame = self.cap.read()
            if not ret:
                print("⚠️ Frame read failed, reinitializing...")
                time.sleep(1)
                try:
                    self._init_capture(self.source)
                    continue
                except:
                    continue

            try:
                self.frame_queue.put_nowait(frame)
            except queue.Full:
                pass

    def _inference_loop(self):
        while self.running:
            try:
                frame = self.frame_queue.get(timeout=0.1)
                processed_frame = self.inference_engine.run(frame)
                
                if processed_frame is not None:
                    try:
                        self.result_queue.put_nowait(processed_frame)
                    except queue.Full:
                        pass
            except queue.Empty:
                time.sleep(0.001)
            except Exception as e:
                print(f"Inference loop error: {e}")
                continue

    def stop(self):
        self.running = False
        if hasattr(self, 'capture_thread'):
            self.capture_thread.join(timeout=1)
        if hasattr(self, 'inference_thread'):
            self.inference_thread.join(timeout=1)
        self.cap.release()

    def stream(self):
        while self.running:
            try:
                frame = self.result_queue.get(timeout=0.1)
                
                # HIGHER JPEG quality for visual clarity
                # Balance: 70 = good quality, still fast network
                _, buffer = cv2.imencode(
                    '.jpg',
                    frame,
                    [cv2.IMWRITE_JPEG_QUALITY, 70]  # ← INCREASED from 40-50
                )
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                    
            except queue.Empty:
                time.sleep(0.001)