from ultralytics import YOLO


print("Loading yolov8m.pt model...")
model = YOLO('yolov8m.pt') 

print("Starting model training...")


results = model.train(
   data='datasets/traffic_data/data.yaml', 
   epochs=100,            
   imgsz=640,
   project='traffic_monitoring_runs',      
   name='first_aerial_run',
   
   
   mosaic=1.0,     
   degrees=10.0,   
   translate=0.1,  
   scale=0.1,     
   hsv_h=0.015,    
   hsv_s=0.7,      
   hsv_v=0.4       
)

print("Training complete! Your new model is saved in the 'traffic_monitoring_runs' folder.")