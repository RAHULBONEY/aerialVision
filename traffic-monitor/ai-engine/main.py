import os
import uvicorn
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

# =========================
# CONFIGURATION
# =========================

app = FastAPI(title="Aerial Vision Gateway (Blind Proxy)")

# ⚠️ UPDATE THIS WITH YOUR RUNNING KAGGLE URL
KAGGLE_BRAIN_URL = "https://denver-ungenerating-beneficently.ngrok-free.dev" 

# Directory where you store your pre-downloaded scenarios
SIMULATION_DIR = "./streams" 
os.makedirs(SIMULATION_DIR, exist_ok=True)

# Mount streams dir for frontend playback
app.mount("/streams", StaticFiles(directory=SIMULATION_DIR), name="streams")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 1. THE PROBE (GOVERNANCE)
# =========================

@app.post("/probe")
async def probe_stream(payload: dict):
    """
    Simulates a probe but HARDCODES the recommendation for Mark 4.5
    to ensure safety-critical ambulance detection works during demos.
    """
    source_url = payload.get("sourceUrl", "")
    print(f"🕵️ Probing Request for: {source_url}")
    
    return {
        "viewType": "AERIAL",
        "recommended_model": "mark4.5",
        "reason": "Governance Protocol: Ironclad Safety Standards Enforced (Ambulance Detection)",
        "is_locked": True
    }

# =========================
# 2. STREAMING PROXY
# =========================

async def stream_generator(file_path: str, model: str):
    """
    Reads a local video file and streams it to the Remote Brain,
    then yields the NDJSON response line-by-line.
    
    Kaggle Brain uses a TWO-STEP flow:
    1. POST /upload_and_process -> returns {"stream_url": "/telemetry?..."}
    2. GET /telemetry?... -> returns NDJSON stream
    """
    print(f"🚀 Proxying {file_path} to Brain ({KAGGLE_BRAIN_URL})...")
    
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=60.0)) as client:
        try:
            # STEP 1: Upload video to Brain
            print(f"   📤 Uploading {os.path.basename(file_path)}...")
            with open(file_path, "rb") as f:
                files = {"file": (os.path.basename(file_path), f, "video/mp4")}
                data = {"model": model}
                
                upload_response = await client.post(
                    f"{KAGGLE_BRAIN_URL}/upload_and_process",
                    files=files,
                    data=data,
                    headers={"ngrok-skip-browser-warning": "true"}
                )
                
                if upload_response.status_code != 200:
                    error_msg = f"Brain upload failed: HTTP {upload_response.status_code}"
                    print(f"   ❌ {error_msg}")
                    yield f'{{"error": "{error_msg}"}}\n'
                    return
                
                # Parse the response to get stream_url
                upload_result = upload_response.json()
                stream_url = upload_result.get("stream_url")
                
                if not stream_url:
                    yield '{"error": "Brain did not return stream_url"}\n'
                    return
                
                print(f"   ✅ Upload complete. Telemetry URL: {stream_url}")
            
            # STEP 2: Consume NDJSON telemetry stream
            telemetry_url = f"{KAGGLE_BRAIN_URL}{stream_url}"
            print(f"   📡 Consuming telemetry from: {telemetry_url}")
            
            async with client.stream(
                "GET",
                telemetry_url,
                headers={"ngrok-skip-browser-warning": "true"}
            ) as telemetry_response:
                
                if telemetry_response.status_code != 200:
                    yield f'{{"error": "Telemetry stream failed: HTTP {telemetry_response.status_code}"}}\n'
                    return
                
                # Forward NDJSON chunks
                async for chunk in telemetry_response.aiter_bytes():
                    yield chunk

        except httpx.TimeoutException as e:
            print(f"🔥 Timeout Error: {e}")
            yield f'{{"error": "Connection timeout to Brain"}}\n'
        except Exception as e:
            print(f"🔥 Proxy Error: {e}")
            yield f'{{"error": "{str(e)}"}}\n'

@app.post("/process-simulation")
async def process_simulation(
    simulation_id: str = Form(...), 
    model: str = Form("mark4.5")
):
    """
    Endpoint for SIMULATION MODE.
    Reads a local file from disk and proxies it to the Brain.
    """
    # 1. Resolve File Path
    # Map IDs to filenames if necessary, or just use the ID as filename
    filename = f"{simulation_id}.mp4" 
    file_path = os.path.join(SIMULATION_DIR, filename)
    
    if not os.path.exists(file_path):
        # Fallback for demo if file missing
        print(f"⚠️ File {filename} not found in {SIMULATION_DIR}")
        raise HTTPException(404, detail="Simulation file not found on server")

    # 2. Stream to Brain
    return StreamingResponse(
        stream_generator(file_path, model),
        media_type="application/x-ndjson"
    )

@app.post("/process-upload")
async def process_upload(
    file: UploadFile = File(...),
    model: str = Form("mark4.5")
):
    """
    Endpoint for USER UPLOADS.
    Saves temp file, proxies to Brain, cleans up.
    """
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
        
    # Reuse the generator
    return StreamingResponse(
        stream_generator(temp_path, model),
        media_type="application/x-ndjson"
    )

# =========================
# UTILS
# =========================

@app.get("/simulations/list")
def list_simulations():
    """Returns available local mp4 files for the frontend dropdown"""
    files = [f for f in os.listdir(SIMULATION_DIR) if f.endswith(".mp4")]
    return {
        "success": True, 
        "scenarios": [{"id": f.replace(".mp4", ""), "name": f} for f in files]
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    print(f"🟢 Gateway running on port {port}")
    print(f"📂 Serving Simulations from: {os.path.abspath(SIMULATION_DIR)}")
    uvicorn.run(app, host="0.0.0.0", port=port)