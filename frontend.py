import streamlit as st
import requests
import os
import threading
import time
import random
from streamlit.runtime.scriptrunner import add_script_run_ctx


API_URL = "http://127.0.0.1:8000/process-video"


st.set_page_config(
    page_title="Aerial Vision Dashboard",
    page_icon="🚁",
    layout="centered" 
)
st.title("🚁 Aerial Vision for Smart Traffic Monitoring")


uploaded_file = st.file_uploader(
    "Upload a traffic video to analyze:",
    type=["mp4", "mov", "avi"]
)


STATUS_MESSAGES = [
    "🚀 Uploading video to secure server...",
    "🧠 Loading YOLOv8 'Mark 2' Model...",
    "🔍 Running Object Detection (Cars, Trucks, Ambulances)...",
    "📡 Initializing DeepSORT Tracker...",
    "📐 Calculating Object Vectors & Speeds...",
    "🚨 Checking for Anomalies & Congestion...",
    "🚑 Scanning for Emergency Vehicles...",
    "💾 Rendering Final Output Video...",
    "✅ Finalizing Intelligence Layer..."
]


processing_done = False

def animate_progress_bar(progress_bar, status_text):
    """
    Updates the bar and text to keep the user engaged.
    """
    progress = 0
    message_index = 0
    
    while progress < 95:
        if processing_done:
            break
            
       
        if int(progress) % 12 == 0:
            msg = STATUS_MESSAGES[message_index % len(STATUS_MESSAGES)]
            status_text.markdown(f"**{msg}**")
            message_index += 1

        
        time.sleep(0.5) 
        
       
        if progress < 40:
            increment = random.uniform(1.0, 3.0)
        elif progress < 70:
            increment = random.uniform(0.5, 1.5)
        else:
            increment = random.uniform(0.1, 0.5) 
            
        progress += increment
        if progress > 95: progress = 95
        
        try:
            progress_bar.progress(int(progress) / 100)
        except Exception:
            break

if uploaded_file is not None:
   
    st.subheader("Original Feed")
    st.video(uploaded_file, format=uploaded_file.type)

    
    if st.button("Analyze Traffic", type="primary", use_container_width=True):
        
        
        status_text = st.empty()
        progress_bar = st.progress(0)
        
        processing_done = False
        
        
        t = threading.Thread(target=animate_progress_bar, args=(progress_bar, status_text))
        add_script_run_ctx(t) 
        t.start()

        try:
            
            files = {"video": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
            
           
            response = requests.post(API_URL, files=files, timeout=1200) 
            
            
            processing_done = True
            t.join()
            
            
            if response.status_code == 200:
                progress_bar.progress(1.0)
                status_text.success("✅ Analysis Complete!")
                
                video_bytes = response.content
                basename = os.path.splitext(uploaded_file.name)[0]
                output_filename = f"processed_{basename}.mp4"

                
                st.divider()
                st.subheader("🎯 Processed Output")
                st.video(video_bytes, format="video/mp4")
                
                st.download_button(
                    label="⬇️ Download Analyzed Video",
                    data=video_bytes,
                    file_name=output_filename,
                    mime="video/mp4",
                    use_container_width=True
                )
                
            else:
                status_text.error("❌ Processing Failed")
                st.error(f"Error from API: {response.status_code} - {response.text}")
                
        except requests.exceptions.RequestException as e:
            processing_done = True
            status_text.error("❌ Connection Error")
            st.error(f"Could not connect to backend. Is 'main.py' running? Error: {e}")
        except Exception as e:
            processing_done = True
            status_text.error("❌ Application Error")
            st.error(f"An error occurred: {e}")