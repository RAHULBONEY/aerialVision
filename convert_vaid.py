import xml.etree.ElementTree as ET
import os


XML_DIR = r'C:\Users\RAHUL BONEY\Downloads\Annotations'
OUTPUT_DIR = 'datasets/vaid_converted_labels'


CLASSES = ['sedan', 'minibus', 'truck', 'pickup', 'bus', 'cement truck', 'trailer'] 

#hello3

os.makedirs(OUTPUT_DIR, exist_ok=True)

def convert_xml_to_yolo(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()

    size = root.find('size')
    img_width = int(size.find('width').text)
    img_height = int(size.find('height').text)

    yolo_lines = []
    for obj in root.findall('object'):
        class_name_from_xml = obj.find('name').text 

        
        class_id = int(class_name_from_xml) - 1 
       

        bndbox = obj.find('bndbox')
        xmin = float(bndbox.find('xmin').text)
        ymin = float(bndbox.find('ymin').text)
        xmax = float(bndbox.find('xmax').text)
        ymax = float(bndbox.find('ymax').text)

        x_center = (xmin + xmax) / 2.0 / img_width
        y_center = (ymin + ymax) / 2.0 / img_height
        width = (xmax - xmin) / img_width
        height = (ymax - ymin) / img_height

        yolo_lines.append(f"{class_id} {x_center} {y_center} {width} {height}")

    return yolo_lines


xml_files = [f for f in os.listdir(XML_DIR) if f.endswith('.xml')]
for xml_file in xml_files:
    full_xml_path = os.path.join(XML_DIR, xml_file)
    yolo_data = convert_xml_to_yolo(full_xml_path)
    basename = os.path.splitext(xml_file)[0]
    output_txt_path = os.path.join(OUTPUT_DIR, basename + '.txt')
    with open(output_txt_path, 'w') as f:
        f.write('\n'.join(yolo_data))

print(f"Conversion complete! {len(xml_files)} files converted.")
print(f"New .txt labels are in the '{OUTPUT_DIR}' folder.")