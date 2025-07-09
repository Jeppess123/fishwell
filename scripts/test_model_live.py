from ultralytics import YOLO
import cv2

# Load the model
model = YOLO("runs/detect/train/weights.pt")  # Adjust as needed

# Open the webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Failed to open webcam.")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Failed to grab frame.")
        break

    # Run YOLOv8 detection
    results = model(frame)

    # Get frame with bounding boxes
    annotated_frame = results[0].plot()

    # Display the frame
    cv2.imshow("YOLOv8 Live Detection", annotated_frame)

    # Exit on 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()
