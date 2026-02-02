import streamlit as st
import requests
import urllib3
import streamlit.components.v1 as components

# Disable SSL Warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ==========================================
# ⚙️ CONFIGURATION
# ==========================================
# Paste your Ngrok URL here
TARGET_URL = st.text_input("Enter Ngrok URL:", "https://rosita-unpulverable-jayse.ngrok-free.dev")
# ==========================================

st.set_page_config(page_title="Ngrok Inspector", page_icon="🕵️", layout="wide")
st.title("🕵️ Ngrok Connection Inspector")

if st.button("🔍 Probe Server"):
    col1, col2 = st.columns(2)
    
    # --- PROBE 1: STANDARD REQUEST ---
    with col1:
        st.subheader("1. Standard Request")
        st.caption("No Headers. Simulates a standard browser visit.")
        try:
            response = requests.get(f"{TARGET_URL}/health", verify=False, timeout=10)
            st.metric("Status Code", response.status_code)
            
            if response.status_code == 200:
                st.success("✅ Connection Successful!")
                st.json(response.json())
            else:
                st.warning("⚠️ Non-200 Response")
                st.text("Raw HTML Preview (First 500 chars):")
                st.code(response.text[:500], language='html')
                
                # Render the HTML (Warning Page)
                with st.expander("View Rendered Page", expanded=True):
                    components.html(response.text, height=400, scrolling=True)

        except Exception as e:
            st.error(f"❌ Connection Failed: {e}")

    # --- PROBE 2: BYPASS REQUEST ---
    with col2:
        st.subheader("2. Bypass Request")
        st.caption("With `ngrok-skip-browser-warning` header.")
        
        try:
            headers = {"ngrok-skip-browser-warning": "true"}
            response = requests.get(f"{TARGET_URL}/health", headers=headers, verify=False, timeout=10)
            
            st.metric("Status Code", response.status_code)
            
            if response.status_code == 200:
                st.success("✅ Bypass Worked! Server is reachable.")
                st.json(response.json())
            else:
                st.error("❌ Bypass Failed.")
                st.write(response.text)

        except Exception as e:
            st.error(f"❌ Connection Failed: {e}")