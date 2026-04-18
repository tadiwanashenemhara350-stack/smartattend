def predict_risk(total_classes: int, classes_attended: int, late_arrivals: int) -> bool:
    if total_classes == 0:
        return False
    
    attendance_ratio = classes_attended / total_classes
    
    # Simple Python heuristic rule-engine acting as risk classifier
    if attendance_ratio < 0.7:
        return True # High risk
        
    if late_arrivals > (total_classes * 0.2):
        return True # Too many late arrivals
        
    return False
