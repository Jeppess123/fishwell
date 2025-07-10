from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .detect import run_detection, decode_base64_image
from PIL import Image
import io
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

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Fish detection backend is running"}

@app.options("/detect_frame")
async def detect_frame_options():
    return {"message": "CORS preflight OK"}

@app.post("/detect_frame")
async def detect_frame(request: Request):
    body = await request.json()
    image_data = body.get("image")
    return_annotated = body.get("return_annotated", False)

    if not image_data:
        return JSONResponse(content={"error": "No image provided"}, status_code=400)

    try:
        image = decode_base64_image(image_data)
        start = time.time()
        detections = run_detection(image, return_annotated=return_annotated)
        end = time.time()

        response_data = {
            "detections": detections["detections"],
            "count": len(detections["detections"]),
            "processingTime": round(end - start, 3),
            "image_width": detections["image_width"],
            "image_height": detections["image_height"]
        }
        
        if return_annotated and detections["annotated_frame"]:
            response_data["annotated_frame"] = detections["annotated_frame"]

        return JSONResponse(content=response_data)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        start = time.time()
        detections = run_detection(image)
        end = time.time()

        return JSONResponse(content={
            "detections": detections["detections"],
            "count": len(detections["detections"]),
            "processingTime": round(end - start, 3),
            "image_width": detections["image_width"],
            "image_height": detections["image_height"]
        })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
