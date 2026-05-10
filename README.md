```markdown
# AerialVision
**A Distributed Microservice Platform for AI-Driven Smart City Traffic Monitoring and Emergency Routing**

![System Architecture](https://img.shields.io/badge/Architecture-4--Tier_Microservice-blue)
![AI Engine](https://img.shields.io/badge/AI-YOLOv8_%7C_ByteTrack-orange)
![Backend](https://img.shields.io/badge/Backend-Node.js_%7C_FastAPI-green)
![Frontend](https://img.shields.io/badge/Frontend-React_19_%7C_Vite-cyan)

AerialVision is an enterprise-grade, event-driven platform designed to replace fragmented urban traffic management. Standard navigation systems route emergency vehicles based on historical speed, often sending them into physical gridlock. AerialVision overrides standard GPS by analyzing live satellite tiles and CCTV feeds to route ambulances based on **real-time physical vehicle clearance**.

---

## Live Demo & Project Media

**Live Vercel Deployment:** [https://aerial-vision-two.vercel.app/](https://aerial-vision-two.vercel.app/)

**Demo Operator Login:**
* **Email:** admin2@police.gov
* **Password:** 12345678

**Project Gallery & Exhibition Demos:** **[View the AerialVision Google Drive Gallery](https://drive.google.com/drive/u/0/folders/1VBoQ2MrGxqsyEbkMn5BaCEYrdK1tqyqy)**
*(Contains live exhibition videos, architecture diagrams, results photos, and the avi CLI in action)*

---

## Core Features

* **Physical Clearance Routing:** Utilizes a BullMQ queue and Upstash Redis cache to fetch Google Maps satellite tiles along proposed emergency corridors, using AI to count absolute vehicle density and recommend the physically safest route.
* **Distributed AI Gateway:** A decoupled Python/FastAPI gateway that proxies heavy video streams to a remote NVIDIA T4 GPU hosted on **E2E Networks cloud**, preventing the Node.js backend from blocking the event loop.
* **Safety-Critical Object Detection:** Powered by a custom-trained YOLOv8-Large model (Mark-4/5) with a specialized P2 detection head operating at 896x896 resolution, achieving a 53.3% mAP on emergency vehicles from extreme distances.
* **Real-Time Telemetry Broadcasting:** The GPU engine streams live NDJSON telemetry to the Node.js backend, which instantly broadcasts vehicle counts and "Green Wave" alerts to React operator dashboards via WebSockets.
* **RAG AI Copilot:** Features an integrated Retrieval-Augmented Generation (RAG) assistant using Groq LLaMA 3.1-8B and local all-MiniLM-L6-v2 embeddings, allowing operators to query high-stress incident logs using natural language.

---

## System Architecture (4-Tier)

### 1. Frontend (/traffic-monitor/src/)
* **Tech Stack:** React 19, Vite 7, Tailwind CSS 3, Socket.IO Client, Google Maps JS API.
* **Dashboards:** Role-Based Access Control (RBAC) providing distinct layouts for ADMIN, TRAFFIC_POLICE, and EMERGENCY operators.
* **Real-Time UI:** Live video player with Canvas-based bounding box overlays synced to WebSocket telemetry.

### 2. Backend (/traffic-monitor/aerialvision-backend/)
* **Tech Stack:** Node.js, Express 5, Firebase Admin SDK (Firestore + Auth), Socket.IO 4.8, BullMQ, Redis.
* **Incident Pipeline:** Consumes NDJSON from the AI Engine, detects incidents (congestion, wrong-way, stationary vehicles), deduplicates via cooldowns, and persists vector embeddings to Firestore.

### 3. AI Engine (/traffic-monitor/ai-engine/)
* **Tech Stack:** Python, FastAPI, Ultralytics YOLOv8, ByteTrack, OpenCV.
* **Hosting:** Deployed on an E2E Networks cloud GPU instance.
* **Tracking:** Utilizes ByteTrack for spatial positioning (Kalman filters) to maintain target locks during heavy urban vehicle occlusion without computationally expensive Re-ID models.

### 4. avi CLI Tool
* A Typer + Rich CLI packaged via PyInstaller to manage the remote GPU inference gateway.
* **Commands:**
  * `avi status` - Fetches GPU health, VRAM, and active models from the E2E cloud instance.
  * `avi probe <url>` - Analyzes video source and dynamically enforces model selection.
  * `avi run <sim_id>` - Consumes live NDJSON telemetry and displays a real-time Rich dashboard.

---

## The "Ironclad" Model Generation (Mark-4 / Mark-5)
The AI engine was engineered through 5 iterations to survive unpredictable Indian traffic conditions:
* **Architecture:** YOLOv8-Large-P2 (43.7M Parameters).
* **Training Data:** 32,220 images utilizing Mosaic augmentations and HSV photometric shifts.
* **Optimization:** Trained using SGD with Nesterov momentum, a Cosine Annealing learning rate schedule, and CIoU Box Loss to enforce microscopically tight bounding boxes.

---

## Installation & Setup

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* Redis Server (Local or Upstash)
* Firebase Project Credentials

### 1. Start the Backend
```bash
cd traffic-monitor/aerialvision-backend
npm install
npm run dev

```

### 2. Start the Frontend

```bash
cd traffic-monitor/src
npm install
npm run dev

```

### 3. Start the AI Engine (GPU Node)

```bash
cd traffic-monitor/ai-engine
pip install -r requirements.txt
uvicorn main:app --port 8001

```

### 4. Install the CLI Tool

```bash
cd avi
pip install -e .
avi --help

```

---

**Designed and Architected by Rahul Boney**

```

```
