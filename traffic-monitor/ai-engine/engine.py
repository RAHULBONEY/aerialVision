# ==========================================
# 🧠 AERIAL VISION - CLOUD GPU ENGINE (v3.0)
# Optimised for NVIDIA T4 (16GB VRAM, 50GB RAM)
# ==========================================
import os
import time
import json
import base64
import threading
import cv2
import torch
import numpy as np
import uvicorn
import asyncio
import redis
import yt_dlp
from collections import defaultdict
from datetime import datetime
from ultralytics import YOLO
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

print("🔵 [SERVER] Booting Aerial Vision Cloud GPU Engine (T4 Optimised)...")

app = FastAPI(title="Aerial Vision GPU Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

CACHE_PATH = os.getenv("MODEL_PATH", "/root/aerial-engine/models")
SIMULATION_DIR = os.getenv("SIMULATION_DIR", "./streams")
os.makedirs(CACHE_PATH, exist_ok=True)
os.makedirs(SIMULATION_DIR, exist_ok=True)

# ==========================================
# T4 TUNED THRESHOLDS
# ==========================================
CONF_THRESHOLD = 0.25
PIXEL_MOVE_THRESHOLD = 15.0
TIME_TO_CONFIRM = 5.0
COOLDOWN_TIME = 60.0

# T4 has 16GB VRAM — we can run bigger models + more streams
GPU_MEMORY_WARN_GB = 14.0   # Warn at 14GB (of 16GB)
MAX_STREAMS = 6             # T4 can comfortably handle 6 concurrent streams
INFERENCE_IMG_SIZE = 1280   # T4 can handle 1280px inference (vs 640 on consumer GPUs)
STREAM_TARGET_WIDTH = 1280  # Higher quality live stream output
STREAM_FPS = 24             # Smooth streaming FPS
JPEG_QUALITY = 85           # Higher JPEG quality for clearer stream
AI_EVERY_N_FRAMES = 1       # T4 is fast enough to run AI on EVERY frame

# Faint bounding box styling
BOX_ALPHA = 0.35            # 35% opacity for subtle overlay
BOX_THICKNESS = 1           # Thin 1px border
LABEL_FONT_SCALE = 0.45     # Small, non-intrusive labels
LABEL_ALPHA = 0.5           # 50% opacity for text background
# Class colours (BGR) — muted palette so boxes don't dominate the frame
CLASS_COLORS = {
    0: (180, 140, 100),   # person — muted blue
    2: (160, 160, 140),   # car — soft grey-green
    3: (140, 160, 180),   # motorcycle — warm grey
    5: (120, 150, 180),   # bus — muted amber
    7: (150, 130, 160),   # truck — soft purple
    4: (100, 220, 100),   # ambulance — green (stands out intentionally)
}
DEFAULT_COLOR = (160, 160, 160)  # Neutral grey for unknown classes

active_model = None
current_model_name = ""
STREAMS = {}

# ==========================================
# 0. UPSTASH REDIS CONNECTION
# ==========================================
REDIS_URL = os.getenv("REDIS_URL", "")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=False)
    redis_client.ping()
    print("🟢 [REDIS] Connected to Upstash Cloud!")
except Exception as e:
    print(f"🔴 [REDIS] Connection failed: {e}")
    redis_client = None

class AnalyzeRequest(BaseModel):
    sessionId: str
    tileIds: List[str]
    model: Optional[str] = "mark-5"


# ==========================================
# 1. MODEL LOADER (GOVERNANCE)
# ==========================================
MODEL_PATHS = {
    "mark-5":   f"{CACHE_PATH}/mark-5.pt",
    "mark4.5":  f"{CACHE_PATH}/mark4.5.pt",
    "mark-4":   f"{CACHE_PATH}/mark4.pt",
    "mark-3":   f"{CACHE_PATH}/mark3.pt",
    "mark-2.5": f"{CACHE_PATH}/mark2.5.pt",
    "mark-2":   f"{CACHE_PATH}/mark2.pt",
    "mark-1":   f"{CACHE_PATH}/mark1.pt",
}

