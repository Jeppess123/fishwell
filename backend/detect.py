from ultralytics import YOLO
import numpy as np
import base64
from PIL import Image
import io
from pathlib import Path

print("Laster inn YOLO-modell...")

# Løsning: Bruk Path til å finne full sti til modellen robust
BASE_DIR = Path(__file__).resolve().parent  # backend/
MODEL_PATH = BASE_DIR / "models" / "best.pt"

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Modellfil ikke funnet: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))
print("Modell klar!")

def decode_base64_image(image_base64: str) -> Image.Image:
    """Tar inn en base64-streng og returnerer en PIL Image."""
    header, encoded = image_base64.split(",", 1)
    image_bytes = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return image

def run_detection(image: Image.Image, return_annotated: bool = False):
    np_image = np.array(image)
    results = model(np_image)
    
    # Get original image dimensions
    img_height, img_width = np_image.shape[:2]

    detections = []
    annotated_frame = None
    
    for result in results:
        boxes = result.boxes.xyxy.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy()

        for box, conf, cls in zip(boxes, confidences, classes):
            x1, y1, x2, y2 = box
            detections.append({
                "x": float(x1),
                "y": float(y1),
                "width": float(x2 - x1),
                "height": float(y2 - y1),
                "confidence": float(conf),
                "class": model.names[int(cls)]
            })

        # Generate annotated frame if requested
        if return_annotated:
            # Use YOLO's built-in plot function to draw bounding boxes
            annotated_img = result.plot(
                conf=True,  # Show confidence scores
                labels=True,  # Show class labels
                boxes=True,  # Show bounding boxes
                line_width=2,  # Line thickness
                font_size=12
            )
            
            # Convert BGR to RGB (YOLO plot returns BGR)
            annotated_img_rgb = annotated_img[:, :, ::-1]
            
            # Convert to PIL Image
            annotated_pil = Image.fromarray(annotated_img_rgb)
            
            # Convert to base64
            buffer = io.BytesIO()
            annotated_pil.save(buffer, format='JPEG', quality=90)
            buffer.seek(0)
            annotated_frame = base64.b64encode(buffer.getvalue()).decode('utf-8')
            annotated_frame = f"data:image/jpeg;base64,{annotated_frame}"

    return {
        "detections": detections,
        "image_width": img_width,
        "image_height": img_height,
        "annotated_frame": annotated_frame
    }
