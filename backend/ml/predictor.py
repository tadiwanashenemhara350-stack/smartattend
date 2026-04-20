import joblib
from pathlib import Path
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "attendance_model.joblib"

# Load model into memory once when module imports
try:
    rf_model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    rf_model = None

def predict_risk(total_classes: int, classes_attended: int, late_arrivals: int) -> bool:
    if total_classes == 0 or rf_model is None:
        return False
    
    attendance_ratio = classes_attended / total_classes
    late_ratio = late_arrivals / total_classes
    
    # Create single-row dataframe with appropriate feature names
    features = pd.DataFrame([{
        'total_classes': total_classes,
        'classes_attended': classes_attended,
        'late_arrivals': late_arrivals,
        'attendance_ratio': attendance_ratio,
        'late_ratio': late_ratio
    }])
    
    prediction = rf_model.predict(features)
    
    # Predict 1 means "at risk of failure/dropping off"
    return bool(prediction[0] == 1)

def get_risk_probability(total_classes: int, classes_attended: int, late_arrivals: int) -> float:
    \"\"\"Returns the raw probability of failure for dashboard UI.\"\"\"
    if total_classes == 0 or rf_model is None:
        return 0.0
        
    attendance_ratio = classes_attended / total_classes
    late_ratio = late_arrivals / total_classes
    
    features = pd.DataFrame([{
        'total_classes': total_classes,
        'classes_attended': classes_attended,
        'late_arrivals': late_arrivals,
        'attendance_ratio': attendance_ratio,
        'late_ratio': late_ratio
    }])
    
    # predict_proba returns [[prob_class_0, prob_class_1]]
    probabilities = rf_model.predict_proba(features)
    return float(probabilities[0][1])

