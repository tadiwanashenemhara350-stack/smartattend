from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from ml.predictor import predict_risk, get_risk_probability, get_risk_explanation, get_model_performance, get_feature_importance
import models

router = APIRouter(prefix="/analytics", tags=["analytics"])

def calculate_advanced_metrics(records, sessions):
    sorted_sessions = sorted(sessions, key=lambda s: s.date) if sessions else []
    record_map = {r.session_id: r.status for r in records if r.session_id}
    
    morning_absences = 0
    consecutive_absences = 0
    current_streak = 0
    
    for s in sorted_sessions:
        status = record_map.get(s.id)
        if not status:
            continue
            
        if status in ['Absent', 'Late']:
            current_streak += 1
            consecutive_absences = max(consecutive_absences, current_streak)
            if s.time_slot == '08:00-11:00':
                morning_absences += 1
        else:
            current_streak = 0
            
    return morning_absences, consecutive_absences

@router.get("/risk/{student_id}")
def get_student_risk(student_id: int, db: Session = Depends(get_db)):
    attendance_records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student_id
    ).all()
    
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == student_id).all()
    course_ids = [e.course_id for e in enrollments]
    
    sessions = []
    if course_ids:
        sessions = db.query(models.ModuleSession).filter(models.ModuleSession.course_id.in_(course_ids)).all()
        
    total_classes = len(sessions)
    
    classes_attended = len([r for r in attendance_records if r.status == "Present"])
    late_arrivals = len([r for r in attendance_records if r.status == "Late"])
    
    morning_absences, consecutive_absences = calculate_advanced_metrics(attendance_records, sessions)
    
    is_at_risk = predict_risk(total_classes, classes_attended, late_arrivals, morning_absences, consecutive_absences)
    risk_prob = get_risk_probability(total_classes, classes_attended, late_arrivals, morning_absences, consecutive_absences)
    explanation = get_risk_explanation(total_classes, classes_attended, late_arrivals, morning_absences, consecutive_absences)
    
    return {
        "student_id": student_id,
        "classes_attended": classes_attended,
        "total_classes": total_classes,
        "late_arrivals": late_arrivals,
        "morning_absences": morning_absences,
        "consecutive_absences": consecutive_absences,
        "is_at_risk": is_at_risk,
        "risk_probability": risk_prob,
        "explanation": explanation
    }

@router.get("/lecturer/{user_id}")
def get_lecturer_analytics(user_id: int, db: Session = Depends(get_db)):
    courses = db.query(models.Course).filter(models.Course.lecturer_id == user_id).all()
    course_ids = [c.id for c in courses]
    
    if not course_ids:
        return {
            "total_students": 0,
            "avg_attendance": 0,
            "reports_generated": 0,
            "at_risk_students": [],
            "module_rates": []
        }

    enrollments = db.query(models.Enrollment).filter(models.Enrollment.course_id.in_(course_ids)).all()
    unique_students = list(set([e.student_id for e in enrollments]))
    total_students = len(unique_students)

    records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.course_id.in_(course_ids)).all()
    
    total_records = len(records)
    present_records = len([r for r in records if r.status == "Present"])
    avg_attendance = round((present_records / total_records * 100)) if total_records > 0 else 100

    module_rates = []
    for c in courses:
        c_records = [r for r in records if r.course_id == c.id]
        c_total = len(c_records)
        c_present = len([r for r in c_records if r.status == "Present"])
        rate = round((c_present / c_total * 100)) if c_total > 0 else 100
        module_rates.append({"code": c.code, "name": c.name, "rate": rate, "id": c.id})

    at_risk_students = []
    students_data = db.query(models.User).filter(models.User.id.in_(unique_students)).all()
    student_map = {s.id: s for s in students_data}
    
    sessions = db.query(models.ModuleSession).filter(models.ModuleSession.course_id.in_(course_ids)).all()

    for s_id in unique_students:
        s_records = [r for r in records if r.student_id == s_id]
        s_classes = len(s_records)
        if s_classes == 0:
            continue
            
        s_present = len([r for r in s_records if r.status == "Present"])
        s_late = len([r for r in s_records if r.status == "Late"])
        
        # We need sessions specific to this student's courses to calculate streaks accurately
        s_course_ids = list(set([r.course_id for r in s_records]))
        s_sessions = [s for s in sessions if s.course_id in s_course_ids]
        
        morning_absences, consecutive_absences = calculate_advanced_metrics(s_records, s_sessions)
        
        risk_prob = get_risk_probability(s_classes, s_present, s_late, morning_absences, consecutive_absences)
        
        if risk_prob > 0.60:
            student_info = student_map.get(s_id)
            if student_info:
                at_risk_students.append({
                    "id": student_info.id,
                    "name": student_info.full_name or "Unknown",
                    "identifier": student_info.student_reg_number or student_info.email,
                    "risk": f"{round(risk_prob*100)}% High Risk"
                })

    return {
        "total_students": total_students,
        "avg_attendance": avg_attendance,
        "reports_generated": 12,
        "at_risk_students": at_risk_students,
        "module_rates": module_rates
    }

