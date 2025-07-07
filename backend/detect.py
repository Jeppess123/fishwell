from ultralytics import YOLO
import numpy as np
import base64
from PIL import Image
import io

print("Laster inn YOLO-modell...")
model = YOLO("yolov8n.pt")
print("Modell klar!")

def run_detection(image: Image.Image):
    np_image = np.array(image)
    results = model(np_image)

    detections = []
    for result in results:
        boxes = result.boxes.xyxy.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()

        for box, conf in zip(boxes, confidences):
            x1, y1, x2, y2 = box
            detections.append({
                "x": float(x1),
                "y": float(y1),
                "width": float(x2 - x1),
                "height": float(y2 - y1),
                "confidence": float(conf)
            })
    
    return detections