def get_model(model_name="mark-5"):
    global active_model, current_model_name
    if active_model and current_model_name == model_name:
        return active_model

    print(f"\n🔄 [GOVERNANCE] Switching Engine to: {model_name}...")
    load_path = MODEL_PATHS.get(model_name, MODEL_PATHS["mark-5"])

    if not os.path.exists(load_path):
        print(f"   ⚠️ {load_path} not found, falling back to mark-5")
        load_path = MODEL_PATHS["mark-5"]
        if not os.path.exists(load_path):
            print(f"   ❌ Default model also missing!")
            return None

    try:
        model = YOLO(load_path, task='detect')
        # T4 warmup — use 1280 to pre-allocate CUDA memory at full resolution
        print(f"   🔥 [WARMUP] Pre-allocating CUDA memory at {INFERENCE_IMG_SIZE}px...")
        model(np.zeros((INFERENCE_IMG_SIZE, INFERENCE_IMG_SIZE, 3), dtype=np.uint8), verbose=False)
        active_model = model
        current_model_name = model_name
        print(f"   ✅ Engine Loaded: {model_name} (VRAM: {torch.cuda.memory_allocated(0)/1e9:.2f}GB)")
        return model
    except Exception as e:
        print(f"   ❌ Load Error: {e}")
        return None


# ==========================================
# 2. FAINT BOUNDING BOX RENDERER
# ==========================================
def draw_faint_boxes(frame, results):
    """
    Draws semi-transparent bounding boxes with thin borders and subtle labels.
    Uses alpha blending so the video stays clean and cinematic.
    """
    overlay = frame.copy()
    label_overlay = frame.copy()

    if not results[0].boxes or len(results[0].boxes) == 0:
        return frame

    boxes = results[0].boxes.xyxy.cpu().numpy()    # [x1, y1, x2, y2]
    confs = results[0].boxes.conf.cpu().numpy()
    classes = results[0].boxes.cls.int().cpu().numpy()
    names = results[0].names

    for box, conf, cls in zip(boxes, confs, classes):
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        color = CLASS_COLORS.get(int(cls), DEFAULT_COLOR)
        class_name = names.get(int(cls), f"cls_{cls}")

        # --- Faint filled rectangle (subtle highlight) ---
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)

        # --- Thin border ---
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, BOX_THICKNESS)

        # --- Small label with confidence ---
        label = f"{class_name} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, LABEL_FONT_SCALE, 1)
        label_x1, label_y1 = x1, y1 - th - 6
        label_x2, label_y2 = x1 + tw + 6, y1

        # Clamp to frame bounds
        if label_y1 < 0:
            label_y1 = y2
            label_y2 = y2 + th + 6

        # Semi-transparent label background
        cv2.rectangle(label_overlay, (label_x1, label_y1), (label_x2, label_y2), color, -1)
        cv2.putText(
            label_overlay, label, (label_x1 + 3, label_y2 - 3),
            cv2.FONT_HERSHEY_SIMPLEX, LABEL_FONT_SCALE, (255, 255, 255), 1, cv2.LINE_AA
        )

    # Alpha blend: faint fill
    frame = cv2.addWeighted(overlay, BOX_ALPHA, frame, 1 - BOX_ALPHA, 0)
    # Alpha blend: label background
    frame = cv2.addWeighted(label_overlay, LABEL_ALPHA, frame, 1 - LABEL_ALPHA, 0)

    return frame


