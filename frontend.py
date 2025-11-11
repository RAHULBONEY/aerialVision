import streamlit as st
import requests
import os


API_URL = "http://127.0.0.1:8000/process-video"


st.set_page_config(
    page_title="Aerial Vision Dashboard",
    page_icon="🚁",
    layout="wide"
)
st.title("🚁 Aerial Vision for Smart Traffic Monitoring")


uploaded_file = st.file_uploader(
    "Upload a traffic video to analyze:",
    type=["mp4", "mov", "avi"]
)

if uploaded_file is not None:
    
    st.video(uploaded_file, format=uploaded_file.type)

  
    if st.button("Analyze Traffic", type="primary"):
        
        with st.spinner("Processing video... This may take a few moments. Your model is tracking every object!"):
            try:
                
                files = {"video": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                response = requests.post(API_URL, files=files, timeout=600) 
                
                if response.status_code == 200:
                    st.success("Video processed successfully!")
                    
                    
                    video_bytes = response.content
                    
                  
                    basename = os.path.splitext(uploaded_file.name)[0]
                    output_filename = f"processed_{basename}.mp4"

                   
                    st.subheader("Processing Complete!")
                    st.download_button(
                        label="⬇️ Download Processed Video",
                        data=video_bytes,
                        file_name=output_filename,
                        mime="video/mp4"
                    )
                    
                    
                else:
                    st.error(f"Error from API: {response.status_code} - {response.text}")
                    
            except requests.exceptions.RequestException as e:
                st.error(f"Could not connect to the API. Is 'main.py' running? Error: {e}")
            except Exception as e:
                st.error(f"An error occurred: {e}")