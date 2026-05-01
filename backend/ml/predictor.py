import joblib
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

MODEL_PATH = Path(__file__).resolve().parent / "attendance_model.joblib"

# Load model into memory once when module imports
try:
    rf_model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    rf_model = None

def _create_features(total_classes: int, classes_attended: int, late_arrivals: int, morning_absences: int, consecutive_absences: int) -> pd.DataFrame:
    attendance_ratio = classes_attended / total_classes if total_classes > 0 else 0
    late_ratio = late_arrivals / total_classes if total_classes > 0 else 0
    return pd.DataFrame([{
        'total_classes': total_classes,
        'classes_attended': classes_attended,
        'late_arrivals': late_arrivals,
        'attendance_ratio': attendance_ratio,
        'late_ratio': late_ratio,
        'morning_absences': morning_absences,
        'consecutive_absences': consecutive_absences
    }])

def predict_risk(total_classes: int, classes_attended: int, late_arrivals: int, morning_absences: int, consecutive_absences: int) -> bool:
    if total_classes == 0 or rf_model is None:
        return False
    
    features = _create_features(total_classes, classes_attended, late_arrivals, morning_absences, consecutive_absences)
    prediction = rf_model.predict(features)
    
    # Predict 1 means "at risk of failure/dropping off"
    return bool(prediction[0] == 1)

def get_risk_probability(total_classes: int, classes_attended: int, late_arrivals: int, morning_absences: int, consecutive_absences: int) -> float:
    """Returns the raw probability of failure for dashboard UI."""
    if total_classes == 0 or rf_model is None:
        return 0.0
        
    features = _create_features(total_classes, classes_attended, late_arrivals, morning_absences, consecutive_absences)
    probabilities = rf_model.predict_proba(features)
    return float(probabilities[0][1])

def get_risk_explanation(total_classes: int, classes_attended: int, late_arrivals: int, morning_absences: int, consecutive_absences: int) -> str:
    """Explainable AI: Identifies the driving factor for the risk."""
    if total_classes == 0 or rf_model is None:
        return "Insufficient data for explanation."
        
    attendance_ratio = classes_attended / total_classes if total_classes > 0 else 0
    late_ratio = late_arrivals / total_classes if total_classes > 0 else 0
    
    # Simple heuristic-based XAI using domain knowledge aligned with trained features
    reasons = []
    
    if attendance_ratio < 0.70:
        reasons.append(f"Low overall attendance ({round(attendance_ratio*100)}%)")
    
    if consecutive_absences >= 3:
        reasons.append(f"A streak of {consecutive_absences} consecutive missed classes")
    elif consecutive_absences == 2:
        reasons.append("Recent consecutive absences")
        
    if morning_absences >= 2:
        reasons.append(f"Frequent absences in morning classes ({morning_absences} missed)")
        
    if late_ratio > 0.20:
        reasons.append(f"High lateness rate ({round(late_ratio*100)}% of classes)")
        
    if reasons:
        return "Risk factors: " + ", ".join(reasons) + "."
    return "Trajectory appears stable, but minor inconsistencies detected."

def get_model_performance():
    """Returns model performance metrics like accuracy, precision, recall, and confusion matrix."""
    if rf_model is None:
        return {"error": "Model not loaded."}

    data_path = Path(__file__).resolve().parent / "training_data.csv"
    if not data_path.exists():
        return {"error": "Training data not found."}

    df = pd.read_csv(data_path)
    X = df[['total_classes', 'classes_attended', 'late_arrivals', 'attendance_ratio', 'late_ratio', 'morning_absences', 'consecutive_absences']]
    y = df['is_failed']

    y_pred = rf_model.predict(X)
    report = classification_report(y, y_pred, output_dict=True)
    cm = confusion_matrix(y, y_pred)

    return {
        "classification_report": report,
        "confusion_matrix": cm.tolist()
    }

def get_feature_importance():
    """Returns the feature importance of the model."""
    if rf_model is None or not hasattr(rf_model, 'feature_importances_'):
        return {"error": "Model does not support feature importance."}

    feature_importances = pd.DataFrame(
        rf_model.feature_importances_,
        index=['total_classes', 'classes_attended', 'late_arrivals', 'attendance_ratio', 'late_ratio', 'morning_absences', 'consecutive_absences'],
        columns=['importance']
    ).sort_values('importance', ascending=False)

    return feature_importances.to_dict()