# ==========================================
# 3. INTELLIGENCE MODULE (THE BRAIN)
# ==========================================
class TrafficBrain:
    def __init__(self, stream_id="cam-001", stream_name="Default Stream"):
        self.AMBULANCE_CLASS_ID = 4
        self.vehicle_history = defaultdict(lambda: [])
        self.vehicle_states = {}
        self.suspicion_start_times = {}
        self.cooldown_list = {}
        self.stream_id = stream_id
        self.stream_name = stream_name

    def _encode_snapshot(self, frame, box):
        try:
            h_img, w_img = frame.shape[:2]
            x, y, w, h = box
            pad = 60
            x1, y1 = max(0, int(x - w / 2) - pad), max(0, int(y - h / 2) - pad)
            x2, y2 = min(w_img, int(x + w / 2) + pad), min(h_img, int(y + h / 2) + pad)
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                return ""
            _, buffer = cv2.imencode('.jpg', crop, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
        except:
            return ""

    def generate_payload(self, track_id, box, frame, vehicle_count):
        snapshot_b64 = self._encode_snapshot(frame, box)
        severity = "HIGH" if vehicle_count > 20 else "MEDIUM"
        return {
            "streamId": self.stream_id,
            "streamName": self.stream_name,
            "type": "OBSTRUCTION",
            "severity": severity,
            "description": f"Stationary vehicle (ID: {track_id}) detected.",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "vehicleCount": vehicle_count,
            "density": round(vehicle_count / 50.0, 2),
            "status": "OPEN",
            "snapshot": {"mime": "image/jpeg", "data": snapshot_b64}
        }

    def analyze(self, results, frame):
        current_time = time.time()
        if results[0].boxes.id is None:
            return 0, "🟢 CLEAR", [], False

        boxes = results[0].boxes.xywh.cpu().numpy()
        ids = results[0].boxes.id.int().cpu().numpy()
        classes = (
            results[0].boxes.cls.int().cpu().numpy()
            if hasattr(results[0].boxes, 'cls') and results[0].boxes.cls is not None
            else [0] * len(ids)
        )

        vehicle_count = len(ids)
        alerts_to_send = []
        green_wave_triggered = False

        status_label = "🟢 CLEAR"
        if vehicle_count > 15:
            status_label = "🔴 CRITICAL JAM"
        elif vehicle_count > 5:
            status_label = "🟡 MODERATE"

        for box, track_id, cls in zip(boxes, ids, classes):
            # --- AMBULANCE ---
            if cls == self.AMBULANCE_CLASS_ID:
                green_wave_triggered = True
                status_label = "🚑 GREEN WAVE ACTIVE"
                alerts_to_send.append({
                    "type": "GREEN_WAVE", "severity": "CRITICAL",
                    "description": f"Ambulance Detected (ID: {track_id}). Clear lane!",
                    "vehicle_id": int(track_id), "timestamp": time.time()
                })
                # Ambulance gets a bright green box (NOT faint — must be visible)
                x, y, w, h = box
                p1 = (int(x - w / 2), int(y - h / 2))
                p2 = (int(x + w / 2), int(y + h / 2))
                cv2.rectangle(frame, p1, p2, (0, 255, 0), 3)
                cv2.putText(frame, "AMBULANCE", (p1[0], p1[1] - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
                continue

            # --- STATIONARY DETECTION ---
            x, y, w, h = box
            track = self.vehicle_history[track_id]
            track.append((float(x), float(y)))
            if len(track) > 90:
                track.pop(0)

            if track_id in self.cooldown_list:
                if current_time - self.cooldown_list[track_id] > COOLDOWN_TIME:
                    del self.cooldown_list[track_id]
                continue

            if len(track) > 30:
                past_x, past_y = track[0]
                dist = np.hypot(x - past_x, y - past_y)
                if dist < PIXEL_MOVE_THRESHOLD:
                    if self.vehicle_states.get(track_id) != 'suspicion':
                        self.vehicle_states[track_id] = 'suspicion'
                        self.suspicion_start_times[track_id] = current_time
                    elif current_time - self.suspicion_start_times[track_id] > TIME_TO_CONFIRM:
                        alert = self.generate_payload(track_id, box, frame, vehicle_count)
                        alerts_to_send.append(alert)
                        self.vehicle_states[track_id] = 'confirmed'
                        self.cooldown_list[track_id] = current_time
                else:
                    if track_id in self.vehicle_states:
                        del self.vehicle_states[track_id]

        return vehicle_count, status_label, alerts_to_send, green_wave_triggered


# ==========================================
# 4. INFERENCE ENGINE (LIVE STREAMS)
# ==========================================
class InferenceEngine:
    """T4-optimised inference: 1280px input, faint box rendering."""

    def __init__(self, model_path):
        print(f"🔧 [INF] Loading model: {model_path}")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cuda":
            torch.cuda.empty_cache()
            print(f"   ✅ GPU: {torch.cuda.get_device_name(0)}")
        else:
            print("   ⚠️ WARNING: Running on CPU")

        self.model = YOLO(model_path)
        self.model.to(self.device)
        self.target_width = STREAM_TARGET_WIDTH

    def run(self, frame):
        try:
            height, width = frame.shape[:2]
            aspect_ratio = height / width
            new_width = self.target_width
            new_height = int(new_width * aspect_ratio)

            resized = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)

            # T4 can handle 1280px inference — sharper detections
            results = self.model(
                resized, conf=0.5, iou=0.45,
                classes=[2, 3, 4, 5, 7],   # car, motorcycle, ambulance, bus, truck
                verbose=False, imgsz=INFERENCE_IMG_SIZE
            )

            # Draw faint bounding boxes instead of ultralytics' thick default
            processed = draw_faint_boxes(resized, results)
            return processed

        except Exception as e:
            print(f"   ❌ Inference error: {e}")
            return frame


# ==========================================
# 5. STREAM READER (T4 OPTIMISED)
# ==========================================
class StreamReader:
    def __init__(self, source_url, engine, fps_limit=STREAM_FPS, ai_interval=AI_EVERY_N_FRAMES):
        self.source_url = source_url
        self.engine = engine
        self.frame_interval = 1.0 / fps_limit
        self.skip_counter = 0
        self.ai_interval = ai_interval
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
            self.thread.join(timeout=5)

    def _get_youtube_stream_url(self, url):
        try:
            # Request 1080p for best quality on T4
            ydl_opts = {
                'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
                'quiet': True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return info['url']
        except:
            return url

    def _read_loop(self):
        real_url = self.source_url
        if "youtube.com" in self.source_url or "youtu.be" in self.source_url:
            print(f"🔍 Resolving YouTube (1080p): {self.source_url}")
            real_url = self._get_youtube_stream_url(self.source_url)

        cap = cv2.VideoCapture(real_url)
        # Set capture to highest available resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

        while self.running:
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Stream dropped, reconnecting...")
                time.sleep(1)
                cap.release()
                cap = cv2.VideoCapture(real_url)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
                continue

            self.skip_counter += 1

            # T4 power: run AI on every single frame (ai_interval=1)
            if self.skip_counter % self.ai_interval == 0:
                processed = self.engine.run(frame)
                with self.lock:
                    self.latest_frame = processed
            else:
                h, w = frame.shape[:2]
                ratio = h / w
                tw = STREAM_TARGET_WIDTH
                small_frame = cv2.resize(frame, (tw, int(tw * ratio)))
                with self.lock:
                    if self.latest_frame is None:
                        self.latest_frame = small_frame

            time.sleep(0.005)  # Minimal sleep — T4 can keep up

        cap.release()

    def stream(self):
        while self.running:
            with self.lock:
                frame = self.latest_frame

            if frame is None:
                time.sleep(0.05)
                continue

            # High quality JPEG for T4 bandwidth
            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])

            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n'
            )
            time.sleep(self.frame_interval)


