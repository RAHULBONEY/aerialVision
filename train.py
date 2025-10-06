from ultralytics import YOLO
model =YOLO('yolov8n.pt')
results = model.train(
   data='datasets/traffic_data/data.yaml', 
   epochs=50,                              
   imgsz=640,                              
   project='traffic_monitoring_runs',      
   name='first_aerial_run'                 
)#hello2
print("Training complete!new model is saved in the 'traffic_monitoring_runs' folder.")