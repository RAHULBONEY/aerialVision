import streamlit as st
import requests
import json
import time
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
API_BASE_URL = "https://denver-ungenerating-beneficently.ngrok-free.dev" # <--- UPDATE THIS

st.set_page_config(page_title="AerialVision Admin", page_icon="🛡️", layout="wide")

# --- HEADER & GOVERNANCE ---
st.title("🛡️ AerialVision Governance Console")

with st.expander("⚙️ AI Model Governance", expanded=True):
    col_gov1, col_gov2 = st.columns([1, 3])
    with col_gov1:
        # Admin selects the model
        selected_model = st.selectbox(
            "Enforce Detection Model:",
            ["mark4", "mark4.5", "mark3", "mark2", "mark1"],
            index=0
        )
    with col_gov2:
        st.info(f"**Policy Active:** All traffic streams will be processed using `{selected_model.upper()}` engine.")
        if selected_model == "mark4" or selected_model == "mark4.5":
             st.success("✅ Ambulance Detection Enabled (Green Wave Ready)")
        else:
             st.warning("⚠️ Legacy Model Selected. Ambulance detection may be unreliable.")

# --- LIVE DASHBOARD ---
col_vid, col_stats = st.columns([1.5, 1])
uploaded_file = st.sidebar.file_uploader("Upload Traffic Video", type=["mp4"])

if uploaded_file:
    with col_vid:
        st.subheader("📺 Local Feed")
        st.video(uploaded_file)

    with col_stats:
        st.subheader("📊 Live Telemetry")
        start_btn = st.button("🚀 Analyze Stream", type="primary")
        
        # UI Elements
        green_wave_banner = st.empty()
        metric_col1, metric_col2 = st.columns(2)
        count_metric = metric_col1.empty()
        status_metric = metric_col2.empty()
        log_box = st.empty()
        logs = []

        if start_btn:
            try:
                # Upload with Governance Param
                files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                data = {"model": selected_model} # <--- SENDING CHOSEN MODEL
                headers = {"ngrok-skip-browser-warning": "true"}
                
                res = requests.post(f"{API_BASE_URL}/upload_and_process", files=files, data=data, headers=headers, verify=False)
                stream_url = f"{API_BASE_URL}{res.json()['stream_url']}"
                
                # Consume Stream
                with requests.get(stream_url, headers=headers, stream=True, verify=False) as r:
                    for line in r.iter_lines():
                        if line:
                            packet = json.loads(line.decode('utf-8'))
                            stats = packet['stats']
                            
                            # 1. GREEN WAVE UI
                            if stats.get("green_wave"):
                                green_wave_banner.error("🚑 GREEN WAVE ACTIVE: AMBULANCE DETECTED! CLEARING LANES.")
                            else:
                                green_wave_banner.empty()

                            # 2. METRICS
                            count_metric.metric("Vehicles", stats['count'])
                            status_metric.metric("Status", stats['status'])
                            
                            # 3. ALERTS LOG
                            if packet['incidents']:
                                for alert in packet['incidents']:
                                    icon = "🚑" if alert['type'] == "GREEN_WAVE" else "⚠️"
                                    log_msg = f"[{time.strftime('%H:%M:%S')}] {icon} {alert['description']}"
                                    logs.insert(0, log_msg)
                            
                            log_box.code("\n".join(logs[:8]), language="text")

            except Exception as e:
                st.error(f"Connection Error: {e}")