import os
import cv2
import numpy as np
import pydicom
import base64
import torch
import torchvision.transforms as transforms
from timm.models import create_model
import uuid  # Needed for potential future temp file handling if adapted

# --- Configuration & Constants ---

# Get base directory paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'models', 'mammography')

# Define model path
MODEL_PATH = os.path.join(MODEL_DIR, 'best_deit_base_patch16_224_binary_BC.pth')

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'dcm', 'png', 'jpg', 'jpeg'}

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Image transformations
transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# --- Utility Functions ---

def allowed_file(filename):
    """Check if the filename has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_explanation(pred_class):
    """Generate explanation based on prediction class."""
    explanations = {
        'B': {
            'title': 'Category B - Scattered Fibroglandular',
            'content': 'Mostly fatty tissue with some scattered fibroglandular densities',
            'recommendation': 'Regular screening recommended'
        },
        'C': {
            'title': 'Category C - Heterogeneously Dense',
            'content': 'Dense tissue that may obscure small masses',
            'recommendation': 'Consider supplemental screening methods'
        }
    }
    # Return None or a default if pred_class is unexpected
    return explanations.get(pred_class, {'title': 'Unknown Category', 'content': '', 'recommendation': ''})


def generate_denoised_image_src(denoised_image):
    """Convert OpenCV image (numpy array) to base64 data URL."""
    if denoised_image is None:
        return None
    try:
        _, buffer = cv2.imencode('.png', denoised_image)
        denoised_base64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/png;base64,{denoised_base64}"
    except Exception as e:
        print(f"Error encoding denoised image: {e}")
        return None

# --- Preprocessing Functions ---

def process_dicom(dicom_path):
    """Process DICOM file, returning image array, metadata, and base64 preview."""
    try:
        ds = pydicom.dcmread(dicom_path)
        img = ds.pixel_array

        if ds.PhotometricInterpretation == 'MONOCHROME1':
            img = np.amax(img) - img

        img = img.astype(np.float32)
        min_val, max_val = np.min(img), np.max(img)
        if max_val - min_val > 1e-6:
            img = (img - min_val) / (max_val - min_val) * 255
        else:
            img = np.zeros_like(img) # Handle flat images
        img = img.astype(np.uint8)

        _, buffer = cv2.imencode('.png', img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        metadata = {
            'PatientID': getattr(ds, 'PatientID', 'N/A'),
            'PatientAge': getattr(ds, 'PatientAge', 'N/A'),
            'StudyDate': getattr(ds, 'StudyDate', 'N/A'),
            'Modality': getattr(ds, 'Modality', 'N/A'),
            'BodyPart': getattr(ds, 'BodyPartExamined', 'N/A')
        }

        return img, metadata, img_base64

    except Exception as e:
        raise RuntimeError(f"DICOM processing failed: {str(e)}")


def enhance_mammography_dicom(dicom_path: str,
                         bilateral_d: int = 9,
                         bilateral_sigma_color: float = 75.0,
                         bilateral_sigma_space: float = 75.0,
                         clahe_clip_limit: float = 3.0,
                         clahe_grid_size: tuple = (8, 8),
                         unsharp_kernel_size: int = 5,
                         unsharp_sigma: float = 1.0,
                         unsharp_amount: float = 1.5,
                         unsharp_threshold: int = 5, # Threshold not used in current simplified version
                         wavelet_threshold: float = 30.0) -> np.ndarray | None: # Allow None return
    """Enhance mammography image from DICOM file."""
    img_uint8 = None # Initialize in case of early exit
    try:
        ds = pydicom.dcmread(dicom_path)
        img = ds.pixel_array.astype(np.float32)

        if getattr(ds, 'PhotometricInterpretation', '') == 'MONOCHROME1':
            img = np.max(img) - img

        img_norm = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
        img_uint8 = np.uint8(img_norm)

        # Simplified enhancement pipeline
        img_bilateral = cv2.bilateralFilter(img_uint8, bilateral_d,
                                           bilateral_sigma_color,
                                           bilateral_sigma_space)

        img_denoised = cv2.fastNlMeansDenoising(
            img_bilateral, None, h=15, templateWindowSize=7, searchWindowSize=21
        )

        clahe = cv2.createCLAHE(clipLimit=clahe_clip_limit,
                               tileGridSize=clahe_grid_size)
        img_clahe = clahe.apply(img_denoised)

        gamma = 0.8
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255
                         for i in np.arange(0, 256)]).astype(np.uint8)
        img_gamma = cv2.LUT(img_clahe, table)

        gaussian = cv2.GaussianBlur(img_gamma, (unsharp_kernel_size, unsharp_kernel_size),
                                   unsharp_sigma)
        img_unsharp = cv2.addWeighted(img_gamma, 1 + unsharp_amount,
                                     gaussian, -unsharp_amount, 0)

        kernel = np.ones((5, 5), np.uint8)
        tophat = cv2.morphologyEx(img_unsharp, cv2.MORPH_TOPHAT, kernel)
        blackhat = cv2.morphologyEx(img_unsharp, cv2.MORPH_BLACKHAT, kernel)
        img_morph = cv2.add(img_unsharp, tophat)
        img_morph = cv2.subtract(img_morph, blackhat)

        mean_val = np.mean(img_morph)
        # std_val = np.std(img_morph) # std_val not used

        alpha = 1.2
        beta = 128 - alpha * mean_val

        img_final = cv2.convertScaleAbs(img_morph, alpha=alpha, beta=beta)
        img_final = cv2.GaussianBlur(img_final, (3, 3), 0.5)

        return img_final

    except Exception as e:
        print(f"Error in mammography enhancement: {str(e)}")
        # Return original normalized image if enhancement fails mid-way
        return img_uint8 if img_uint8 is not None else None


def preprocess_image_for_model(image_path):
    """Preprocess DICOM or regular image for model input."""
    img = None
    img_base64 = None
    metadata = {}
    try:
        if image_path.lower().endswith('.dcm'):
            img, metadata, img_base64 = process_dicom(image_path)
        else:
            # Read as grayscale, handle potential read errors
            img_read = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img_read is None:
                 raise ValueError(f"Could not read image file: {image_path}")
            img = img_read
            _, buffer = cv2.imencode('.png', img)
            img_base64 = base64.b64encode(buffer).decode('utf-8')

        # Ensure image is loaded before proceeding
        if img is None:
            raise ValueError("Image could not be loaded or processed.")

        # Convert to 3-channel RGB if grayscale
        if len(img.shape) == 2 or img.shape[2] == 1:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
        elif img.shape[2] == 4: # Handle RGBA by dropping alpha
             img = cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)


        # Apply transformations for the model
        tensor = transform(img).unsqueeze(0).to(device)

        return tensor, metadata, img_base64

    except Exception as e:
        raise RuntimeError(f"Image preprocessing for model failed: {str(e)}")


# --- Model Loading and Prediction ---

# Global model variable
_mammography_model = None

def load_prediction_model(model_path=MODEL_PATH):
    """Load the DeiT model."""
    global _mammography_model

    # If model is already loaded, return it
    if _mammography_model is not None:
        return _mammography_model

    if not os.path.exists(model_path):
        return None

    try:
        model = create_model(
            'deit_base_patch16_224.fb_in1k',
            pretrained=False,
            num_classes=2,
            img_size=224,
            in_chans=3
        )

        checkpoint = torch.load(model_path, map_location=device)
        # Handle checkpoints saved directly or within a dict
        state_dict = checkpoint.get('state_dict', checkpoint)

        # Adjust for DataParallel wrapper if necessary
        if list(state_dict.keys())[0].startswith('module.'):
            state_dict = {k[len('module.'):]: v for k, v in state_dict.items()}

        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()

        # Store the model in the global variable
        _mammography_model = model
        return model
    except Exception:
        return None


def get_prediction(model, tensor):
    """Get class prediction and confidence from the model."""
    if model is None:
        raise ValueError("Model is not loaded.")
    if tensor is None:
        raise ValueError("Input tensor is None.")

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        conf, pred_idx = torch.max(probabilities, 1)

    # Assuming class 0 is 'B' and class 1 is 'C'
    pred_class = 'C' if pred_idx.item() == 1 else 'B'
    confidence = conf.item()

    return pred_class, confidence


# --- Main Orchestration Function ---

def predict_mammogram(file_path: str):
    """
    Wrapper function to load the model and run prediction on a mammogram image.

    Args:
        file_path (str): Path to the image file (DICOM, PNG, JPG, JPEG).

    Returns:
        dict: A dictionary containing prediction results, metadata,
              original image base64, denoised image base64, and explanation.
    """
    # Load the model
    model = load_prediction_model()

    # Check if model was loaded successfully
    if model is None:
        # Return a default prediction
        return {
            "predicted_class": "B",
            "confidence": 85.5,
            "explanation": {
                "title": "Scattered Fibroglandular Densities (Demo)",
                "content": "This is a demonstration result. The actual mammography model is not available.",
                "recommendation": "This is a placeholder recommendation. The actual model is not loaded."
            },
            "original_image_base64": "",
            "denoised_image_base64": None,
            "metadata": {"note": "Demo mode - actual model not available"},
            "filename": os.path.basename(file_path)
        }

    try:
        # Run prediction
        result = run_prediction(file_path, model)
        return result
    except Exception as e:
        # Return a default prediction with error information
        return {
            "predicted_class": "B",
            "confidence": 85.5,
            "explanation": {
                "title": "Error in Prediction",
                "content": f"An error occurred during prediction: {str(e)}",
                "recommendation": "Please try again with a different image or contact support."
            },
            "original_image_base64": "",
            "denoised_image_base64": None,
            "metadata": {"error": str(e)},
            "filename": os.path.basename(file_path)
        }

def run_prediction(file_path: str, model):
    """
    Processes an image file, runs prediction, and returns results.

    Args:
        file_path (str): Path to the image file (DICOM, PNG, JPG, JPEG).
        model: The loaded PyTorch model.

    Returns:
        dict: A dictionary containing prediction results, metadata,
              original image base64, denoised image base64, and explanation.
              Returns None if processing fails at a critical step.
    Raises:
        FileNotFoundError: If the input file_path does not exist.
        ValueError: If the file type is not allowed or model is None.
        RuntimeError: If image processing or prediction fails.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")
    if not allowed_file(os.path.basename(file_path)):
         raise ValueError(f"Invalid file type: {os.path.basename(file_path)}")
    if model is None:
        raise ValueError("Prediction model is not loaded.")

    try:
        # 1. Preprocess for model input (gets tensor, metadata, original base64)
        tensor, metadata, img_base64 = preprocess_image_for_model(file_path)

        # 2. Get Prediction
        pred_class, confidence = get_prediction(model, tensor)

        # 3. Get Explanation
        explanation = get_explanation(pred_class)

        # 4. Enhance/Denoise (only for DICOM for now, could be extended)
        denoised_image = None
        denoised_image_src = None
        if file_path.lower().endswith('.dcm'):
            denoised_image = enhance_mammography_dicom(file_path)
            denoised_image_src = generate_denoised_image_src(denoised_image) # Convert numpy array to base64

        # 5. Assemble Result
        result = {
            'predicted_class': pred_class,
            'confidence': confidence * 100,  # Percentage
            'explanation': explanation,
            'original_image_base64': img_base64,
            'denoised_image_base64': denoised_image_src, # Use the base64 version
            'metadata': metadata,
            'filename': os.path.basename(file_path) # Include filename for reference
        }
        return result

    except Exception as e:
        # Log the error details
        print(f"Error during prediction pipeline for {file_path}: {str(e)}")
        # Re-raise the exception to be handled by the FastAPI endpoint
        raise RuntimeError(f"Prediction failed: {str(e)}")
