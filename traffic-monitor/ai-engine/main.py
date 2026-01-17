from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse  # Add this import
from streams import STREAMS, start_stream, stop_stream
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/streams/start")
def start(payload: dict):
    stream_id = payload.get("id") or str(uuid.uuid4())
    source_url = payload["sourceUrl"]
    model = payload.get("model", "mark-2")

    if stream_id in STREAMS:
        raise HTTPException(status_code=400, detail="Stream already running")

    start_stream(stream_id, source_url, model)

    return {
        "streamId": stream_id,
        "aiEngineUrl": f"http://localhost:8001/streams/{stream_id}"
    }

@app.get("/streams/{stream_id}")
def view(stream_id: str):
    stream = STREAMS.get(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    # Return StreamingResponse instead of raw generator
    return StreamingResponse(
        stream["reader"].stream(),
        media_type="multipart/x-mixed-replace;boundary=frame"
    )

@app.post("/streams/{stream_id}/stop")
def stop(stream_id: str):
    if not stop_stream(stream_id):
        raise HTTPException(status_code=404, detail="Stream not found")
    return {"success": True}