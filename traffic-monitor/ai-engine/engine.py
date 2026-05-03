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
from collections import defaultdict
from datetime import datetime
from ultralytics import YOLO
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

print("[SERVER] Booting AerialVision GPU Engine v4.0")

app = FastAPI(title="Aerial Vision GPU Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

CACHE_PATH = os.getenv("MODEL_PATH", "/root/aerial-engine/models")
SIMULATION_DIR = os.getenv("SIMULATION_DIR", "./streams")
BYTETRACK_CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bytetrack.yaml")
os.makedirs(CACHE_PATH, exist_ok=True)
os.makedirs(SIMULATION_DIR, exist_ok=True)

CONF_THRESHOLD = 0.25
PIXEL_MOVE_THRESHOLD = 15.0
TIME_TO_CONFIRM = 5.0
COOLDOWN_TIME = 60.0
SUDDEN_BRAKE_THRESHOLD = 0.5
SPEED_DROP_WINDOW = 10
WRONG_WAY_ANGLE_THRESHOLD = 2.5
CLUSTER_DISTANCE_PX = 50
CLUSTER_MIN_VEHICLES = 3
DENSITY_WINDOW_SECONDS = 60
PPM = 8.0
TRACK_QUALITY_MIN = 0.3
VEHICLE_CLEARANCE_WEIGHTS = {2: 1, 3: 3, 4: 5, 5: 2, 7: 1}
CLEARANCE_LEVELS = [
    (0, 5, "CLEAR"),
    (6, 15, "MODERATE"),
    (16, 30, "DIFFICULT"),
    (31, 999, "IMPASSABLE"),
]
ANALYSIS_CACHE_TTL = 3600
HEATMAP_LAT_THRESHOLD = 0.0005
AI_EVERY_N_FRAMES = 1
GPU_MEMORY_WARN_GB = 14.0
MAX_STREAMS = 6
INFERENCE_IMG_SIZE = 1280
TELEMETRY_IMG_SIZE = 640
TELEMETRY_PROCESS_EVERY_N = 1
STREAM_TARGET_WIDTH = 1280
STREAM_FPS = 30
JPEG_QUALITY = 85
ANNOTATED_JPEG_QUALITY = 40

BOX_ALPHA = 0.35
BOX_THICKNESS = 1
LABEL_FONT_SCALE = 0.45
LABEL_ALPHA = 0.5
CLASS_COLORS = {
    0: (180, 140, 100),
    2: (160, 160, 140),
    3: (140, 160, 180),
    5: (120, 150, 180),
    7: (150, 130, 160),
    4: (100, 220, 100),
}
DEFAULT_COLOR = (160, 160, 160)

active_model = None
current_model_name = ""
simulation_models = {}
STREAMS = {}
telemetry_cancel_flags = {}

REDIS_URL = os.getenv("REDIS_URL", "")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=False)
    redis_client.ping()
    print("[REDIS] Connected to Upstash Cloud")
except Exception as e:
    print(f"[REDIS] Connection failed: {e}")
    redis_client = None


class AnalyzeRequest(BaseModel):
    sessionId: str
    tileIds: List[str]
    model: Optional[str] = "mark-5"


MODEL_PATHS = {
    "mark-5":   f"{CACHE_PATH}/mark4.5.pt",
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

    print(f"[GOVERNANCE] Switching engine to: {model_name}")
    load_path = MODEL_PATHS.get(model_name, MODEL_PATHS["mark-5"])

    if not os.path.exists(load_path):
        print(f"[GOVERNANCE] Model {load_path} not found, falling back to mark-5")
        load_path = MODEL_PATHS["mark-5"]
        if not os.path.exists(load_path):
            print("[GOVERNANCE] Default model also missing")
            return None

    try:
        model = YOLO(load_path, task='detect')
        model(np.zeros((INFERENCE_IMG_SIZE, INFERENCE_IMG_SIZE, 3), dtype=np.uint8), verbose=False)
        active_model = model
        current_model_name = model_name
        print(f"[INFERENCE] Model loaded: {model_name} | VRAM: {torch.cuda.memory_allocated(0)/1e9:.2f}GB")
        return model
    except Exception as e:
        print(f"[INFERENCE] Load error: {e}")
        return None


def get_model_instance(model_name="mark-5"):
    load_path = MODEL_PATHS.get(model_name, MODEL_PATHS["mark-5"])
    print(f"[ANALYZE-DEBUG] Looking for model: {model_name} at {load_path} | exists={os.path.exists(load_path)}")
    if not os.path.exists(load_path):
        load_path = MODEL_PATHS["mark-5"]
        if not os.path.exists(load_path):
            return None
    try:
        model = YOLO(load_path, task='detect')
        model(np.zeros((INFERENCE_IMG_SIZE, INFERENCE_IMG_SIZE, 3), dtype=np.uint8), verbose=False)
        print(f"[INFERENCE] Isolated model loaded: {model_name} | VRAM: {torch.cuda.memory_allocated(0)/1e9:.2f}GB")
        return model
    except Exception as e:
        print(f"[INFERENCE] Isolated model load error: {e}")
        return None


def draw_faint_boxes(frame, results):
    overlay = frame.copy()
    label_overlay = frame.copy()

    if not results[0].boxes or len(results[0].boxes) == 0:
        return frame

    boxes = results[0].boxes.xyxy.cpu().numpy()
    confs = results[0].boxes.conf.cpu().numpy()
    classes = results[0].boxes.cls.int().cpu().numpy()
    names = results[0].names

    for box, conf, cls in zip(boxes, confs, classes):
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        color = CLASS_COLORS.get(int(cls), DEFAULT_COLOR)
        class_name = names.get(int(cls), f"cls_{cls}")

        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, BOX_THICKNESS)

        label = f"{class_name} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, LABEL_FONT_SCALE, 1)
        label_x1, label_y1 = x1, y1 - th - 6
        label_x2, label_y2 = x1 + tw + 6, y1

        if label_y1 < 0:
            label_y1 = y2
            label_y2 = y2 + th + 6

        cv2.rectangle(label_overlay, (label_x1, label_y1), (label_x2, label_y2), color, -1)
        cv2.putText(
            label_overlay, label, (label_x1 + 3, label_y2 - 3),
            cv2.FONT_HERSHEY_SIMPLEX, LABEL_FONT_SCALE, (255, 255, 255), 1, cv2.LINE_AA
        )

    frame = cv2.addWeighted(overlay, BOX_ALPHA, frame, 1 - BOX_ALPHA, 0)
    frame = cv2.addWeighted(label_overlay, LABEL_ALPHA, frame, 1 - LABEL_ALPHA, 0)

    return frame


