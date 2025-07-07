from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .detect import run_detection
from PIL import Image
import io
import base64

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    
    detections = run_detection(image)
    fish_count = len(detections)

    # Convert image to base64 for frontend display
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    image_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    image_data = f"data:image/jpeg;base64,{image_base64}"

    response = {
        "detections": detections,
        "fishCount": fish_count,
        "imageData": image_data,
        "timestamp": 0  # Set correct timestamp if you have video frame data
    }

    return JSONResponse(content=response)