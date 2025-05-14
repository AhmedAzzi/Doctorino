import os
import sys
import uuid
import base64

import numpy as np
import torch
import matplotlib.pyplot as plt
from datetime import datetime
from io import BytesIO
from fastapi import UploadFile, HTTPException, status
from core.config import settings


current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, '..'))

class LSTM(torch.nn.Module):
    def __init__(self, num_classes=5):
        super(LSTM, self).__init__()
        
        # CNN layers
        self.first_conv = torch.nn.Conv1d(in_channels=1, out_channels=4, kernel_size=21)
        self.second_conv = torch.nn.Conv1d(in_channels=4, out_channels=16, kernel_size=23)
        self.third_conv = torch.nn.Conv1d(in_channels=16, out_channels=32, kernel_size=25)
        self.fourth_conv = torch.nn.Conv1d(in_channels=32, out_channels=64, kernel_size=27)
        
        # LSTM layer
        self.lstm_layer = torch.nn.LSTM(input_size=64, hidden_size=50, batch_first=True)
        
        # Dense layers
        self.first_dense = torch.nn.Linear(50, 128)
        self.final_dense = torch.nn.Linear(128, num_classes)
        
        # Activation functions
        self.relu = torch.nn.ReLU()
        
    def forward(self, x):
        # Reshape input if it's not already in the right shape
        if len(x.shape) == 2:  # [batch_size, seq_length]
            x = x.unsqueeze(1)  # Add channel dimension [batch_size, 1, seq_length]
        
        # Apply padding to ensure the input is long enough for the convolutions
        padding = 92
        x_padded = torch.nn.functional.pad(x, (padding//2, padding//2))
        
        # CNN layers
        x = self.relu(self.first_conv(x_padded))
        x = self.relu(self.second_conv(x))
        x = self.relu(self.third_conv(x))
        x = self.relu(self.fourth_conv(x))
        
        # Reshape for LSTM: [batch_size, seq_length, features]
        x = x.permute(0, 2, 1)
        
        # LSTM layer
        x, _ = self.lstm_layer(x)
        
        # Take the output from the last time step
        x = x[:, -1, :]
        
        # Dense layers
        x = self.relu(self.first_dense(x))
        x = self.final_dense(x)
        
        return x

# Initialize device and model variables
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
model = None
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
model_path = os.path.join(base_dir, 'backend/models/ecg/heart_signal_model.pt')

def load_ecg_model():
    """Load the ECG model on demand"""
    global model
    
    # If model is already loaded, return it
    if model is not None:
        return model
    
    # Initialize the model
    model = LSTM()
    print(f"Looking for ECG model at: {model_path}")
    
    try:
        # Check if the model file exists
        if not os.path.exists(model_path):
            print(f"Warning: ECG model file not found at {model_path}")
            # Create a dummy model for testing
            model.eval()
            print("Using uninitialized model for demo purposes")
            return model
        
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.eval()
        print(f"ECG model loaded successfully from {model_path}")
    except Exception as e:
        print(f"Warning: Could not load ECG model: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return uninitialized model for demo purposes
        model.eval()
        print("Using uninitialized model for demo purposes")
    
    return model

# Class mapping for ECG classification
CLASS_MAPPING = {
    0: 'Normal Beat (N)',
    1: 'Atrial Premature Beat (A)',
    2: 'Ventricular Premature Beat (V)',
    3: 'Left Bundle Branch Block Beat (L)',
    4: 'Right Bundle Branch Block Beat (R)'
}

# Helper functions for file uploads
def generate_unique_id():
    """Generates a unique identifier (e.g., for file names)."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Add more randomness with uuid
    return f"{timestamp}_{uuid.uuid4().hex[:8]}"

async def save_uploaded_file(file: UploadFile, folder: str) -> str:
    """
    Save an uploaded file to the specified folder.
    
    Args:
        file: The uploaded file
        folder: The subfolder to save the file in (e.g., "reports", "ecg", etc.)
        
    Returns:
        The relative path to the saved file
    """
    # Check file size against max upload size
    file_size = 0
    contents = await file.read()
    file_size = len(contents)
    await file.seek(0)  # Reset file position
    
    if file_size > settings.max_upload_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size of {settings.max_upload_size} bytes"
        )
    
    # Create the upload directory if it doesn't exist
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), settings.upload_folder, folder)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate a unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{generate_unique_id()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    
    # Return the relative path (for database storage)
    return os.path.join(settings.upload_folder, folder, unique_filename)

def get_file_path(relative_path: str) -> str:
    """
    Convert a relative file path to an absolute path.
    
    Args:
        relative_path: The relative path stored in the database
        
    Returns:
        The absolute path to the file
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Handle case where the path might not include the upload folder prefix
    if not relative_path.startswith(settings.upload_folder):
        # Check if it's a legacy path that starts with "uploads"
        if relative_path.startswith("uploads") and settings.upload_folder != "uploads":
            # Replace the old "uploads" prefix with the new upload folder setting
            relative_path = relative_path.replace("uploads", settings.upload_folder, 1)
    
    return os.path.join(base_dir, relative_path)

def process_ecg_data(data):
    """Process ECG data using dynamic settings from config."""
    try:
        # Apply Kalman filter denoising with settings from config
        kf_settings = settings.kalman_filter
        denoised_data = hierarchical_kalman_filter(
            data, 
            kf_settings.Q1, 
            kf_settings.R1, 
            kf_settings.Q2, 
            kf_settings.R2
        )
        
        # Plot original and denoised signals using settings from config
        plt.figure(figsize=settings.plot_figsize)
        plt.subplot(2, 1, 1)
        plt.plot(data[:settings.plot_sample_size])
        plt.title('Original ECG Signal')
        plt.subplot(2, 1, 2)
        plt.plot(denoised_data[:settings.plot_sample_size])
        plt.title('Denoised ECG Signal')
        
        # Save plot to bytes buffer
        buffer = BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        image_png = buffer.getvalue()
        buffer.close()
        plt.close()  # Close the figure to free memory
        
        # Encode the image
        graph = base64.b64encode(image_png).decode('utf-8')
        
        return denoised_data, graph
    except Exception as e:
        print(f"Error processing ECG data: {str(e)}")
        return None, None

def predict_segment(segment):
    """Make prediction on a single ECG segment."""
    try:
        # Load the model if not already loaded
        ecg_model = load_ecg_model()
        
        # Check if model was loaded successfully
        if ecg_model is None:
            print("Warning: ECG model is None, returning default prediction")
            # Return a default prediction (Normal Beat)
            default_probs = np.zeros(5)
            default_probs[0] = 1.0  # 100% confidence in Normal Beat
            return 0, default_probs
        
        # Ensure the model is on the same device as the segment tensor
        ecg_model.to(device)
        
        with torch.no_grad():
            # Convert the segment to a tensor and move it to the correct device
            segment_tensor = torch.tensor(segment, dtype=torch.float32).unsqueeze(0).to(device)
            
            # Make the prediction
            prediction = ecg_model(segment_tensor)
            
            # Get the predicted class and probabilities
            predicted_class = torch.argmax(prediction, dim=1).item()
            probabilities = torch.nn.functional.softmax(prediction, dim=1)[0]
            
            return predicted_class, probabilities.cpu().numpy()
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a default prediction (Normal Beat)
        default_probs = np.zeros(5)
        default_probs[0] = 1.0  # 100% confidence in Normal Beat
        return 0, default_probs

def calculate_final_prediction(predictions):
    """Calculate the most likely class, distribution, and average probabilities."""
    from collections import Counter
    
    class_counts = Counter(pred['prediction'] for pred in predictions)
    final_class = max(class_counts, key=class_counts.get)
    confidence = (class_counts[final_class] / len(predictions)) * 100

    # Aggregate probabilities
    total_probabilities = {cls: 0 for cls in CLASS_MAPPING.values()}
    for prediction in predictions:
        for cls, prob in prediction['probabilities'].items():
            total_probabilities[cls] += prob

    average_probabilities = {cls: prob / len(predictions) for cls, prob in total_probabilities.items()}

    return {
        'class': final_class,
        'confidence': round(confidence, 2),
        'distribution': class_counts,
        'average_probabilities': average_probabilities
    }


def hierarchical_kalman_filter(signal, Q1=0.001, R1=10, Q2=0.001, R2=1):
    """
    Apply a hierarchical Kalman filter to denoise an ECG signal.
    
    Args:
        signal (numpy.ndarray): The input ECG signal
        Q1 (float): Process noise covariance for the first filter
        R1 (float): Measurement noise covariance for the first filter
        Q2 (float): Process noise covariance for the second filter
        R2 (float): Measurement noise covariance for the second filter
        
    Returns:
        numpy.ndarray: The denoised ECG signal
    """
    # First Kalman filter (coarse filtering)
    n = len(signal)
    filtered_signal1 = np.zeros(n)
    
    x_hat = signal[0]  # Initial state estimate
    p = 1.0  # Initial error covariance
    
    for i in range(n):
        # Prediction
        x_hat_minus = x_hat
        p_minus = p + Q1
        
        # Update
        K = p_minus / (p_minus + R1)  # Kalman gain
        x_hat = x_hat_minus + K * (signal[i] - x_hat_minus)
        p = (1 - K) * p_minus
        
        filtered_signal1[i] = x_hat
    
    # Second Kalman filter (fine filtering)
    filtered_signal2 = np.zeros(n)
    
    x_hat = filtered_signal1[0]  # Initial state estimate
    p = 1.0  # Initial error covariance
    
    for i in range(n):
        # Prediction
        x_hat_minus = x_hat
        p_minus = p + Q2
        
        # Update
        K = p_minus / (p_minus + R2)  # Kalman gain
        x_hat = x_hat_minus + K * (filtered_signal1[i] - x_hat_minus)
        p = (1 - K) * p_minus
        
        filtered_signal2[i] = x_hat
    
    return filtered_signal2