from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from ml.predictor import predict_risk, get_risk_probability
import models

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/risk/{student_id}")
def get_student_risk(student_id: int, db: Session = Depends(get_db)):
    attendance_records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student_id
    ).all()
    
    # Total classes is now the sum of sessions for enrolled courses
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == student_id).all()
    course_ids = [e.course_id for e in enrollments]
    total_classes = db.query(models.ModuleSession).filter(models.ModuleSession.course_id.in_(course_ids)).count() if course_ids else 0
    
    classes_attended = len([r for r in attendance_records if r.status == "Present"])
    late_arrivals = len([r for r in attendance_records if r.status == "Late"])
    
    is_at_risk = predict_risk(total_classes, classes_attended, late_arrivals)
    risk_prob = get_risk_probability(total_classes, classes_attended, late_arrivals)
    
    return {
        "student_id": student_id,
        "classes_attended": classes_attended,
        "total_classes": total_classes,
        "late_arrivals": late_arrivals,
        "is_at_risk": is_at_risk,
        "risk_probability": risk_prob
    }

@router.get("/lecturer/{user_id}")
def get_lecturer_analytics(user_id: int, db: Session = Depends(get_db)):
    # 1. Fetch courses taught by this lecturer
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

    # 2. Total students enrolled in these courses
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.course_id.in_(course_ids)).all()
    unique_students = list(set([e.student_id for e in enrollments]))
    total_students = len(unique_students)

    # 3. Attendance analytics
    records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.course_id.in_(course_ids)).all()
    
    total_records = len(records)
    present_records = len([r for r in records if r.status == "Present"])
    avg_attendance = round((present_records / total_records * 100)) if total_records > 0 else 100

    # 4. Module-specific rates
    module_rates = []
    for c in courses:
        c_records = [r for r in records if r.course_id == c.id]
        c_total = len(c_records)
        c_present = len([r for r in c_records if r.status == "Present"])
        rate = round((c_present / c_total * 100)) if c_total > 0 else 100
        module_rates.append({"code": c.code, "name": c.name, "rate": rate, "id": c.id})

    # 5. At-Risk students calculation
    at_risk_students = []
    # Fetch student metadata
    students_data = db.query(models.User).filter(models.User.id.in_(unique_students)).all()
    student_map = {s.id: s for s in students_data}

    from ml.predictor import get_risk_probability

    for s_id in unique_students:
        s_records = [r for r in records if r.student_id == s_id]
        s_classes = len(s_records) # Since dataset has Present, Late, and Absent rows
        if s_classes == 0:
            continue
            
        s_present = len([r for r in s_records if r.status == "Present"])
        s_late = len([r for r in s_records if r.status == "Late"])
        
        # ML model prediction
        risk_prob = get_risk_probability(s_classes, s_present, s_late)
        
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
        "reports_generated": 12, # Static placeholder 
        "at_risk_students": at_risk_students,
        "module_rates": module_rates
    }

