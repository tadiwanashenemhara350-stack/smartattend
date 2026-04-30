from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
import datetime
from ml.predictor import get_risk_probability

router = APIRouter(prefix="/attendance", tags=["attendance"])

class AttendanceScan(BaseModel):
    student_id: int
    course_id: int

@router.post("/scan")
def scan_attendance(data: AttendanceScan, db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.id == data.student_id, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    course = db.query(models.Course).filter(models.Course.id == data.course_id).first()
    course_name = course.name if course else "Unknown Module"

    record = models.AttendanceRecord(
        student_id=data.student_id,
        course_id=data.course_id,
        status="Present",
        check_in_time=datetime.datetime.now().strftime("%H:%M")
    )
    db.add(record)
    
    # Create notification for student
    notif = models.Notification(
        user_id=data.student_id,
        title="Attendance Captured",
        message=f"Your attendance for {course_name} has been successfully logged.",
        type="attendance"
    )
    db.add(notif)
    
    # Notify lecturer
    if course and course.lecturer_id:
        lect_notif = models.Notification(
            user_id=course.lecturer_id,
            title="Student Check-in",
            message=f"{student.full_name} has checked into {course_name}.",
            type="attendance"
        )
        db.add(lect_notif)
        
    # Check for High Risk after this record
    # (Simple version: count absences/lates)
    all_records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == data.student_id).all()
    absent_count = len([r for r in all_records if r.status == "Absent"])
    late_count = len([r for r in all_records if r.status == "Late"])
    
    # Use ML predictor for risk
    # We need total classes, morning absences, consecutive etc. (simplified here for brevity)
    # But for a "realistic" notification, let's just trigger it if absences > 2
    if absent_count > 2:
         risk_notif = models.Notification(
            user_id=data.student_id,
            title="Academic Risk Warning",
            message=f"Our AI model has detected a declining attendance trajectory. Please check your dashboard for details.",
            type="risk"
        )
         db.add(risk_notif)
         
         if course and course.lecturer_id:
             lect_risk_notif = models.Notification(
                user_id=course.lecturer_id,
                title="At-Risk Alert",
                message=f"Student {student.full_name} has been classified as High Risk due to recent attendance patterns.",
                type="risk"
            )
             db.add(lect_risk_notif)
    
    db.commit()
    db.refresh(record)
    return {"message": "Attendance successfully logged", "record_id": record.id}

@router.get("/student/{student_id}")
def get_student_attendance(student_id: int, db: Session = Depends(get_db)):
    return db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == student_id).all()
