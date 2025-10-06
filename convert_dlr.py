import os
import shutil
from PIL import Image

#hello4
DLR_ROOT_DIR = r'C:\Users\RAHUL BONEY\Downloads'
OUTPUT_DIR = 'datasets/dlr_converted_labels'
os.makedirs(OUTPUT_DIR, exist_ok=True)


def convert_samp_folder(source_folder):
    converted_count = 0

    samp_files = [f for f in os.listdir(source_folder) if f.lower().endswith('.samp')]

    
    prefix_map = {}
    for samp in samp_files:
        prefix = '_'.join(samp.split('_')[:-1])
        prefix_map.setdefault(prefix, []).append(samp)

    for prefix, files in prefix_map.items():
        img_path = os.path.join(source_folder, prefix + '.JPG')
        if not os.path.exists(img_path):
            print(f"Warning: Image '{img_path}' not found. Skipping group.")
            continue

        with Image.open(img_path) as img:
            img_width, img_height = img.size

        yolo_lines = []

        for samp_file in files:
            samp_path = os.path.join(source_folder, samp_file)
            with open(samp_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) < 5:
                        continue
                    if not parts[0].replace('.', '', 1).isdigit():
                        continue
                    try:
                        class_id_str, x_pixel, y_pixel, w_pixel, h_pixel = parts[:5]
                        x_center_norm = float(x_pixel) / img_width
                        y_center_norm = float(y_pixel) / img_height
                        width_norm = float(w_pixel) / img_width
                        height_norm = float(h_pixel) / img_height
                        yolo_class_id = int(class_id_str) - 1
                        yolo_lines.append(
                            f"{yolo_class_id} {x_center_norm} {y_center_norm} {width_norm} {height_norm}"
                        )
                    except ValueError:
                        continue

        if yolo_lines:
            
            output_txt_path = os.path.join(OUTPUT_DIR, prefix + '.txt')
            with open(output_txt_path, 'w') as f_out:
                f_out.write('\n'.join(yolo_lines))

            
            shutil.copy(img_path, os.path.join(OUTPUT_DIR, os.path.basename(img_path)))

            converted_count += 1

    return converted_count



total_converted = 0
for folder_name in ['Train']:
    full_source_path = os.path.join(DLR_ROOT_DIR, folder_name)
    if os.path.exists(full_source_path):
        print(f"Converting files in '{folder_name}' folder...")
        count = convert_samp_folder(full_source_path)
        total_converted += count
        print(f"Converted {count} image groups.")
    else:
        print(f"Warning: Folder '{full_source_path}' not found.")

print(f"\nConversion complete! Total image groups converted: {total_converted}")
print(f"New .txt labels and .JPG images are in the '{OUTPUT_DIR}' folder.")
