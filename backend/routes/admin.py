from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from pathlib import Path

router = APIRouter(prefix="/admin", tags=["admin"])

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_PUBLIC_BG = PROJECT_ROOT / "frontend" / "public" / "bg.jpg"
FRONTEND_DIST_BG = PROJECT_ROOT / "frontend" / "dist" / "bg.jpg"

@router.post("/upload-bg")
async def upload_global_bg(file: UploadFile = File(...)):
    try:
        content = await file.read()
        updated_any = False

        for path in (FRONTEND_PUBLIC_BG, FRONTEND_DIST_BG):
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "wb") as f:
                f.write(content)
            updated_any = True

        if not updated_any:
            raise RuntimeError("No writable frontend asset path found")

        return {"message": "Global background updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- PROGRAMMES ---
@router.get("/programmes", response_model=list[schemas.ProgrammeResponse])
def get_programmes(db: Session = Depends(get_db)):
    return db.query(models.Programme).all()

@router.post("/programmes", response_model=schemas.ProgrammeResponse)
def create_programme(prog: schemas.ProgrammeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Programme).filter(models.Programme.name == prog.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Programme already exists")
    
    new_prog = models.Programme(name=prog.name, levels=prog.levels)
    db.add(new_prog)
    db.commit()
    db.refresh(new_prog)
    return new_prog

@router.delete("/programmes/{prog_id}")
def delete_programme(prog_id: int, db: Session = Depends(get_db)):
    prog = db.query(models.Programme).filter(models.Programme.id == prog_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Programme not found")
    
    # Cascading Delete: Courses belonging to this programme
    db.query(models.Course).filter(models.Course.programme_id == prog_id).delete()

    db.delete(prog)
    db.commit()
    return {"message": "Programme deleted"}

# --- SYSTEM SETTINGS ---
@router.get("/settings", response_model=list[schemas.SystemSettingResponse])
def get_settings(db: Session = Depends(get_db)):
    return db.query(models.SystemSetting).all()

@router.post("/settings")
def update_settings(settings: list[schemas.SystemSettingUpdate], db: Session = Depends(get_db)):
    for setting_in in settings:
        setting_db = db.query(models.SystemSetting).filter(models.SystemSetting.key == setting_in.key).first()
        if setting_db:
            setting_db.value = setting_in.value
        else:
            new_setting = models.SystemSetting(key=setting_in.key, value=setting_in.value)
            db.add(new_setting)
    db.commit()
    return {"message": "Settings updated"}

# --- COURSES / MODULES ---
@router.get("/courses", response_model=list[schemas.CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    return db.query(models.Course).all()

@router.post("/courses", response_model=schemas.CourseResponse)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Course).filter(models.Course.code == course.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")
    
    new_course = models.Course(
        code=course.code,
        name=course.name,
        programme_id=course.programme_id,
        level=course.level,
        lecturer_id=course.lecturer_id,
        day_of_week=course.day_of_week,
        time_slot=course.time_slot,
        start_date=course.start_date,
        end_date=course.end_date
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.delete("/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Cascading Delete: Enrollments and Attendance Records
    db.query(models.Enrollment).filter(models.Enrollment.course_id == course_id).delete()
    db.query(models.AttendanceRecord).filter(models.AttendanceRecord.course_id == course_id).delete()

    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}

# --- ENROLLMENTS ---
@router.get("/enrollments/{course_id}", response_model=list[schemas.EnrollmentResponse])
def get_enrollments(course_id: int, db: Session = Depends(get_db)):
    return db.query(models.Enrollment).filter(models.Enrollment.course_id == course_id).all()

@router.post("/enrollments")
def create_enrollments(enrollment_data: schemas.EnrollmentCreate, db: Session = Depends(get_db)):
    course_id = enrollment_data.course_id
    # Remove existing enrollments to replace them completely
    db.query(models.Enrollment).filter(models.Enrollment.course_id == course_id).delete()
    
    # Add new ones
    for s_id in enrollment_data.student_ids:
        new_enrollment = models.Enrollment(student_id=s_id, course_id=course_id)
        db.add(new_enrollment)
        
    db.commit()
    return {"message": "Enrollments updated"}

# --- UTILITY FOR STUDENTS ---
@router.get("/students", response_model=list[schemas.UserResponse])
def get_all_students(db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.role == "student").all()
