import torch
import os
import yaml
from datetime import datetime
from pathlib import Path
from ultralytics import YOLO
import json

def get_model_info(model_path='best_v1_daytime.pt'):
    """
    Extract comprehensive information from YOLOv8 training checkpoint
    without running inference/testing.
    """
    
    print("=" * 70)
    print(f"YOLOv8 MODEL ANALYSIS: {model_path}")
    print("=" * 70)
    
    # File metadata
    print("\n📁 FILE METADATA")
    print("-" * 50)
    if os.path.exists(model_path):
        file_stats = os.stat(model_path)
        print(f"File name: {model_path}")
        print(f"File size: {file_stats.st_size / (1024*1024):.2f} MB")
        print(f"Created: {datetime.fromtimestamp(file_stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Modified: {datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print(f"❌ File {model_path} not found!")
        return
    
    # Load raw checkpoint to inspect internals
    print("\n🔍 CHECKPOINT INSPECTION")
    print("-" * 50)
    try:
        checkpoint = torch.load(model_path, map_location='cpu')
        print(f"Checkpoint keys: {list(checkpoint.keys())}")
        
        # Check for training arguments
        if 'train_args' in checkpoint:
            print(f"\n📝 Training Arguments found:")
            for key, value in checkpoint['train_args'].items():
                print(f"  {key}: {value}")
        
        # Check for date
        if 'date' in checkpoint:
            print(f"\n📅 Training Date: {checkpoint['date']}")
            
        # Check for version
        if 'version' in checkpoint:
            print(f"Ultralytics Version: {checkpoint['version']}")
            
        # Check for model metadata
        if 'model' in checkpoint and hasattr(checkpoint['model'], 'args'):
            model_args = checkpoint['model'].args
            print(f"\n🏗️  MODEL ARCHITECTURE ARGUMENTS")
            print(f"  Task: {model_args.task}")
            print(f"  Mode: {model_args.mode}")
            print(f"  Model scale: {model_args.model}")
            print(f"  Image size: {model_args.imgsz}")
            print(f"  Classes: {model_args.data}")
            
    except Exception as e:
        print(f"Could not inspect raw checkpoint: {e}")
    
    # Load via Ultralytics API for detailed info
    print("\n🧠 MODEL ARCHITECTURE ANALYSIS")
    print("-" * 50)
    try:
        model = YOLO(model_path)
        
        # Get model info
        info = model.info(detailed=True)
        print(f"Model task: {model.task}")
        print(f"Model type: {model.type}")
        
        # Try to get names
        if hasattr(model, 'names'):
            names = model.names
            print(f"\n📋 CLASSES ({len(names)} total):")
            for idx, name in names.items():
                print(f"  {idx}: {name}")
        
        # Extract training metadata if available
        print("\n📊 TRAINING METADATA")
        print("-" * 50)
        
        # Try to access trainer attributes or ckpt
        if hasattr(model, 'ckpt') and model.ckpt:
            ckpt = model.ckpt
            
            if 'train_args' in ckpt:
                args = ckpt['train_args']
                print(f"Epochs trained: {args.get('epochs', 'Unknown')}")
                print(f"Batch size: {args.get('batch', 'Unknown')}")
                print(f"Image size: {args.get('imgsz', 'Unknown')}")
                print(f"Device(s): {args.get('device', 'Unknown')}")
                print(f"Optimizer: {args.get('optimizer', 'Unknown')}")
                print(f"Learning rate: {args.get('lr0', 'Unknown')}")
                print(f"Weight decay: {args.get('weight_decay', 'Unknown')}")
                print(f"Data configuration: {args.get('data', 'Unknown')}")
                
                # Augmentation parameters
                print(f"\n🎨 AUGMENTATION PARAMETERS:")
                print(f"  Mosaic: {args.get('mosaic', 'Unknown')}")
                print(f"  Degrees: {args.get('degrees', 'Unknown')}")
                print(f"  Translate: {args.get('translate', 'Unknown')}")
                print(f"  Scale: {args.get('scale', 'Unknown')}")
                print(f"  HSV-H: {args.get('hsv_h', 'Unknown')}")
                print(f"  HSV-S: {args.get('hsv_s', 'Unknown')}")
                print(f"  HSV-V: {args.get('hsv_v', 'Unknown')}")
                
            # Check for metrics
            if 'metrics' in ckpt and ckpt['metrics']:
                print(f"\n📈 FINAL METRICS:")
                metrics = ckpt['metrics']
                for key, value in metrics.items():
                    if isinstance(value, (int, float)):
                        print(f"  {key}: {value:.4f}")
                    else:
                        print(f"  {key}: {value}")
            
            # Check for epoch number
            if 'epoch' in ckpt:
                print(f"\n⏱️  Completed Epochs: {ckpt['epoch']}")
                
            # Check for best fitness
            if 'best_fitness' in ckpt:
                print(f"Best Fitness: {ckpt['best_fitness']}")
                
            # Check for dataset info
            if 'train_metrics' in ckpt:
                print(f"Training metrics available: {ckpt['train_metrics']}")
                
    except Exception as e:
        print(f"Error loading with Ultralytics: {e}")
        import traceback
        traceback.print_exc()
    
    # Try to find and parse data.yaml for dataset info
    print("\n🗂️  DATASET INFORMATION (from data.yaml)")
    print("-" * 50)
    data_yaml_path = 'datasets/traffic_data/data.yaml'
    
    try:
        if os.path.exists(data_yaml_path):
            with open(data_yaml_path, 'r') as f:
                data_config = yaml.safe_load(f)
                
            print(f"Dataset config: {data_yaml_path}")
            print(f"Number of classes: {data_config.get('nc', 'Unknown')}")
            print(f"Class names: {data_config.get('names', [])}")
            
            # Check for train/val paths
            train_path = data_config.get('train', '')
            val_path = data_config.get('val', '')
            
            # Count images if paths exist
            def count_images(path):
                if not path or not os.path.exists(path):
                    return 0
                valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff')
                return len([f for f in os.listdir(path) if f.lower().endswith(valid_extensions)])
            
            # Resolve relative paths
            base_path = os.path.dirname(data_yaml_path)
            if train_path.startswith('./'):
                train_path = os.path.join(base_path, train_path[2:])
            if val_path.startswith('./'):
                val_path = os.path.join(base_path, val_path[2:])
            
            train_count = count_images(train_path)
            val_count = count_images(val_path)
            
            print(f"\nTraining images path: {train_path}")
            print(f"Training images count: {train_count}")
            print(f"Validation images path: {val_path}")
            print(f"Validation images count: {val_count}")
            print(f"Total images: {train_count + val_count}")
            
            # Check for labels
            labels_train = train_path.replace('images', 'labels')
            labels_val = val_path.replace('images', 'labels')
            
            if os.path.exists(labels_train):
                label_files = len([f for f in os.listdir(labels_train) if f.endswith('.txt')])
                print(f"Training labels: {label_files}")
            if os.path.exists(labels_val):
                label_files = len([f for f in os.listdir(labels_val) if f.endswith('.txt')])
                print(f"Validation labels: {label_files}")
                
        else:
            print(f"data.yaml not found at {data_yaml_path}")
    except Exception as e:
        print(f"Error parsing data.yaml: {e}")
    
    # Model architecture details
    print("\n🏗️  PARAMETRIC DETAILS")
    print("-" * 50)
    try:
        model = YOLO(model_path)
        if hasattr(model.model, 'model'):
            # Count layers and parameters
            total_params = sum(p.numel() for p in model.parameters())
            trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
            
            print(f"Total layers: {len(list(model.model.model.modules()))}")
            print(f"Total parameters: {total_params:,}")
            print(f"Trainable parameters: {trainable_params:,}")
            print(f"Model size: {total_params * 4 / (1024**2):.2f} MB (FP32)")
            
            # Try to get FLOPs if available
            try:
                dummy_input = torch.zeros(1, 3, 640, 640)
                from thop import profile
                flops, params = profile(model.model, inputs=(dummy_input,), verbose=False)
                print(f"FLOPs: {flops / 1e9:.2f} G")
            except ImportError:
                print("Install 'thop' (pip install thop) to calculate FLOPs")
            except Exception as e:
                print(f"Could not calculate FLOPs: {e}")
                
    except Exception as e:
        print(f"Error getting parametric details: {e}")
    
    print("\n" + "=" * 70)
    print("ANALYSIS COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    # Check for specific file first, then fall back to best.pt
    if os.path.exists('best_v1_daytime.pt'):
        get_model_info('best_v1_daytime.pt')
    elif os.path.exists('best.pt'):
        print("best_v1_daytime.pt not found, analyzing best.pt instead...")
        get_model_info('best.pt')
    else:
        print("No model file found! Looking for best_v1_daytime.pt or best.pt")