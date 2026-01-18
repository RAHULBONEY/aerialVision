from fastapi import FastAPI, HTTPException
import torch  
import psutil
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from streams import STREAMS, start_stream, stop_stream
from fastapi.responses import JSONResponse
import uuid
import os
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"] 
)
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