class TrafficBrain:
    def __init__(self, stream_id="cam-001", stream_name="Default Stream", fps=STREAM_FPS):
        self.AMBULANCE_CLASS_ID = 4
        self.stream_id = stream_id
        self.stream_name = stream_name
        self.fps = fps
        self.PPM = PPM

        self.vehicle_history = defaultdict(lambda: [])
        self.vehicle_states = {}
        self.suspicion_start_times = {}
        self.cooldown_list = {}
        self.density_history = []
        self.direction_history = defaultdict(lambda: [])
        self.braking_alerts = {}
        self.wrong_way_cooldown = 0
        self.cluster_cooldown = 0

    def _estimate_speed(self, track):
        if len(track) < 6:
            return 0.0
        recent = track[-6:]
        dx = recent[-1][0] - recent[0][0]
        dy = recent[-1][1] - recent[0][1]
        pixel_dist = np.hypot(dx, dy)
        meters = pixel_dist / self.PPM
        time_seconds = len(recent) / self.fps
        if time_seconds == 0:
            return 0.0
        speed_ms = meters / time_seconds
        speed_kmh = speed_ms * 3.6
        return round(min(speed_kmh, 200.0), 1)

    def _compute_traffic_status(self, vehicle_count):
        now = time.time()
        self.density_history.append((now, vehicle_count))
        self.density_history = [(t, c) for t, c in self.density_history
                                 if now - t < DENSITY_WINDOW_SECONDS]

        if len(self.density_history) < 10:
            if vehicle_count > 15:
                return "CRITICAL_JAM"
            elif vehicle_count > 5:
                return "MODERATE"
            return "CLEAR"

        counts = [c for _, c in self.density_history]
        trend = counts[-1] - counts[max(0, len(counts) - 10)]
        trend_per_sec = trend / 10.0
        avg_count = np.mean(counts)

        if vehicle_count > 20 and abs(trend_per_sec) < 0.5:
            return "GRIDLOCK"
        elif vehicle_count > 15:
            return "CRITICAL_JAM"
        elif vehicle_count > 5 and trend_per_sec > 0.5:
            return "BUILDING_UP"
        elif vehicle_count > 5:
            return "MODERATE"
        elif len(counts) > 20 and counts[-1] < counts[-20] and avg_count > 8:
            return "DISSIPATING"
        else:
            return "CLEAR"

    def _detect_sudden_braking(self, track_id):
        track = self.vehicle_history[track_id]
        if len(track) < SPEED_DROP_WINDOW:
            return False

        recent = track[-SPEED_DROP_WINDOW:]
        speeds = []
        for i in range(1, len(recent)):
            dx = recent[i][0] - recent[i - 1][0]
            dy = recent[i][1] - recent[i - 1][1]
            speeds.append(np.hypot(dx, dy))

        if len(speeds) < 4:
            return False

        first_half = np.mean(speeds[:len(speeds) // 2])
        second_half = np.mean(speeds[len(speeds) // 2:])

        if first_half < 5:
            return False

        speed_drop = (first_half - second_half) / first_half
        if speed_drop > SUDDEN_BRAKE_THRESHOLD and second_half < first_half * 0.5:
            return True
        return False

    def _compute_direction(self, track_id):
        track = self.vehicle_history[track_id]
        if len(track) < 10:
            return None
        dx = track[-1][0] - track[-10][0]
        dy = track[-1][1] - track[-10][1]
        magnitude = np.hypot(dx, dy)
        if magnitude < 1.0:
            return None
        return np.arctan2(dy, dx)

    def _detect_wrong_way(self, directions):
        valid = {k: v for k, v in directions.items() if v is not None}
        if len(valid) < 3:
            return []
        angles = list(valid.values())
        median_angle = np.median(angles)
        wrong_way_ids = []
        for track_id, angle in valid.items():
            delta = abs(angle - median_angle)
            if delta > np.pi:
                delta = 2 * np.pi - delta
            if delta > (np.pi / WRONG_WAY_ANGLE_THRESHOLD):
                wrong_way_ids.append(track_id)
        return wrong_way_ids

    def _detect_clusters(self, boxes, ids, classes):
        if len(boxes) < CLUSTER_MIN_VEHICLES:
            return []

        centers = [(float(b[0]), float(b[1])) for b in boxes]
        visited = set()
        clusters = []

        for i in range(len(centers)):
            if i in visited:
                continue
            cluster = [i]
            visited.add(i)
            for j in range(len(centers)):
                if j in visited:
                    continue
                dist = np.hypot(centers[i][0] - centers[j][0],
                                centers[i][1] - centers[j][1])
                if dist < CLUSTER_DISTANCE_PX:
                    cluster.append(j)
                    visited.add(j)
            if len(cluster) >= CLUSTER_MIN_VEHICLES:
                clusters.append(cluster)

        cluster_alerts = []
        current_time = time.time()
        if current_time - self.cluster_cooldown < COOLDOWN_TIME:
            return []

        for cluster_indices in clusters:
            all_stationary = all(
                self.vehicle_states.get(int(ids[i])) in ('suspicion', 'confirmed')
                for i in cluster_indices
                if int(ids[i]) in self.vehicle_states
            )
            if all_stationary:
                cluster_ids = [int(ids[i]) for i in cluster_indices]
                cluster_alerts.append({
                    "type": "MULTI_VEHICLE_BLOCKAGE",
                    "severity": "CRITICAL",
                    "description": f"Cluster of {len(cluster_indices)} stationary vehicles detected",
                    "vehicle_ids": cluster_ids,
                    "timestamp": current_time
                })
                self.cluster_cooldown = current_time
                break

        return cluster_alerts

    def _track_quality_score(self, track_id, conf):
        track = self.vehicle_history[track_id]
        temporal_consistency = min(len(track) / 30.0, 1.0)
        speed = self._estimate_speed(track)
        speed_plausible = 1.0 if speed < 200 else 0.0
        quality = (conf * 0.4) + (temporal_consistency * 0.3) + (speed_plausible * 0.3)
        return round(quality, 3)

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
            return 0, "CLEAR", [], False, 0.0, {}, {}

        boxes = results[0].boxes.xywh.cpu().numpy()
        ids = results[0].boxes.id.int().cpu().numpy()
        classes = (
            results[0].boxes.cls.int().cpu().numpy()
            if hasattr(results[0].boxes, 'cls') and results[0].boxes.cls is not None
            else np.array([0] * len(ids))
        )
        confs = (
            results[0].boxes.conf.cpu().numpy()
            if hasattr(results[0].boxes, 'conf') and results[0].boxes.conf is not None
            else np.ones(len(ids))
        )

        vehicle_count = len(ids)
        alerts_to_send = []
        green_wave_triggered = False
        speeds = {}
        directions = {}
        quality_scores = {}

        status_label = self._compute_traffic_status(vehicle_count)

        for idx, (box, track_id, cls, conf) in enumerate(zip(boxes, ids, classes, confs)):
            quality = self._track_quality_score(int(track_id), float(conf))
            quality_scores[int(track_id)] = quality

            if quality < TRACK_QUALITY_MIN:
                continue

            speed = self._estimate_speed(list(self.vehicle_history[int(track_id)]))
            speeds[int(track_id)] = speed

            if cls == self.AMBULANCE_CLASS_ID:
                green_wave_triggered = True
                status_label = "GREEN WAVE ACTIVE"
                alerts_to_send.append({
                    "type": "GREEN_WAVE", "severity": "CRITICAL",
                    "description": f"Ambulance Detected (ID: {track_id}). Clear lane!",
                    "vehicle_id": int(track_id), "timestamp": time.time()
                })
                x, y, w, h = box
                p1 = (int(x - w / 2), int(y - h / 2))
                p2 = (int(x + w / 2), int(y + h / 2))
                cv2.rectangle(frame, p1, p2, (0, 255, 0), 3)
                cv2.putText(frame, "AMBULANCE", (p1[0], p1[1] - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
                continue

            direction = self._compute_direction(int(track_id))
            if direction is not None:
                directions[int(track_id)] = direction

            x, y, w, h = box
            track = self.vehicle_history[int(track_id)]
            track.append((float(x), float(y)))
            if len(track) > 90:
                track.pop(0)

            if track_id in self.cooldown_list:
                if current_time - self.cooldown_list[track_id] > COOLDOWN_TIME:
                    del self.cooldown_list[track_id]
                continue

            braking_key = f"brake_{track_id}"
            if self._detect_sudden_braking(int(track_id)):
                if current_time - self.braking_alerts.get(braking_key, 0) > 30:
                    self.braking_alerts[braking_key] = current_time
                    alerts_to_send.append({
                        "type": "SUDDEN_BRAKING",
                        "severity": "HIGH",
                        "description": f"Sudden braking detected (ID: {track_id}). Speed: {speed} km/h",
                        "vehicle_id": int(track_id),
                        "timestamp": current_time
                    })

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

        wrong_way_ids = []
        if current_time - self.wrong_way_cooldown > 30:
            wrong_way_ids = self._detect_wrong_way(directions)
            for wid in wrong_way_ids:
                alerts_to_send.append({
                    "type": "WRONG_WAY",
                    "severity": "CRITICAL",
                    "description": f"Wrong-way vehicle detected (ID: {wid}). Moving against traffic flow.",
                    "vehicle_id": wid,
                    "timestamp": current_time
                })
            if wrong_way_ids:
                self.wrong_way_cooldown = current_time

        cluster_alerts = self._detect_clusters(boxes, ids, classes)
        alerts_to_send.extend(cluster_alerts)

        avg_speed = round(sum(speeds.values()) / len(speeds), 1) if speeds else 0.0

        return vehicle_count, status_label, alerts_to_send, green_wave_triggered, avg_speed, speeds, quality_scores


class InferenceEngine:
    def __init__(self, model_path):
        print(f"[INFERENCE] Loading model: {model_path}")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cuda":
            torch.cuda.empty_cache()
            print(f"[INFERENCE] GPU: {torch.cuda.get_device_name(0)}")
        else:
            print("[INFERENCE] WARNING: Running on CPU")

        self.model = YOLO(model_path)
        self.model.to(self.device)
        self.target_width = STREAM_TARGET_WIDTH
        self.last_inference_ms = 0.0

    def run(self, frame):
        try:
            height, width = frame.shape[:2]
            aspect_ratio = height / width
            new_width = self.target_width
            new_height = int(new_width * aspect_ratio)

            resized = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)

            start_time = time.time()
            results = self.model(
                resized, conf=0.5, iou=0.45,
                classes=[2, 3, 4, 5, 7],
                verbose=False, imgsz=INFERENCE_IMG_SIZE
            )
            self.last_inference_ms = round((time.time() - start_time) * 1000, 1)

            processed = draw_faint_boxes(resized, results)
            return processed, self.last_inference_ms

        except Exception as e:
            print(f"[INFERENCE] Error: {e}")
            return frame, 0.0


class StreamReader:
    def __init__(self, source_url, engine, brain, fps_limit=STREAM_FPS, ai_interval=AI_EVERY_N_FRAMES, stream_id="unknown"):
        self.source_url = source_url
        self.engine = engine
        self.brain = brain
        self.frame_interval = 1.0 / fps_limit
        self.ai_interval = ai_interval
        self.skip_counter = 0
        self.latest_frame = None
        self.lock = threading.Lock()
        self.running = False
        self.thread = None
        self.stream_id = stream_id
        self.reconnect_delay = 1
        self.max_reconnect_delay = 30
        self.frames_processed = 0
        self.frames_dropped = 0
        self.last_inference_ms = 0.0
        self.reconnect_count = 0
        self.last_frame_time = time.time()

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._read_loop)
        self.thread.daemon = True
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)

    def _get_stream_url(self, url):
        if "youtube.com" not in url and "youtu.be" not in url:
            return url
        try:
            import yt_dlp
            ydl_opts = {'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]', 'quiet': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return info['url']
        except:
            return url

    def _read_loop(self):
        real_url = self._get_stream_url(self.source_url)
        if real_url != self.source_url:
            print(f"[STREAM] {self.stream_id} Resolved URL for: {self.source_url}")

        cap = cv2.VideoCapture(real_url)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

        while self.running:
            ret, frame = cap.read()
            if not ret:
                print(f"[STREAM] {self.stream_id} Dropped, reconnecting in {self.reconnect_delay}s...")
                time.sleep(self.reconnect_delay)
                self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
                self.reconnect_count += 1
                cap.release()
                cap = cv2.VideoCapture(real_url)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
                continue

            self.reconnect_delay = 1
            self.skip_counter += 1

            if self.skip_counter % self.ai_interval == 0:
                processed, inference_ms = self.engine.run(frame)
                self.last_inference_ms = inference_ms
                self.frames_processed += 1
                self.last_frame_time = time.time()
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

            time.sleep(0.005)

        cap.release()

    def get_health(self):
        return {
            "frames_processed": self.frames_processed,
            "frames_dropped": self.frames_dropped,
            "inference_ms": self.last_inference_ms,
            "reconnect_count": self.reconnect_count,
            "last_frame_time": self.last_frame_time,
        }

    def stream(self):
        while self.running:
            with self.lock:
                frame = self.latest_frame

            if frame is None:
                time.sleep(0.05)
                continue

            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])

            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n'
            )
            time.sleep(self.frame_interval)


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


@app.post("/probe")
async def probe_stream(payload: dict):
    source_url = payload.get("sourceUrl", "")
    print(f"[PROBE] Analyzing source: {source_url}")

    view_type = "AERIAL"
    recommended_model = "mark-3"
    is_locked = True

    if source_url:
        try:
            real_url = source_url
            if "youtube.com" in source_url or "youtu.be" in source_url:
                try:
                    import yt_dlp
                    ydl_opts = {'format': 'best[ext=mp4]', 'quiet': True}
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(source_url, download=False)
                        real_url = info['url']
                except:
                    pass

            cap = cv2.VideoCapture(real_url)
            ret = False
            frame = None
            areas = []

            model = get_model("mark-5")
            if model:
                for attempt in range(3):
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        results = model(frame, imgsz=640, verbose=False, conf=0.25)
                        if results[0].boxes and len(results[0].boxes) > 0:
                            boxes_wh = results[0].boxes.xywhn.cpu().numpy()
                            areas = boxes_wh[:, 2] * boxes_wh[:, 3]
                        break
                    time.sleep(0.5)

            cap.release()

            if areas and len(areas) > 0:
                avg_area = float(np.mean(areas))
                print(f"[PROBE] Avg object area: {avg_area:.5f} | Detections: {len(areas)}")
                if avg_area < 0.008:
                    view_type = "AERIAL"
                    recommended_model = "mark-3"
                    is_locked = True
                else:
                    view_type = "GROUND"
                    recommended_model = "mark-4.5"
                    is_locked = False
            else:
                lower = source_url.lower()
                if "ground" in lower or "rtsp" in lower or "webcam" in lower:
                    view_type = "GROUND"
                    recommended_model = "mark-4.5"
                    is_locked = False

        except Exception as e:
            print(f"[PROBE] Error during analysis: {e}")
            lower = source_url.lower()
            if "ground" in lower or "rtsp" in lower or "webcam" in lower:
                view_type = "GROUND"
                recommended_model = "mark-4.5"
                is_locked = False

    print(f"[PROBE] Result: viewType={view_type} | model={recommended_model} | locked={is_locked}")
    return {
        "viewType": view_type,
        "recommended_model": recommended_model,
        "reason": f"Governance Protocol Enforced. View: {view_type}. Avg area: {np.mean(areas) if len(areas) > 0 else 'N/A'}",
        "is_locked": is_locked
    }


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
        brain = TrafficBrain(stream_id=stream_id, fps=STREAM_FPS)
        reader = StreamReader(source_url, engine, brain, stream_id=stream_id)
        reader.start()
        STREAMS[stream_id] = {
            "reader": reader, "engine": engine, "brain": brain,
            "status": "RUNNING", "model": model_name, "source": source_url,
            "started_at": time.time()
        }
        print(f"[STREAM] {stream_id} started | Model: {model_name} | ByteTrack enabled | {STREAM_TARGET_WIDTH}px @ {STREAM_FPS}fps")
        return {
            "streamId": stream_id,
            "aiEngineUrl": f"/streams/{stream_id}",
            "status": "RUNNING",
            "model": model_name
        }
    except Exception as e:
        print(f"[STREAM] {stream_id} start error: {e}")
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
        print(f"[STREAM] {stream_id} stopped")
        return {"success": True, "streamId": stream_id}
    except Exception as e:
        return {"success": False, "message": str(e)}


def get_zone_color(count):
    if count <= 3:
        return (0, 255, 0)      # Green - Clear
    elif count <= 8:
        return (0, 255, 255)    # Yellow - Moderate
    elif count <= 15:
        return (0, 140, 255)    # Orange - Heavy
    else:
        return (0, 0, 255)      # Red - Gridlock

def draw_gridlock_zones(frame, boxes):
    h, w = frame.shape[:2]
    cols, rows = 4, 3
    cell_w, cell_h = w // cols, h // rows
    
    # Count vehicles per cell by center point
    grid = [[0] * cols for _ in range(rows)]
    for box in boxes:
        cx = (box["x1"] + box["x2"]) / 2
        cy = (box["y1"] + box["y2"]) / 2
        col = min(int(cx // cell_w), cols - 1)
        row = min(int(cy // cell_h), rows - 1)
        grid[row][col] += 1
    
    # Draw semi-transparent colored overlays
    overlay = frame.copy()
    for row in range(rows):
        for col in range(cols):
            count = grid[row][col]
            color = get_zone_color(count)
            x1, y1 = col * cell_w, row * cell_h
            x2, y2 = (col + 1) * cell_w, (row + 1) * cell_h
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
    
    # Blend: 30% zone color + 70% original frame
    blended = cv2.addWeighted(overlay, 0.30, frame, 0.70, 0)
    
    # Draw grid lines (thin white borders)
    for col in range(1, cols):
        x = col * cell_w
        cv2.line(blended, (x, 0), (x, h), (255, 255, 255), 1)
    for row in range(1, rows):
        y = row * cell_h
        cv2.line(blended, (0, y), (w, y), (255, 255, 255), 1)
    
    return blended

def annotate_frame(frame, box_data, stats):
    annotated = frame.copy()
    h, w = annotated.shape[:2]
    
    # Draw gridlock zones first (underneath boxes)
    annotated = draw_gridlock_zones(annotated, box_data)
    
    # Draw boxes
    for box in box_data:
        x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])
        label = box.get("class", "")
        conf = box.get("conf", 0)
        class_id = box.get("class_id", 0)
        
        # Color by class ID using CLASS_COLORS
        color = CLASS_COLORS.get(int(class_id), DEFAULT_COLOR)
        
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
        
        if label:
            text = f"{label} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 8, y1), color, -1)
            cv2.putText(annotated, text, (x1 + 4, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)
    
    # Draw stats overlay at top-left
    status = stats.get("status", "UNKNOWN")
    count = stats.get("count", 0)
    overlay_text = f"Frame | {status} | {count} vehicles"
    cv2.rectangle(annotated, (10, 10), (420, 50), (0, 0, 0), -1)
    cv2.putText(annotated, overlay_text, (20, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
    
    return annotated


async def generate_telemetry(video_path, model_req, cancel_key=None):
    model = get_model_instance(model_req)
    if not model:
        yield json.dumps({"error": "Model not found"}) + "\n"
        return

    session_brain = TrafficBrain(fps=STREAM_FPS)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        yield json.dumps({"error": "Cannot open video"}) + "\n"
        return

    frame_id = 0
    tracker_config = BYTETRACK_CONFIG if os.path.exists(BYTETRACK_CONFIG) else "bytetrack.yaml"

    print(f"[TELEMETRY] Starting session | Model: {model_req} | ByteTrack: {tracker_config} | Process every {TELEMETRY_PROCESS_EVERY_N} frames | imgsz: {TELEMETRY_IMG_SIZE}")

    last_output = None

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        cancelled = cancel_key and telemetry_cancel_flags.get(cancel_key, False)

        if cancelled:
            print(f"[TELEMETRY] Session cancelled at frame {frame_id}")
            break

        should_track = (frame_id % TELEMETRY_PROCESS_EVERY_N == 0)

        try:
            if should_track:
                results = model.track(
                    frame, persist=True, verbose=False,
                    tracker=tracker_config, conf=CONF_THRESHOLD,
                    imgsz=TELEMETRY_IMG_SIZE
                )

                if frame_id == 0:
                    has_ids = results[0].boxes.id is not None
                    num_tracks = len(results[0].boxes.id.unique()) if has_ids else 0
                    num_dets = len(results[0].boxes) if results[0].boxes else 0
                    print(f"[TRACKER] Frame 0: IDs present={has_ids} | Unique tracks={num_tracks} | Detections={num_dets}")
                    if not has_ids:
                        print("[TRACKER] WARNING: No track IDs detected - ByteTrack may not be initialized correctly")

                count, status, alerts, green_wave, avg_speed, speeds, quality_scores = session_brain.analyze(results, frame)

                box_data = []
                if results[0].boxes and results[0].boxes.xyxy is not None:
                    xyxy = results[0].boxes.xyxy.cpu().numpy()
                    confs = results[0].boxes.conf.cpu().numpy()
                    clss = results[0].boxes.cls.int().cpu().numpy()
                    names = results[0].names
                    track_ids = results[0].boxes.id.int().cpu().numpy() if results[0].boxes.id is not None else None
                    for i, (b, c, cl) in enumerate(zip(xyxy, confs, clss)):
                        entry = {
                            "x1": round(float(b[0]), 1), "y1": round(float(b[1]), 1),
                            "x2": round(float(b[2]), 1), "y2": round(float(b[3]), 1),
                            "class": names.get(int(cl), f"cls_{cl}"),
                            "class_id": int(cl),
                            "conf": round(float(c), 2)
                        }
                        if track_ids is not None:
                            tid = int(track_ids[i])
                            entry["track_id"] = tid
                            if tid in speeds:
                                entry["speed_kmh"] = speeds[tid]
                            if tid in quality_scores:
                                entry["quality"] = quality_scores[tid]
                        box_data.append(entry)

                # Annotate frame with boxes
                annotated = annotate_frame(frame, box_data, {
                    "count": count,
                    "status": status
                })
                _, img_buffer = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), ANNOTATED_JPEG_QUALITY])
                frame_b64 = base64.b64encode(img_buffer).decode('utf-8')
                
                if frame_id % 30 == 0:
                    print(f"[ANNOTATE] Frame {frame_id} | Boxes drawn: {len(box_data)} | Image size: {len(frame_b64)//1024}KB")

                output = {
                    "frame": frame_id,
                    "stats": {
                        "count": count,
                        "status": status,
                        "green_wave": green_wave,
                        "density": round(count / 50.0, 2),
                        "avg_speed": avg_speed,
                        "speeds": {str(k): v for k, v in speeds.items()},
                        "congestion_phase": status
                    },
                    "boxes": box_data,
                    "incidents": alerts,
                    "frame_image": f"data:image/jpeg;base64,{frame_b64}"
                }
                last_output = output

                if frame_id % 30 == 0:
                    # Gridlock zone debug
                    h, w = frame.shape[:2]
                    cols, rows = 4, 3
                    cell_w, cell_h = w // cols, h // rows
                    grid = [[0] * cols for _ in range(rows)]
                    for box in box_data:
                        cx = (box["x1"] + box["x2"]) / 2
                        cy = (box["y1"] + box["y2"]) / 2
                        col = min(int(cx // cell_w), cols - 1)
                        row = min(int(cy // cell_h), rows - 1)
                        grid[row][col] += 1
                    zone_counts = [grid[r][c] for r in range(rows) for c in range(cols)]
                    red_zones = sum(1 for c in zone_counts if c > 15)
                    print(f"[TELEMETRY] Frame {frame_id} | Count: {count} | Status: {status} | Speed: {avg_speed} km/h | Alerts: {len(alerts)}")
                    print(f"[GRIDLOCK] Zones: {zone_counts} | Red zones: {red_zones}")

                yield json.dumps(output) + "\n"
            else:
                if last_output is not None:
                    skipped = {
                        "frame": frame_id,
                        "stats": last_output["stats"],
                        "boxes": [],
                        "incidents": [],
                        "skipped": True,
                        "frame_image": last_output.get("frame_image", "")
                    }
                    yield json.dumps(skipped) + "\n"

            frame_id += 1
        except Exception as e:
            print(f"[TELEMETRY] Frame {frame_id} error: {e}")
            frame_id += 1
            continue

    cap.release()
    if cancel_key and cancel_key in telemetry_cancel_flags:
        del telemetry_cancel_flags[cancel_key]
    print(f"[TELEMETRY] Session complete | {frame_id} frames processed")
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
    print(f"[UPLOAD] {file.filename} -> {temp_name} | Model: {model}")
    return {"stream_url": f"/telemetry?video_id={temp_name}&model_req={model}"}


@app.get("/telemetry")
async def telemetry_endpoint(video_id: str, model_req: str):
    if not os.path.exists(video_id):
        raise HTTPException(status_code=404, detail="Video file not found")

    cancel_key = video_id
    telemetry_cancel_flags[cancel_key] = False
    return StreamingResponse(
        generate_telemetry(video_id, model_req, cancel_key=cancel_key),
        media_type="application/x-ndjson"
    )


@app.post("/cancel-telemetry")
async def cancel_telemetry_endpoint(payload: dict):
    video_id = payload.get("video_id", "")
    cancel_key = video_id
    if cancel_key in telemetry_cancel_flags:
        telemetry_cancel_flags[cancel_key] = True
        print(f"[TELEMETRY] Cancel requested for: {cancel_key}")
        return {"success": True, "message": f"Cancellation requested for {cancel_key}"}
    return {"success": False, "message": "Session not found"}


def get_clearance_level(score):
    for lo, hi, label in CLEARANCE_LEVELS:
        if lo <= score <= hi:
            return label
    return "UNKNOWN"


async def generate_tile_analysis(session_id, tile_ids, model_name="mark-5"):
    print(f"[ANALYZE-DEBUG] generate_tile_analysis called with model_name={model_name} | tiles={len(tile_ids)}")
    model = get_model_instance(model_name)
    print(f"[ANALYZE-DEBUG] get_model_instance returned: {model is not None}")
    if not model:
        yield json.dumps({"error": "Model failed to load"}) + "\n"
        return

    total_vehicles = 0
    clearance_scores = []
    hotspots = []
    tile_results = []

    print(f"[ANALYZE] Streaming {len(tile_ids)} tiles | Model: {model_name}")

    for tile_id in tile_ids:
        try:
            image_bytes = redis_client.get(f"tile:{tile_id}")
            if not image_bytes:
                result = {"tileId": tile_id, "status": "missing_in_cache", "vehicleCount": 0, "clearanceScore": 0, "clearanceLevel": "CLEAR", "delta": 0, "deltaPercent": 0, "detections": []}
                tile_results.append(result)
                yield json.dumps(result) + "\n"
                continue

            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                result = {"tileId": tile_id, "status": "decode_error", "vehicleCount": 0, "clearanceScore": 0, "clearanceLevel": "CLEAR", "delta": 0, "deltaPercent": 0, "detections": []}
                tile_results.append(result)
                yield json.dumps(result) + "\n"
                continue

            preds = model.predict(img, conf=CONF_THRESHOLD, verbose=False, imgsz=INFERENCE_IMG_SIZE)
            v_count = len(preds[0].boxes) if preds[0].boxes else 0
            total_vehicles += v_count

            clearance_score = 0
            detections = []
            if preds[0].boxes:
                for box in preds[0].boxes:
                    x, y, w, h = box.xywh[0].cpu().numpy()
                    cls = int(box.cls[0].cpu().numpy())
                    conf = float(box.conf[0].cpu().numpy())
                    class_name = preds[0].names.get(cls, f"class_{cls}")
                    weight = VEHICLE_CLEARANCE_WEIGHTS.get(cls, 1)
                    clearance_score += weight
                    detections.append({
                        "class": class_name, "class_id": cls,
                        "confidence": round(conf, 3),
                        "clearanceWeight": weight,
                        "bbox": {"x": float(x), "y": float(y), "w": float(w), "h": float(h)}
                    })

            prev_count = 0
            cached = redis_client.get(f"analysis:{tile_id}")
            if cached:
                try:
                    prev_data = json.loads(cached.decode("utf-8") if isinstance(cached, bytes) else cached)
                    prev_count = prev_data.get("vehicleCount", 0)
                except:
                    pass

            delta = v_count - prev_count
            delta_percent = round((delta / max(prev_count, 1)) * 100, 1) if prev_count > 0 else 0

            cache_payload = json.dumps({
                "tileId": tile_id, "vehicleCount": v_count,
                "clearanceScore": clearance_score, "timestamp": time.time()
            })
            redis_client.setex(f"analysis:{tile_id}", ANALYSIS_CACHE_TTL, cache_payload)

            clearance_level = get_clearance_level(clearance_score)
            clearance_scores.append(clearance_score)

            result = {
                "tileId": tile_id, "status": "processed",
                "vehicleCount": v_count, "clearanceScore": clearance_score,
                "clearanceLevel": clearance_level,
                "delta": delta, "deltaPercent": delta_percent,
                "detections": detections
            }
            tile_results.append(result)
            yield json.dumps(result) + "\n"

        except Exception as e:
            result = {"tileId": tile_id, "status": "error", "message": str(e), "vehicleCount": 0, "clearanceScore": 0, "clearanceLevel": "UNKNOWN", "delta": 0, "deltaPercent": 0, "detections": []}
            tile_results.append(result)
            yield json.dumps(result) + "\n"

    avg_clearance = round(sum(clearance_scores) / max(len(clearance_scores), 1), 1) if clearance_scores else 0

    for res in tile_results:
        if res.get("vehicleCount", 0) > 10:
            hotspots.append({
                "tileId": res["tileId"],
                "vehicleCount": res["vehicleCount"],
                "clearanceLevel": res["clearanceLevel"]
            })

    print(f"[ANALYZE] Session {session_id} complete | {total_vehicles} vehicles | {len(tile_results)} tiles | Clearance avg: {avg_clearance}")

    yield json.dumps({
        "type": "summary",
        "sessionId": session_id,
        "totalVehicles": total_vehicles,
        "tilesProcessed": len(tile_results),
        "averageClearanceScore": avg_clearance,
        "averageClearanceLevel": get_clearance_level(avg_clearance),
        "hotspots": hotspots,
        "hotspotCount": len(hotspots),
        "allTiles": tile_results
    }) + "\n"


@app.post("/analyze")
async def analyze_static_tiles(req: AnalyzeRequest):
    print(f"[ANALYZE-DEBUG] Request received | model={req.model} | tiles={len(req.tileIds)}")
    if not redis_client:
        print("[ANALYZE-DEBUG] Redis not connected, returning 503")
        return JSONResponse(status_code=503, content={"success": False, "error": "Redis not connected"})

    return StreamingResponse(
        generate_tile_analysis(req.sessionId, req.tileIds, req.model),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@app.get("/simulations/list")
def list_simulations():
    files = [f for f in os.listdir(SIMULATION_DIR) if f.endswith(".mp4")]
    scenarios = [{"id": f.replace(".mp4", ""), "name": f} for f in sorted(files)]
    print(f"[SIMULATIONS] Listed {len(scenarios)} scenarios")
    return {"success": True, "scenarios": scenarios}


@app.post("/process-local-simulation")
async def process_local_simulation(payload: dict):
    simulation_id = payload.get("simulation_id", "")
    model = payload.get("model", "mark-5")

    filename = f"{simulation_id}.mp4"
    file_path = os.path.join(SIMULATION_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Simulation '{filename}' not found on GPU server")

    print(f"[SIMULATION] Processing: {file_path} | Model: {model}")
    return {"stream_url": f"/telemetry?video_id={file_path}&model_req={model}"}


@app.get("/")
def health_check():
    stats = {
        "status": "online",
        "engine": "AerialVision GPU Engine v4.0",
        "model_loaded": current_model_name or "none",
        "gpu": get_gpu_stats(),
        "active_streams": len(STREAMS),
        "max_streams": MAX_STREAMS,
        "inference_resolution": INFERENCE_IMG_SIZE,
        "stream_resolution": STREAM_TARGET_WIDTH,
        "stream_fps": STREAM_FPS,
        "jpeg_quality": JPEG_QUALITY,
        "features": [
            "real_speed_estimation",
            "congestion_phase_detection",
            "sudden_braking_detection",
            "wrong_way_detection",
            "vehicle_clustering",
            "adaptive_frame_skip",
            "stream_health_metrics",
            "track_quality_scoring",
            "bytetrack_configured"
        ],
        "redis": "connected" if redis_client else "disconnected"
    }
    return stats


@app.get("/streams/status")
def streams_status():
    streams_info = {}
    for sid, s in STREAMS.items():
        health = s.get("reader", StreamReader("", None, None)).get_health() if s.get("reader") else {}
        streams_info[sid] = {
            "status": s["status"],
            "model": s["model"],
            "source": s["source"],
            "uptime_s": round(time.time() - s.get("started_at", time.time()), 1),
            "health": {
                "frames_processed": health.get("frames_processed", 0),
                "inference_ms": health.get("inference_ms", 0),
                "reconnect_count": health.get("reconnect_count", 0),
            }
        }
    return {
        "active": len(STREAMS),
        "max": MAX_STREAMS,
        "streams": streams_info
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"[SERVER] GPU Engine on port {port}")
    print(f"[SERVER] Models: {os.path.abspath(CACHE_PATH)}")
    print(f"[SERVER] Simulations: {os.path.abspath(SIMULATION_DIR)}")
    print(f"[SERVER] ByteTrack config: {BYTETRACK_CONFIG} (exists: {os.path.exists(BYTETRACK_CONFIG)})")
    print(f"[SERVER] GPU: {'cuda - ' + torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu'}")
    print(f"[SERVER] Inference: {INFERENCE_IMG_SIZE}px | Stream: {STREAM_TARGET_WIDTH}px @ {STREAM_FPS}fps | JPEG: {JPEG_QUALITY}%")
    print(f"[SERVER] Features: speed_estimation, congestion_phases, sudden_braking, wrong_way, clustering, track_quality")
    uvicorn.run(app, host="0.0.0.0", port=port)