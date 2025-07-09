from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .detect import run_detection, decode_base64_image
import time

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

    allow_origins=["*"],  # Husk å begrense dette i prod!
    allow_origins=["*"],  # Adjust this in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect_frame")
async def detect_frame(request: Request):
    body = await request.json()
    image_data = body.get("image")

    if not image_data:
        return JSONResponse(content={"error": "No image provided"}, status_code=400)

    try:
        image = decode_base64_image(image_data)
        start = time.time()
        detections = run_detection(image)
        end = time.time()

        return JSONResponse(content={
            "detections": detections,
            "count": len(detections),
            "processingTime": round(end - start, 3)
        })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
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