# ==========================================
# 6. GPU SAFETY (T4 - 16GB VRAM)
# ==========================================
def check_gpu_memory():
    if not torch.cuda.is_available():
        return False
    try:
        allocated = torch.cuda.memory_allocated(0) / 1e9
        return allocated > GPU_MEMORY_WARN_GB
    except:
        return False

def get_gpu_stats():
    if not torch.cuda.is_available():
        return {"device": "cpu"}
    return {
        "device": torch.cuda.get_device_name(0),
        "vram_allocated_gb": round(torch.cuda.memory_allocated(0) / 1e9, 2),
        "vram_reserved_gb": round(torch.cuda.memory_reserved(0) / 1e9, 2),
        "vram_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 2),
    }


# ==========================================
# 7. ENDPOINTS — PROBE (GOVERNANCE)
# ==========================================
@app.post("/probe")
async def probe_stream(payload: dict):
    source_url = payload.get("sourceUrl", "")
    print(f"🕵️ Probe request for: {source_url}")

    view_type = "AERIAL"
    recommended_model = "mark-3"
    is_locked = True

    if source_url:
        lower = source_url.lower()
        if "ground" in lower or "rtsp" in lower or "webcam" in lower:
            view_type = "GROUND"
            recommended_model = "mark-5"
            is_locked = False

    return {
        "viewType": view_type,
        "recommended_model": recommended_model,
        "reason": f"Governance Protocol Enforced. View: {view_type}.",
        "is_locked": is_locked
    }


