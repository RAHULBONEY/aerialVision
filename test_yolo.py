from ultralytics import YOLO
model = YOLO('yolov8n.pt') 
source_image = 'testimage.jpg'
results = model(source_image)
for r in results:
    r.show() 
#hello
print("Detection complete!")