@router.get("/student_dashboard/{user_id}")
def get_student_dashboard_analytics(user_id: int, db: Session = Depends(get_db)):
    # 1. Fetch student enrollments
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.student_id == user_id).all()
    course_ids = [e.course_id for e in enrollments]
    
    courses = []
    if course_ids:
        courses = db.query(models.Course).filter(models.Course.id.in_(course_ids)).all()

    modules_count = len(courses)
    
    # Extract overall programme and level (assuming they belong to a primary programme)
    programme_name = "Undecided Programme"
    level_name = "N/A"
    if courses:
        # Just grab the first mapped course's programme as the primary context
        first_course = courses[0]
        if first_course.programme_id:
            prog = db.query(models.Programme).filter(models.Programme.id == first_course.programme_id).first()
            if prog:
                programme_name = prog.name
        level_name = first_course.level or "N/A"

    # 2. Fetch attendance records
    records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == user_id,
        models.AttendanceRecord.course_id.in_(course_ids)
    ).all() if course_ids else []

    # Using real sessions for total classes
    session_count_per_course = {}
    if course_ids:
        sessions = db.query(models.ModuleSession).filter(models.ModuleSession.course_id.in_(course_ids)).all()
        for s in sessions:
            session_count_per_course[s.course_id] = session_count_per_course.get(s.course_id, 0) + 1
            
    total_classes_possible = sum(session_count_per_course.values())
    classes_attended = len([r for r in records if r.status == "Present"])
    classes_missed = len([r for r in records if r.status == "Absent"])

    overall_rate = round((classes_attended / total_classes_possible) * 100) if total_classes_possible > 0 else 100

    # 3. Enrolled Modules Array
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

    # 4. Weekly trend generation
    weekly_trend = []
    # Calculate real trend based on the Date of attendance
    if course_ids:
        # Get all sessions ordered by date
        sorted_sessions = sorted(sessions, key=lambda s: s.date)
        
        # We need a mapping from session_id to date to align records
        session_dates = {s.id: s.date for s in sorted_sessions}
        
        # Group records by date
        from collections import defaultdict
        records_by_date = defaultdict(list)
        for r in records:
            if r.session_id and r.session_id in session_dates:
                records_by_date[session_dates[r.session_id]].append(r)
                
        # To make a trend, let's take chronological unique dates and calculate running percentage
        running_possible = 0
        running_attended = 0
        
        sessions_by_date = defaultdict(list)
        for s in sorted_sessions:
            sessions_by_date[s.date].append(s)
            
        unique_dates = sorted(list(sessions_by_date.keys()))
        
        for date_val in unique_dates:
            date_sessions = sessions_by_date[date_val]
            running_possible += len(date_sessions)
            
            # calculate attended on this date
            day_records = records_by_date.get(date_val, [])
            running_attended += len([r for r in day_records if r.status == "Present"])
            
            rate = round((running_attended / running_possible) * 100) if running_possible > 0 else 100
            weekly_trend.append(rate)
            
    # If the trend has more than 7 points, just take the most recent 7 (or sample them)
    if len(weekly_trend) > 10:
        # Take 10 evenly spaced points
        step = len(weekly_trend) / 10
        weekly_trend = [weekly_trend[int(i*step)] for i in range(10)]
    elif len(weekly_trend) == 0:
        weekly_trend = [overall_rate] * 7

    # 5. ML Insights Logic powered by Scikit-Learn RandomForest
    if len(records) == 0:
        risk_classification = "Awaiting Logs"
        risk_description = "Attend your first class to begin trajectory analysis."
        trajectory = "Initializing"
        trajectory_description = "Machine learning models are awaiting baseline data."
    else:
        # Calculate lateness
        late_arrivals = len([r for r in records if r.status == "Late"])
        
        # Get true probability from our Random Forest Moddel
        risk_prob = get_risk_probability(total_classes_possible, classes_attended, late_arrivals)
        
        # Translate statistical probabilities to UI readable labels
        if risk_prob > 0.60:
            risk_classification = "High Risk"
            risk_description = f"Critical: Model detects a {round(risk_prob*100)}% probability of trajectory failure based on historic data."
            trajectory = "Declining"
            trajectory_description = "Urgent Intervention Required. Your pattern mirrors historic dropout paths."
        elif risk_prob > 0.25:
            risk_classification = "Medium Risk"
            risk_description = f"Warning: {round(risk_prob*100)}% risk probability detected. Consistency is faltering."
            trajectory = "Volatile"
            trajectory_description = "Recent inconsistencies indicate deviation from safe attendance boundaries."
        elif risk_prob < 0.05 and overall_rate >= 90:
            risk_classification = "Elite"
            risk_description = "Exceptional commitment detected. <5% historic failure risk."
            trajectory = "Ascending"
            trajectory_description = "Maintaining optimal trajectories that mathematically align with top performers."
        else:
            risk_classification = "Low Risk"
            risk_description = "Solid statistical metrics. Your attendance model matches standard passing cohorts."
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
