import os
import random
import shutil


SOURCE_DIRS = [
    'datasets/all_data_combined/vedai', 
    'datasets/all_data_combined/vaid', 
    'datasets/dlr_converted_labels'  
]


DEST_DIR = 'datasets/traffic_data'
TRAIN_RATIO = 0.8 


train_img_path = os.path.join(DEST_DIR, 'images', 'train')
val_img_path = os.path.join(DEST_DIR, 'images', 'val')
train_label_path = os.path.join(DEST_DIR, 'labels', 'train')
val_label_path = os.path.join(DEST_DIR, 'labels', 'val')


os.makedirs(train_img_path, exist_ok=True)
os.makedirs(val_img_path, exist_ok=True)
os.makedirs(train_label_path, exist_ok=True)
os.makedirs(val_label_path, exist_ok=True)
print("Destination directories created successfully.")


all_image_files = []
for source_dir in SOURCE_DIRS:
    if not os.path.exists(source_dir):
        print(f"Warning: Source directory '{source_dir}' does not exist. Skipping.")
        continue
    
    images = [os.path.join(source_dir, f) for f in os.listdir(source_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    all_image_files.extend(images)
    print(f"Found {len(images)} images in '{source_dir}'.")

random.shuffle(all_image_files) 


split_index = int(len(all_image_files) * TRAIN_RATIO)
train_files = all_image_files[:split_index]
val_files = all_image_files[split_index:]

print(f"\nTotal images found: {len(all_image_files)}")
print(f"Training images: {len(train_files)}")
print(f"Validation images: {len(val_files)}")


def copy_files(file_list, img_dest, label_dest):
    for img_path in file_list:
        basename = os.path.splitext(os.path.basename(img_path))[0]
       
        if basename.endswith('_co'):
            label_basename = basename.replace('_co', '')
        else:
            label_basename = basename
            
        label_name = label_basename + '.txt'
        label_path = os.path.join(os.path.dirname(img_path), label_name)
        
        if os.path.exists(label_path):
            
            shutil.copy(img_path, img_dest)
            final_label_name = os.path.splitext(os.path.basename(img_path))[0] + '.txt'
            shutil.copy(label_path, os.path.join(label_dest, final_label_name))
        else:
            print(f"Warning: Label file for '{os.path.basename(img_path)}' (looked for {label_name}) not found. Skipping.")


print("\nCopying training files...")
copy_files(train_files, train_img_path, train_label_path)

print("Copying validation files...")
copy_files(val_files, val_img_path, val_label_path)

print("\nDataset preparation complete! Your 'traffic_data' folder is ready for training.")