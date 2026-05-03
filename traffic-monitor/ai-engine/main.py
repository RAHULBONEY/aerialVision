import os
import uvicorn
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Aerial Vision Gateway (Blind Proxy)")

KAGGLE_BRAIN_URL = os.getenv("KAGGLE_BRAIN_URL", "http://164.52.213.55:8000")

SIMULATION_DIR = "./streams"
os.makedirs(SIMULATION_DIR, exist_ok=True)

app.mount("/streams", StaticFiles(directory=SIMULATION_DIR), name="streams")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/probe")
async def probe_stream(payload: dict):
    source_url = payload.get("sourceUrl", "")
    print(f"Probing Request for: {source_url}")

    return {
        "viewType": "AERIAL",
        "recommended_model": "mark4.5",
        "reason": "Governance Protocol: Ironclad Safety Standards Enforced (Ambulance Detection)",
        "is_locked": True
    }

async def stream_generator(file_path: str, model: str):
    print(f"Proxying {file_path} to Brain ({KAGGLE_BRAIN_URL})...")

    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=60.0)) as client:
        try:
            print(f"Uploading {os.path.basename(file_path)}...")
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
                    print(f"Upload failed: {error_msg}")
                    yield f'{{"error": "{error_msg}"}}\n'
                    return

                upload_result = upload_response.json()
                stream_url = upload_result.get("stream_url")

                if not stream_url:
                    yield '{"error": "Brain did not return stream_url"}\n'
                    return

                print(f"Upload complete. Telemetry URL: {stream_url}")

            telemetry_url = f"{KAGGLE_BRAIN_URL}{stream_url}"
            print(f"Consuming telemetry from: {telemetry_url}")

            async with client.stream(
                "GET",
                telemetry_url,
                headers={"ngrok-skip-browser-warning": "true"}
            ) as telemetry_response:

                if telemetry_response.status_code != 200:
                    yield f'{{"error": "Telemetry stream failed: HTTP {telemetry_response.status_code}"}}\n'
                    return

                async for chunk in telemetry_response.aiter_bytes():
                    yield chunk

        except httpx.TimeoutException as e:
            print(f"Timeout Error: {e}")
            yield f'{{"error": "Connection timeout to Brain"}}\n'
        except Exception as e:
            print(f"Proxy Error: {e}")
            yield f'{{"error": "{str(e)}"}}\n'

@app.post("/process-simulation")
async def process_simulation(
    simulation_id: str = Form(...),
    model: str = Form("mark4.5")
):
    filename = f"{simulation_id}.mp4"
    file_path = os.path.join(SIMULATION_DIR, filename)

    if os.path.exists(file_path):
        print(f"Local file found: {file_path}")
        return StreamingResponse(
            stream_generator(file_path, model),
            media_type="application/x-ndjson"
        )

    print(f"File {filename} not local, proxying to GPU Brain...")

    async def gpu_simulation_stream():
        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=60.0)) as client:
            try:
                response = await client.post(
                    f"{KAGGLE_BRAIN_URL}/process-local-simulation",
                    json={"simulation_id": simulation_id, "model": model},
                    headers={"ngrok-skip-browser-warning": "true"}
                )

                if response.status_code != 200:
                    yield f'{{"error": "GPU simulation failed: HTTP {response.status_code}"}}' + "\n"
                    return

                result = response.json()
                stream_url = result.get("stream_url")
                if not stream_url:
                    yield '{"error": "GPU did not return stream_url"}' + "\n"
                    return

                telemetry_url = f"{KAGGLE_BRAIN_URL}{stream_url}"
                print(f"Consuming GPU telemetry: {telemetry_url}")

                async with client.stream(
                    "GET", telemetry_url,
                    headers={"ngrok-skip-browser-warning": "true"}
                ) as telemetry_response:
                    if telemetry_response.status_code != 200:
                        yield f'{{"error": "Telemetry stream failed: HTTP {telemetry_response.status_code}"}}' + "\n"
                        return
                    async for chunk in telemetry_response.aiter_bytes():
                        yield chunk

            except httpx.TimeoutException:
                yield '{"error": "GPU timeout"}' + "\n"
            except Exception as e:
                print(f"GPU proxy error: {e}")
                yield f'{{"error": "{str(e)}"}}' + "\n"

    return StreamingResponse(gpu_simulation_stream(), media_type="application/x-ndjson")

@app.post("/process-upload")
async def process_upload(
    file: UploadFile = File(...),
    model: str = Form("mark4.5")
):
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    return StreamingResponse(
        stream_generator(temp_path, model),
        media_type="application/x-ndjson"
    )

@app.get("/simulations/list")
async def list_simulations():
    remote_scenarios = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{KAGGLE_BRAIN_URL}/simulations/list",
                headers={"ngrok-skip-browser-warning": "true"}
            )
            if response.status_code == 200:
                data = response.json()
                remote_scenarios = data.get("scenarios", [])
    except Exception as e:
        print(f"GPU simulations/list failed: {e}")

    local_files = [f for f in os.listdir(SIMULATION_DIR) if f.endswith(".mp4")]
    local_scenarios = [{"id": f.replace(".mp4", ""), "name": f} for f in local_files]

    # Merge remote + local, avoiding duplicates by id
    seen = set()
    merged = []
    for s in remote_scenarios + local_scenarios:
        if s["id"] not in seen:
            seen.add(s["id"])
            merged.append(s)

    return {
        "success": True,
        "scenarios": merged
    }

@app.post("/analyze")
async def analyze_tiles(payload: dict):
    print(f"[GATEWAY] Forwarding tile analysis request to GPU Brain...")

    async def proxy_analysis_stream():
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=30.0)) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{KAGGLE_BRAIN_URL}/analyze",
                    json=payload,
                    headers={"ngrok-skip-browser-warning": "true"}
                ) as response:

                    if response.status_code != 200:
                        error_body = await response.aread()
                        yield json.dumps({
                            "error": f"GPU Brain returned HTTP {response.status_code}",
                            "details": error_body.decode("utf-8", errors="replace")
                        }) + "\n"
                        return

                    async for chunk in response.aiter_bytes():
                        yield chunk

            except httpx.TimeoutException:
                yield json.dumps({"error": "GPU Brain timeout during tile analysis"}) + "\n"
            except Exception as e:
                print(f"[GATEWAY] Proxy error: {e}")
                yield json.dumps({"error": f"GPU Brain connection failed: {str(e)}"}) + "\n"

    return StreamingResponse(
        proxy_analysis_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    print(f"Gateway running on port {port}")
    print(f"Serving Simulations from: {os.path.abspath(SIMULATION_DIR)}")
    uvicorn.run(app, host="0.0.0.0", port=port)
