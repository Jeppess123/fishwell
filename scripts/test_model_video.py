from ultralytics import YOLO
import cv2

# Load the model
model = YOLO(r"runs/detect/train/weights.pt")

# Load the video
video_path = r"backend\FlowDataset\train\videos\flow.mp4"
cap = cv2.VideoCapture(video_path)

# Loop through frames
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Run detection on the frame
    results = model(frame)

    # Visualize detections
    annotated_frame = results[0].plot()

    # Show the frame
    cv2.imshow("YOLOv8 Video Detection", annotated_frame)

    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
