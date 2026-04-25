import os
import sys
import psutil
import torch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

STREAMS = {}
MAX_STREAMS_PER_GPU = 1

def get_cpu_temperature_windows():
    try:
        import wmi
        w = wmi.WMI(namespace="root\\OpenHardwareMonitor")
        temps = w.Sensor(SensorType="Temperature")
        for temp in temps:
            if "CPU" in temp.Name:
                return temp.Value
    except:
        pass

    try:
        import ctypes
        from ctypes import wintypes

        kernel32 = ctypes.windll.kernel32
        kernel32.GetTempPathW.restype = wintypes.DWORD
        kernel32.GetTempPathW.argtypes = [wintypes.DWORD, wintypes.LPWSTR]

        return None
    except:
        pass

    return None

def check_thermal_throttling():
    temps = None

    if hasattr(psutil, 'sensors_temperatures'):
        temps = psutil.sensors_temperatures()
        if 'coretemp' in temps:
            cpu_temp = max([t.current for t in temps['coretemp']])
            return cpu_temp > 85
    else:
        cpu_temp = get_cpu_temperature_windows()
        if cpu_temp is not None:
            return cpu_temp > 85

    return False

def check_gpu_memory():
    if not torch.cuda.is_available():
        return False

    try:
        gpu_mem_allocated = torch.cuda.memory_allocated(0) / 1e9
        return gpu_mem_allocated > 3.0
    except:
        return False

def start_stream(stream_id, source_url, model_name):
    MODEL_PATHS = {
        "mark-3":"./best.pt",
        "mark-2": "./mark2.pt",
        "mark-2.5": "./mark2.5.pt",
        "mark-1": "./mark1.pt"
    }
    model_path = MODEL_PATHS.get(model_name, "./mark2.pt")

    abs_path = os.path.abspath(model_path)
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"Model not found: {abs_path}")

    if check_gpu_memory():
        raise RuntimeError(f"GPU memory critically low")

    if check_thermal_throttling():
        raise RuntimeError(f"System thermal throttling detected")

    active_streams = [s for s in STREAMS.values() if s["status"] == "RUNNING"]
    if len(active_streams) >= MAX_STREAMS_PER_GPU:
        raise RuntimeError(f"Max streams already running")

    from inference import InferenceEngine
    engine = InferenceEngine(abs_path)

    from reader import StreamReader
    reader = StreamReader(
        source_url,
        engine,
        fps_limit=8,
        max_queue=1
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
