from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .detect import run_detection, decode_base64_image
import time

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Husk å begrense dette i prod!
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
