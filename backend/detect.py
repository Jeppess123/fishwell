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

def run_detection(image: Image.Image):
    np_image = np.array(image)
    results = model(np_image)

    detections = []
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

    return detections
