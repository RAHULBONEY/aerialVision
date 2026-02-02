from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from ultralytics import YOLO
import torch
import psutil
import cv2
import numpy as np
import yt_dlp
import uuid
import os
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()
try:
    print("⏳ Loading Probe Model (Mark-3)...")
    probe_model = YOLO("best.pt")
    print("✅ Probe Model Loaded.")
except Exception as e:
    print(f"⚠️ Warning: Probe model failed to load: {e}")
    probe_model = None


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"] 
)

def get_stream_url(url):
    """Resolve YouTube URL to direct stream link using yt-dlp"""
    if "youtube.com" not in url and "youtu.be" not in url:
        return url 
    
    try:
        ydl_opts = {'format': 'best[ext=mp4]', 'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info['url']
    except Exception as e:
        print(f"❌ URL Resolution Failed: {e}")
        return None

@app.post("/probe")
async def probe_view_type(request: Request):
    """
    Analyzes ONE frame to decide if the view is AERIAL or GROUND.
    
    """
    if not probe_model:
        return JSONResponse({"viewType": "GROUND", "reason": "Probe model not loaded"})

    try:
        body = await request.json()
        source_url = body.get("sourceUrl")
        print(f"🕵️ Probing Source: {source_url}")

       
        real_url = get_stream_url(source_url)
        if not real_url:
            return JSONResponse({"viewType": "GROUND", "reason": "Could not resolve URL"})

        
        cap = cv2.VideoCapture(real_url)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            return JSONResponse({"viewType": "GROUND", "reason": "Stream offline or unreadable"})

        
        results = probe_model(frame, imgsz=640, verbose=False)[0]
        
       
        boxes = results.boxes.xywhn.cpu().numpy() 
        
        if len(boxes) == 0:
            return JSONResponse({"viewType": "GROUND", "reason": "No objects detected"})

        
        areas = boxes[:, 2] * boxes[:, 3] 
        avg_area = np.mean(areas)
        
        print(f"📊 Probe Result: Avg Object Area = {avg_area:.5f}")

        if avg_area < 0.008: 
            return JSONResponse({
                "viewType": "AERIAL", 
                "reason": f"Detected small objects (Scale: {avg_area:.4f}) indicating High Altitude."
            })
        else:
            return JSONResponse({
                "viewType": "GROUND", 
                "reason": f"Detected large objects (Scale: {avg_area:.4f}) indicating Street Level."
            })

    except Exception as e:
        print(f"❌ Probe Error: {e}")
        return JSONResponse({"viewType": "GROUND", "reason": "Probe failed, defaulting to safe mode."})
@app.get("/gpu/status")
def gpu_status():
    status = {
        "device": "cpu",
        "memory_gb": 0,
        "temperature": 0,
        "load": 0
    }
    
    if torch.cuda.is_available():
        status["device"] = "cuda"
        status["memory_gb"] = torch.cuda.get_device_properties(0).total_memory / 1e9
        status["memory_allocated_gb"] = torch.cuda.memory_allocated(0) / 1e9
        status["memory_free_gb"] = (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)) / 1e9
        
        # Add temperature if nvidia-ml-py is installed
        try:
            import nvidia_smi
            nvidia_smi.nvmlInit()
            handle = nvidia_smi.nvmlDeviceGetHandleByIndex(0)
            status["temperature"] = nvidia_smi.nvmlDeviceGetTemperature(handle, nvidia_smi.NVML_TEMPERATURE_GPU)
            status["load"] = nvidia_smi.nvmlDeviceGetUtilizationRates(handle).gpu
        except:
            pass
    
    status["cpu_percent"] = psutil.cpu_percent()
    status["memory_percent"] = psutil.virtual_memory().percent
    
    return status
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    error_msg = f"{exc.__class__.__name__}: {str(exc)}"
    print(f"🔥 ENGINE ERROR: {error_msg}")
    print(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={"error": error_msg, "success": False}
    )
@app.post("/streams/start")
def start(payload: dict):
    stream_id = payload.get("id") or str(uuid.uuid4())
    source_url = payload["sourceUrl"]
    model = payload.get("model", "mark-2")
    public_url = os.getenv("PUBLIC_URL", "http://localhost:8001")
    print(public_url)
    if stream_id in STREAMS:
        raise HTTPException(status_code=400, detail="Stream already running")

    try:
        start_stream(stream_id, source_url, model)
    except Exception as e:
        
        return {"success": False, "error": str(e)}
    return {
        "streamId": stream_id,
        "aiEngineUrl": f"{public_url}/streams/{stream_id}"
    }

@app.get("/streams/{stream_id}")
def view(stream_id: str):
    stream = STREAMS.get(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    
    return StreamingResponse(
        stream["reader"].stream(),
        media_type="multipart/x-mixed-replace;boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*", 
        }
    )

@app.post("/streams/{stream_id}/stop")
def stop(stream_id: str):
    if not stop_stream(stream_id):
        raise HTTPException(status_code=404, detail="Stream not found")
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    from pyngrok import ngrok
    import os

   
    PORT = 8001

   
    try:
        tunnel = ngrok.connect(PORT)
        public_url = tunnel.public_url
        print("==================================================")
        print(f"🚀 LOCAL PROBE IS LIVE AT: {public_url}")
        print("==================================================")

        
        os.environ["PUBLIC_URL"] = public_url
        
    except Exception as e:
        print(f"⚠️ Could not start Ngrok: {e}")
        print("Falling back to localhost...")

   
    uvicorn.run(app, host="0.0.0.0", port=PORT)