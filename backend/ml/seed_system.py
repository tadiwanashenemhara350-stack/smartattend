import os
import sys
import csv
from datetime import datetime

# Adjust path so we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import engine, Base, SessionLocal
from sqlalchemy import text
from models import User, Course, ModuleSession, AttendanceRecord, Enrollment, Programme, SystemSetting
from utils import get_password_hash

DATA_CSV_PATH = os.path.join(os.path.dirname(__file__), "msu_attendance_2026_dirty.csv")

def run_seed():
    db = SessionLocal()
    
    # Check if database is already seeded with real data
    try:
        student_count = db.query(User).filter(User.role == 'student').count()
        if student_count > 100 and os.getenv("FORCE_RESEED") != "true":
            print("Database already seeded with real data. Skipping.")
            return
    except Exception:
        pass # tables might not exist yet
    
    print("Fetching existing admins...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT role, email, password_hash, full_name, is_active FROM users WHERE role IN ('super_admin', 'admin')"))
        
        # Store them in memory since we recreate DB
        admin_data = [
            {
                "role": row[0],
                "email": row[1],
                "password_hash": row[2],
                "full_name": row[3],
                "is_active": row[4]
            }
            for row in result
        ]
    
    print("Dropping all tables and recreating...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("Restoring admins...")
    for data in admin_data:
        db.add(User(**data))
    db.commit()

    print("Parsing CSV...")
    students = {} # reg_number -> User Object
    lecturers = {} # lecturer_id -> User Object
    courses = {} # name -> Course Object
    sessions = {} # (course_id, date, time_slot) -> ModuleSession Object

    default_hashed_password = get_password_hash("tadiwa0627")
    
    with open(DATA_CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        row_count = 0
        for row in reader:
            row_count += 1
            stud_id = row["Student_ID"]
            stud_name = row["Student_Name"]
            lect_id = row["Lecturer_ID"]
            lect_name = row["Lecturer_Name"]
            module = row["Module"]
            date_val = row["Date"]
            day_val = row["Day"]
            time_slot = row["Time_Slot"] # example: 08:00-11:00
            attendance = row["Attendance"] # Present, Absent, Late
            check_in_time = row["Check_In_Time"]
            faculty = row["Faculty"]
            year = row["Year"]
            
            if stud_id not in students:
                user = User(
                    role="student",
                    email=f"{stud_id.lower()}@msu.ac.zw",
                    password_hash=default_hashed_password,
                    full_name=stud_name,
                    student_reg_number=stud_id,
                    faculty=faculty,
                    year_of_study=year
                )
                db.add(user)
                students[stud_id] = user
                
            if lect_id not in lecturers:
                user = User(
                    role="lecturer",
                    email=f"{lect_id.lower()}@msu.ac.zw",
                    password_hash=default_hashed_password,
                    full_name=lect_name,
                    lecturer_id=lect_id
                )
                db.add(user)
                lecturers[lect_id] = user
                
            db.flush()
            
            if module not in courses:
                # Module Code hack (take initials)
                code_words = module.split()
                # in case there are multiple courses with same initials, append something unique to avoid duplicate error
                base_code = "".join(w[0] for w in code_words).upper()
                c = 101
                code = f"{base_code}{c}"
                while code in [cs.code for cs in courses.values()]:
                    c += 1
                    code = f"{base_code}{c}"

                course = Course(
                    name=module,
                    code=code,
                    lecturer_id=lecturers[lect_id].id,
                    day_of_week=day_val,
                    time_slot=time_slot
                )
                db.add(course)
                courses[module] = course
            
            db.flush()
            
            session_key = (courses[module].id, date_val, time_slot)
            if session_key not in sessions:
                session = ModuleSession(
                    course_id=courses[module].id,
                    date=date_val,
                    day_of_week=day_val,
                    time_slot=time_slot
                )
                db.add(session)
                sessions[session_key] = session
            
            db.flush()
            
            if not hasattr(students[stud_id], "_enrolled"):
                students[stud_id]._enrolled = set()
                
            if courses[module].id not in students[stud_id]._enrolled:
                enrollment = Enrollment(
                    student_id=students[stud_id].id,
                    course_id=courses[module].id
                )
                db.add(enrollment)
                students[stud_id]._enrolled.add(courses[module].id)
                
            # Create Attendance Record
            # to handle duplicates (same student, same session), we can check if it exists:
            if not hasattr(students[stud_id], "_sessions_attended"):
                students[stud_id]._sessions_attended = set()
                
            if session_key not in students[stud_id]._sessions_attended:
                record = AttendanceRecord(
                    student_id=students[stud_id].id,
                    course_id=courses[module].id,
                    session_id=sessions[session_key].id,
                    check_in_time=check_in_time,
                    status=attendance
                )
                db.add(record)
                students[stud_id]._sessions_attended.add(session_key)
            
            if row_count % 1000 == 0:
                print(f"Processed {row_count} rows...")

    print("Committing to database...")
    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    run_seed()
