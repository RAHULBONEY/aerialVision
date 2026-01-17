from reader import StreamReader
from inference import InferenceEngine
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

STREAMS = {}

def start_stream(stream_id, source_url, model_name):
    MODEL_PATHS = {
        "mark-2": "../../mark2.pt",
        "mark-2.5": "../../mark2.5.pt",
        "mark-1": "../../mark1.pt"
    }
    model_path = MODEL_PATHS.get(model_name, "../../mark2.pt")
    
    abs_path = os.path.abspath(model_path)
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"Model not found: {abs_path}")
    
    # Create engine
    engine = InferenceEngine(abs_path)
    
    # Create reader with GTX 1650 settings
    reader = StreamReader(
        source_url, 
        engine, 
        fps_limit=15,      # Target 15 FPS
        max_queue=2        # Minimal latency
    )
    reader.start()
    
    STREAMS[stream_id] = {
        "reader": reader,
        "engine": engine,
        "status": "RUNNING"
    }

def stop_stream(stream_id):
    stream = STREAMS.get(stream_id)
    if not stream:
        return False
    
    stream["reader"].stop()
    del STREAMS[stream_id]
    return True