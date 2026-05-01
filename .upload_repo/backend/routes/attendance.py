from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel

router = APIRouter(prefix="/attendance", tags=["attendance"])

class AttendanceScan(BaseModel):
    student_id: int
    course_id: int

@router.post("/scan")
def scan_attendance(data: AttendanceScan, db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.id == data.student_id, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    record = models.AttendanceRecord(
        student_id=data.student_id,
        course_id=data.course_id,
        status="Present"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "Attendance successfully logged", "record_id": record.id}

@router.get("/student/{student_id}")
def get_student_attendance(student_id: int, db: Session = Depends(get_db)):
    return db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == student_id).all()
