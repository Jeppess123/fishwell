from ultralytics import YOLO

model = YOLO('yolov8n.pt')  # Last inn forhåndstrent modell
model.train(data='backend/FlowDataset/dataset.yaml', epochs=3, imgsz=640)  # Tren i 3 epoker