# ==========================================
# 8. ENDPOINTS — LIVE STREAMS
# ==========================================
@app.post("/streams/start")
async def start_stream_endpoint(payload: dict):
    stream_id = payload.get("id")
    source_url = payload.get("sourceUrl")
    model_name = payload.get("model", "mark-5")

    if not stream_id or not source_url:
        raise HTTPException(status_code=400, detail="id and sourceUrl required")
    if stream_id in STREAMS:
        raise HTTPException(status_code=409, detail="Stream already running")
    if sum(1 for s in STREAMS.values() if s["status"] == "RUNNING") >= MAX_STREAMS:
        raise HTTPException(status_code=503, detail=f"Max {MAX_STREAMS} streams reached")
    if check_gpu_memory():
        raise HTTPException(status_code=503, detail="GPU memory critically high")

    model_path = MODEL_PATHS.get(model_name, MODEL_PATHS["mark-5"])
    if not os.path.exists(model_path):
        model_path = MODEL_PATHS["mark-5"]
    if not os.path.exists(model_path):
        raise HTTPException(status_code=500, detail="No model weights available")

    try:
        engine = InferenceEngine(model_path)
        reader = StreamReader(source_url, engine)
        reader.start()
        STREAMS[stream_id] = {
            "reader": reader, "engine": engine, "status": "RUNNING",
            "model": model_name, "source": source_url, "started_at": time.time()
        }
        print(f"✅ Stream {stream_id} started ({model_name}, {STREAM_TARGET_WIDTH}px, {STREAM_FPS}fps)")
        return {
            "streamId": stream_id,
            "aiEngineUrl": f"/streams/{stream_id}",
            "status": "RUNNING",
            "model": model_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/streams/{stream_id}")
async def get_stream(stream_id: str):
    stream = STREAMS.get(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream["status"] != "RUNNING":
        raise HTTPException(status_code=410, detail="Stream not active")
    return StreamingResponse(
        stream["reader"].stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "Pragma": "no-cache", "X-Accel-Buffering": "no"}
    )


@app.post("/streams/{stream_id}/stop")
async def stop_stream_endpoint(stream_id: str):
    stream = STREAMS.get(stream_id)
    if not stream:
        return {"success": False, "message": "Not found"}
    try:
        stream["reader"].stop()
        del STREAMS[stream_id]
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        print(f"🛑 Stream {stream_id} stopped")
        return {"success": True, "streamId": stream_id}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ==========================================
# 9. ENDPOINTS — VIDEO TELEMETRY (NDJSON)
# ==========================================
async def generate_telemetry(video_path, model_req):
    model = get_model(model_req)
    if not model:
        yield json.dumps({"error": "Model not found"}) + "\n"
        return

    session_brain = TrafficBrain()
    cap = cv2.VideoCapture(video_path)
    frame_id = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        try:
            results = model.track(
                frame, persist=True, verbose=False,
                tracker="bytetrack.yaml", conf=CONF_THRESHOLD,
                imgsz=INFERENCE_IMG_SIZE  # T4: full 1280px tracking
            )
            count, status, alerts, green_wave = session_brain.analyze(results, frame)

            # Build faint box data for frontend (optional overlay rendering)
            box_data = []
            if results[0].boxes and results[0].boxes.xyxy is not None:
                xyxy = results[0].boxes.xyxy.cpu().numpy()
                confs = results[0].boxes.conf.cpu().numpy()
                clss = results[0].boxes.cls.int().cpu().numpy()
                names = results[0].names
                for b, c, cl in zip(xyxy, confs, clss):
                    box_data.append({
                        "x1": round(float(b[0]), 1), "y1": round(float(b[1]), 1),
                        "x2": round(float(b[2]), 1), "y2": round(float(b[3]), 1),
                        "class": names.get(int(cl), f"cls_{cl}"),
                        "conf": round(float(c), 2)
                    })

            yield json.dumps({
                "frame": frame_id,
                "stats": {
                    "count": count,
                    "status": status,
                    "green_wave": green_wave,
                    "density": round(count / 50.0, 2),
                    "avg_speed": 0
                },
                "boxes": box_data,
                "incidents": alerts
            }) + "\n"

            frame_id += 1
            await asyncio.sleep(0.005)  # T4 is fast — minimal delay
        except Exception as e:
            print(f"   ⚠️ Frame {frame_id} error: {e}")
            continue

    cap.release()
    if video_path.startswith("/tmp/"):
        try:
            os.remove(video_path)
        except:
            pass


@app.post("/upload_and_process")
async def upload_endpoint(file: UploadFile = File(...), model: str = Form("mark-5")):
    temp_name = f"/tmp/telemetry_{int(time.time())}_{file.filename}"
    with open(temp_name, "wb") as f:
        f.write(await file.read())
    print(f"📥 Uploaded {file.filename} → {temp_name}")
    return {"stream_url": f"/telemetry?video_id={temp_name}&model_req={model}"}


@app.get("/telemetry")
async def telemetry_endpoint(video_id: str, model_req: str):
    if not os.path.exists(video_id):
        raise HTTPException(status_code=404, detail="Video file not found")
    return StreamingResponse(
        generate_telemetry(video_id, model_req),
        media_type="application/x-ndjson"
    )


# ==========================================
# 10. ENDPOINTS — SATELLITE TILE ANALYSIS
# ==========================================
@app.post("/analyze")
async def analyze_static_tiles(req: AnalyzeRequest):
    if not redis_client:
        return JSONResponse(status_code=503, content={"success": False, "error": "Redis not connected"})

    model = get_model(req.model)
    if not model:
        return JSONResponse(status_code=500, content={"success": False, "error": "Model failed to load"})

    results = []
    total_vehicles = 0
    print(f"\n📡 [ANALYZE] {len(req.tileIds)} tiles for session: {req.sessionId}")

    for tile_id in req.tileIds:
        try:
            image_bytes = redis_client.get(f"tile:{tile_id}")
            if not image_bytes:
                results.append({"tileId": tile_id, "status": "missing_in_cache", "vehicleCount": 0})
                continue

            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                results.append({"tileId": tile_id, "status": "decode_error", "vehicleCount": 0})
                continue

            # T4: run at 1280px for satellite tiles too
            preds = model.predict(img, conf=CONF_THRESHOLD, verbose=False, imgsz=INFERENCE_IMG_SIZE)

            v_count = len(preds[0].boxes) if preds[0].boxes else 0
            total_vehicles += v_count

            detections = []
            if preds[0].boxes:
                for box in preds[0].boxes:
                    x, y, w, h = box.xywh[0].cpu().numpy()
                    cls = int(box.cls[0].cpu().numpy())
                    conf = float(box.conf[0].cpu().numpy())
                    class_name = preds[0].names.get(cls, f"class_{cls}")
                    detections.append({
                        "class": class_name, "class_id": cls,
                        "confidence": round(conf, 3),
                        "bbox": {"x": float(x), "y": float(y), "w": float(w), "h": float(h)}
                    })

            results.append({
                "tileId": tile_id, "status": "processed",
                "vehicleCount": v_count, "detections": detections
            })
        except Exception as e:
            results.append({"tileId": tile_id, "status": "error", "message": str(e), "vehicleCount": 0})

    print(f"✅ [ANALYZE] Session {req.sessionId} done. {total_vehicles} vehicles found.")
    return {
        "success": True, "sessionId": req.sessionId,
        "totalVehicles": total_vehicles, "tilesProcessed": len(results), "data": results
    }


# ==========================================
# 11. SIMULATION UTILS
# ==========================================
@app.get("/simulations/list")
def list_simulations():
    files = [f for f in os.listdir(SIMULATION_DIR) if f.endswith(".mp4")]
    return {
        "success": True,
        "scenarios": [{"id": f.replace(".mp4", ""), "name": f} for f in sorted(files)]
    }


@app.post("/process-local-simulation")
async def process_local_simulation(payload: dict):
    """
    Process a simulation video that exists on this GPU server's disk.
    Called by the Gateway when it doesn't have the file locally (e.g. Render).
    Returns a stream_url just like /upload_and_process does.
    """
    simulation_id = payload.get("simulation_id", "")
    model = payload.get("model", "mark-5")

    filename = f"{simulation_id}.mp4"
    file_path = os.path.join(SIMULATION_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Simulation '{filename}' not found on GPU server")

    print(f"🎬 Processing local simulation: {file_path} (model: {model})")
    return {"stream_url": f"/telemetry?video_id={file_path}&model_req={model}"}


# ==========================================
# 12. HEALTH & DIAGNOSTICS
# ==========================================
@app.get("/")
def health_check():
    return {
        "status": "online",
        "engine": "Aerial Vision GPU Engine v3.0 (T4)",
        "model_loaded": current_model_name or "none",
        "gpu": get_gpu_stats(),
        "active_streams": len(STREAMS),
        "max_streams": MAX_STREAMS,
        "inference_resolution": INFERENCE_IMG_SIZE,
        "stream_resolution": STREAM_TARGET_WIDTH,
        "stream_fps": STREAM_FPS,
        "jpeg_quality": JPEG_QUALITY,
        "redis": "connected" if redis_client else "disconnected"
    }


@app.get("/streams/status")
def streams_status():
    return {
        "active": len(STREAMS),
        "max": MAX_STREAMS,
        "streams": {
            sid: {
                "status": s["status"], "model": s["model"],
                "source": s["source"],
                "uptime_s": round(time.time() - s["started_at"], 1)
            }
            for sid, s in STREAMS.items()
        }
    }


# ==========================================
# BOOT
# ==========================================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🟢 GPU Engine on port {port}")
    print(f"📂 Models: {os.path.abspath(CACHE_PATH)}")
    print(f"📂 Simulations: {os.path.abspath(SIMULATION_DIR)}")
    print(f"🎮 GPU: {'cuda — ' + torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu'}")
    print(f"🖼️ Inference: {INFERENCE_IMG_SIZE}px | Stream: {STREAM_TARGET_WIDTH}px @ {STREAM_FPS}fps | JPEG: {JPEG_QUALITY}%")
    uvicorn.run(app, host="0.0.0.0", port=port)