@router.get("/student_dashboard/{user_id}")
def get_student_dashboard_analytics(user_id: int, db: Session = Depends(get_db)):
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == user_id).all()
    course_ids = [e.course_id for e in enrollments]
    
    courses = []
    if course_ids:
        courses = db.query(models.Course).filter(models.Course.id.in_(course_ids)).all()

    modules_count = len(courses)
    
    programme_name = "Undecided Programme"
    level_name = "N/A"
    if courses:
        first_course = courses[0]
        if first_course.programme_id:
            prog = db.query(models.Programme).filter(models.Programme.id == first_course.programme_id).first()
            if prog:
                programme_name = prog.name
        level_name = first_course.level or "N/A"

    records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == user_id,
        models.AttendanceRecord.course_id.in_(course_ids)
    ).all() if course_ids else []

    session_count_per_course = {}
    sessions = []
    if course_ids:
        sessions = db.query(models.ModuleSession).filter(models.ModuleSession.course_id.in_(course_ids)).all()
        for s in sessions:
            session_count_per_course[s.course_id] = session_count_per_course.get(s.course_id, 0) + 1
            
    total_classes_possible = sum(session_count_per_course.values())
    classes_attended = len([r for r in records if r.status == "Present"])
    classes_missed = len([r for r in records if r.status == "Absent"])
    late_arrivals = len([r for r in records if r.status == "Late"])

    overall_rate = round((classes_attended / total_classes_possible) * 100) if total_classes_possible > 0 else 100

    enrolled_modules = []
    for c in courses:
        c_records = [r for r in records if r.course_id == c.id]
        c_total = session_count_per_course.get(c.id, 0)
        c_present = len([r for r in c_records if r.status == "Present"])
        rate = round((c_present / c_total * 100)) if c_total > 0 else 100
        enrolled_modules.append({
            "code": c.code,
            "name": c.name,
            "rate": rate
        })

    weekly_trend = []
    if course_ids and sessions:
        sorted_sessions = sorted(sessions, key=lambda s: s.date)
        session_dates = {s.id: s.date for s in sorted_sessions}
        
        from collections import defaultdict
        records_by_date = defaultdict(list)
        for r in records:
            if r.session_id and r.session_id in session_dates:
                records_by_date[session_dates[r.session_id]].append(r)
                
        running_possible = 0
        running_attended = 0
        
        sessions_by_date = defaultdict(list)
        for s in sorted_sessions:
            sessions_by_date[s.date].append(s)
            
        unique_dates = sorted(list(sessions_by_date.keys()))
        
        for date_val in unique_dates:
            date_sessions = sessions_by_date[date_val]
            running_possible += len(date_sessions)
            
            day_records = records_by_date.get(date_val, [])
            running_attended += len([r for r in day_records if r.status == "Present"])
            
            rate = round((running_attended / running_possible) * 100) if running_possible > 0 else 100
            weekly_trend.append(rate)
            
    if len(weekly_trend) > 10:
        step = len(weekly_trend) / 10
        weekly_trend = [weekly_trend[int(i*step)] for i in range(10)]
    elif len(weekly_trend) == 0:
        weekly_trend = [overall_rate] * 7

    if len(records) == 0:
        risk_classification = "Awaiting Logs"
        risk_description = "Attend your first class to begin trajectory analysis."
        trajectory = "Initializing"
        trajectory_description = "Machine learning models are awaiting baseline data."
    else:
        morning_absences, consecutive_absences = calculate_advanced_metrics(records, sessions)
        risk_prob = get_risk_probability(total_classes_possible, classes_attended, late_arrivals, morning_absences, consecutive_absences)
        explanation = get_risk_explanation(total_classes_possible, classes_attended, late_arrivals, morning_absences, consecutive_absences)
        
        if risk_prob > 0.60:
            risk_classification = "High Risk"
            risk_description = f"Critical: Model detects a {round(risk_prob*100)}% probability of trajectory failure based on historic data. {explanation}"
            trajectory = "Declining"
            trajectory_description = "Urgent Intervention Required. Your pattern mirrors historic dropout paths."
        elif risk_prob > 0.25:
            risk_classification = "Medium Risk"
            risk_description = f"Warning: {round(risk_prob*100)}% risk probability detected. {explanation}"
            trajectory = "Volatile"
            trajectory_description = "Recent inconsistencies indicate deviation from safe attendance boundaries."
        elif risk_prob < 0.05 and overall_rate >= 90:
            risk_classification = "Elite"
            risk_description = "Exceptional commitment detected. <5% historic failure risk. " + explanation
            trajectory = "Ascending"
            trajectory_description = "Maintaining optimal trajectories that mathematically align with top performers."
        else:
            risk_classification = "Low Risk"
            risk_description = "Solid statistical metrics. Your attendance model matches standard passing cohorts. " + explanation
            trajectory = "Stable"
            trajectory_description = "You are securely maintaining optimal thresholds."

    return {
        "programme": programme_name,
        "level": level_name,
        "overall_rate": overall_rate,
        "classes_attended": classes_attended,
        "classes_missed": classes_missed,
        "modules_count": modules_count,
        "enrolled_modules": enrolled_modules,
        "weekly_trend": weekly_trend,
        "ml_insights": {
            "risk_classification": risk_classification,
            "description": risk_description,
            "trajectory": trajectory,
            "trajectory_description": trajectory_description
        }
    }

@router.get("/performance")
def analytics_performance():
    """API endpoint to fetch model performance metrics."""
    return get_model_performance()

@router.get("/feature-importance")
def analytics_feature_importance():
    """API endpoint to fetch model feature importance."""
    return get_feature_importance()
