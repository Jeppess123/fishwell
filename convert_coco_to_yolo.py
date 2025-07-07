import os
import json

def convert_bbox_coco_to_yolo(bbox, img_width, img_height):
    x, y, w, h = bbox
    x_center = (x + w / 2) / img_width
    y_center = (y + h / 2) / img_height
    w /= img_width
    h /= img_height
    return x_center, y_center, w, h

def main():
    # Example paths (adjust as needed)
    coco_json_path = "backend/FlowDataset/annotations/instances_train.json"
    images_dir = "backend/FlowDataset/train/images"
    labels_dir = "backend/FlowDataset/train/labels"

    with open(coco_json_path, "r", encoding="utf-8") as f:
        coco = json.load(f)

    images = {img['id']: img for img in coco['images']}
    annotations = coco['annotations']

    for ann in annotations:
        image_info = images[ann['image_id']]
        img_width = image_info['width']
        img_height = image_info['height']
        image_filename = image_info['file_name']
        label_filename = os.path.splitext(image_filename)[0] + ".txt"
        label_path = os.path.join(labels_dir, label_filename)

        # Ensure the directory exists
        os.makedirs(os.path.dirname(label_path), exist_ok=True)

        category_id = ann['category_id']
        bbox = ann['bbox']
        yolo_bbox = convert_bbox_coco_to_yolo(bbox, img_width, img_height)

        with open(label_path, "a") as label_file:
            label_file.write(f"{category_id} {' '.join(str(round(x, 6)) for x in yolo_bbox)}\n")

    print("Konvertering fullført!")

if __name__ == "__main__":
    main()