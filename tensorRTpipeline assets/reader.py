import cv2
import time
import threading
import yt_dlp

class StreamReader:
    def __init__(self, source_url, engine):
        self.source_url = source_url
        self.engine = engine
        
        # STREAMING SETTINGS
        self.frame_interval = 1.0 / 30  # Target 30 FPS stream
        self.skip_counter = 0
        self.ai_interval = 2  # Run AI every 2nd frame (Smooths video)
        
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
        try:
            ydl_opts = {'format': 'best', 'quiet': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return info['url']
        except:
            return url

    def _read_loop(self):
        real_url = self.source_url
        if "youtube.com" in self.source_url or "youtu.be" in self.source_url:
            print(f"🔍 Resolving YouTube: {self.source_url}")
            real_url = self._get_youtube_stream_url(self.source_url)

        cap = cv2.VideoCapture(real_url)
        
        while self.running:
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Stream dropped, reconnecting...")
                time.sleep(1)
                cap = cv2.VideoCapture(real_url)
                continue
            
            # OPTIMIZATION: Frame Skipping
            # We run AI on frame 1, display raw frame 2, run AI on frame 3...
            # This makes the video look 2x smoother.
            self.skip_counter += 1
            if self.skip_counter % self.ai_interval == 0:
                # Run AI (This now returns the small 640px image)
                processed = self.engine.run(frame)
                with self.lock:
                    self.latest_frame = processed
            else:
                # Just resize and show raw frame (for smoothness)
                # We must resize it to match the AI frame size (640px)
                # otherwise the stream jumps between big and small
                h, w = frame.shape[:2]
                ratio = h/w
                small_frame = cv2.resize(frame, (640, int(640*ratio)))
                
                with self.lock:
                    # If we have no AI frame yet, show this one
                    if self.latest_frame is None:
                        self.latest_frame = small_frame
                    # (Optional: You could just yield the old AI frame to show "stuck" boxes 
                    # on new video, but showing raw video is smoother)
            
            # Control FPS to prevent CPU overload
            time.sleep(0.01)
        
        cap.release()
        
    def stream(self):
        while True:
            with self.lock:
                frame = self.latest_frame
            
            if frame is None:
                time.sleep(0.1)
                continue
            
            # Compress to JPG (Lower quality = Faster Stream)
            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            
            time.sleep(self.frame_interval)