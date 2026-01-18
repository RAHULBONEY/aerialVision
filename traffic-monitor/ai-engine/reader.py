# reader.py
import cv2
import time
import threading
import psutil
import yt_dlp  

class StreamReader:
    def __init__(self, source_url, engine, fps_limit=10, max_queue=1):
        self.source_url = source_url
        self.engine = engine
        self.fps_limit = fps_limit
        
        # Frame dropping
        self.frame_interval = 1.0 / fps_limit
        self.last_frame_time = 0
        
        # GPU thermal protection
        self.gpu_temp_threshold = 80  # Celsius
        self.emergency_cooldown = False
        
        # Shared variable + lock for broadcasting
        self.latest_frame = None
        self.lock = threading.Lock()
        
        self.running = False
        self.thread = None
        
    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._read_loop)
        self.thread.daemon = True
        self.thread.start()
        
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()

    def _get_youtube_stream_url(self, url):
        """Extracts the direct .m3u8 stream URL from a YouTube link"""
        try:
            print(f"🔍 Resolving YouTube URL: {url}")
            ydl_opts = {
                'format': 'best',
                'quiet': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return info['url']
        except Exception as e:
            print(f"❌ Error resolving YouTube URL: {e}")
            return url  # Fallback to original if failed

    def _check_gpu_temperature(self):
        if self.engine.device != "cuda":
            return False
        try:
            import nvidia_smi
            nvidia_smi.nvmlInit()
            handle = nvidia_smi.nvmlDeviceGetHandleByIndex(0)
            temp = nvidia_smi.nvmlDeviceGetTemperature(handle, nvidia_smi.NVML_TEMPERATURE_GPU)
            if temp > self.gpu_temp_threshold:
                print(f"🔥 GPU THERMAL THROTTLE: {temp}°C")
                return True
            return False
        except:
            return False

    def _read_loop(self):
        # 1. Resolve URL if it's YouTube
        real_url = self.source_url
        if "youtube.com" in self.source_url or "youtu.be" in self.source_url:
            real_url = self._get_youtube_stream_url(self.source_url)
            print(f"✅ Resolved URL: {real_url[:50]}...")

        cap = cv2.VideoCapture(real_url)
        
        # Check if opened successfully
        if not cap.isOpened():
            print(f"❌ Failed to open video source: {real_url[:50]}...")
        
        while self.running:
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Stream packet loss or ended. Retrying...")
                time.sleep(1)
                # Optional: Re-resolve URL here if it expired
                cap = cv2.VideoCapture(real_url)
                continue
                
            if self._check_gpu_temperature():
                self.emergency_cooldown = True
                time.sleep(1.0)
                continue
                
            current_time = time.time()
            if current_time - self.last_frame_time < self.frame_interval:
                time.sleep(0.01)
                continue 
                
            self.last_frame_time = current_time
            
            # Inference
            processed = self.engine.run(frame)
            
            # Update shared frame safely
            with self.lock:
                self.latest_frame = processed
        
        cap.release()
        
    def stream(self):
        while True:
            frame_to_send = None
            with self.lock:
                if self.latest_frame is not None:
                    frame_to_send = self.latest_frame
            
            if frame_to_send is None:
                time.sleep(0.1)
                continue
            
            try:
                _, buffer = cv2.imencode('.jpg', frame_to_send)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            except:
                pass
            
            time.sleep(self.frame_interval)