from ultralytics import YOLO
import cv2

# Relative paths from the current working directory
model = YOLO(r"runs\detect\train\weights.pt")
image_path = r"backend\FlowDataset\train\images\001_gholm040511_000014_jpg.rf.e87b65b89ae8f963975ce0b32facd2ca.jpg"

results = model(image_path)
results[0].show()
