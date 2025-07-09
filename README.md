# 🐟 Fishwell - Fish Detection System

AI-powered fish detection using computer vision. Upload images/videos or use live camera feed.

## Quick Start

**Prerequisites:** Python 3.11+, Node.js 18+

1. **Clone & Setup**
   ```bash
   git clone https://github.com/Jeppess123/fishwell.git
   cd fishwell
   
   # Backend
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   
   # Frontend
   cd frontend
   npm install
   ```

2. **Run**
   ```bash
   # Terminal 1: Backend
   cd backend
   python main.py
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

3. **Open** `http://localhost:5173`

## Tech Stack
- **Backend:** FastAPI, OpenCV, PyTorch, YOLO
- **Frontend:** React, TypeScript, Tailwind CSS
