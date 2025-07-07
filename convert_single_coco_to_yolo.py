def main():
    dataset_dir = "backend/FlowDataset"
    coco_annotation_path = os.path.join(dataset_dir, "annotations.coco.json")

    with open(coco_annotation_path, "r") as f:
        coco = json.load(f)

    images = {img['id']: img for img in coco['images']}
    annotations = coco['annotations']
    categories = {cat['id']: cat['name'] for cat in coco['categories']}

    # Map fra dataset-del til labels-mappe
    labels_dirs = {
        "train": os.path.join(dataset_dir, "train_labels"),
        "valid": os.path.join(dataset_dir, "valid_labels"),
        "test": os.path.join(dataset_dir, "test_labels")
    }

    # Lag labels-mapper om de ikke finnes
    for ld in labels_dirs.values():
        if not os.path.exists(ld):
            os.makedirs(ld)

    for ann in annotations:
        image = images[ann['image_id']]
        img_width = image['width']
        img_height = image['height']
        img_file = image['file_name']  # f.eks "train/img1.jpg"

        # Finn hvilken dataset-del bildet tilhører
        dataset_part = img_file.split('/')[0]  # "train", "valid" eller "test"

        label_dir = labels_dirs.get(dataset_part)
        if not label_dir:
            print(f"Ukjent datasett-del for bilde {img_file}, hopper over")
            continue

        label_file_name = os.path.splitext(os.path.basename(img_file))[0] + ".txt"
        label_path = os.path.join(label_dir, label_file_name)

        x_center, y_center, width, height = convert_bbox_coco_to_yolo(ann['bbox'], img_width, img_height)

        class_id = ann['category_id'] - 1  # juster til 0-indeksert klasse

        line = f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n"

        with open(label_path, "a") as label_file:
            label_file.write(line)

    print("Konvertering fullført!")
