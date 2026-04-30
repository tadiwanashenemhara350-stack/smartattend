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
    # 1. Initial check (Optional skip)
    print("Checking if database needs seeding...")
    temp_db = SessionLocal()
    should_skip = False
    try:
        student_count = temp_db.query(User).filter(User.role == 'student').count()
        if student_count > 100 and os.getenv("FORCE_RESEED") != "true":
            print(f"Database already has {student_count} students. Skipping seed.")
            should_skip = True
    except Exception as e:
        print(f"Tables might not exist yet: {e}")
    finally:
        temp_db.close() # CRITICAL: Close session before drop_all to avoid deadlock

    if should_skip:
        return

    # 2. Backup Admins
    print("Fetching existing admins to preserve them...")
    admin_data = []
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT role, email, password_hash, full_name, is_active FROM users WHERE role IN ('super_admin', 'admin')"))
            for row in result:
                admin_data.append({
                    "role": row[0],
                    "email": row[1],
                    "password_hash": row[2],
                    "full_name": row[3],
                    "is_active": row[4]
                })
        print(f"Found {len(admin_data)} admins to restore.")
    except Exception as e:
        print(f"Could not fetch admins (normal if fresh DB): {e}")

    # 3. Recreate Schema
    print("Dropping all tables and recreating schema...")
    try:
        Base.metadata.drop_all(bind=engine)
        print("Dropped old tables.")
        Base.metadata.create_all(bind=engine)
        print("Created new tables.")
    except Exception as e:
        print(f"Error recreating schema: {e}")
        return

    # 4. Seeding Process
    db = SessionLocal()
    try:
        print("Restoring admins...")
        for data in admin_data:
            db.add(User(**data))
        db.commit()
        print("Admins restored.")

        print(f"Reading data from {DATA_CSV_PATH}...")
        if not os.path.exists(DATA_CSV_PATH):
            print(f"ERROR: CSV file not found at {DATA_CSV_PATH}")
            return

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
                time_slot = row["Time_Slot"]
                attendance = row["Attendance"]
                check_in_time = row["Check_In_Time"]
                
                # Sync Lecturer
                if lect_id not in lecturers:
                    user = User(
                        role="lecturer",
                        email=f"{lect_id.lower()}@msu.ac.zw",
                        password_hash=default_hashed_password,
                        full_name=lect_name,
                        lecturer_id=lect_id
                    )
                    db.add(user)
                    db.flush() # Populate ID
                    lecturers[lect_id] = user
                    
                # Sync Student
                if stud_id not in students:
                    user = User(
                        role="student",
                        email=f"{stud_id.lower()}@msu.ac.zw",
                        password_hash=default_hashed_password,
                        full_name=stud_name,
                        student_reg_number=stud_id,
                        faculty="Data Science", # Force Data Science
                        year_of_study="Level 2.2" # Force Level 2.2
                    )
                    db.add(user)
                    db.flush() # Populate ID
                    students[stud_id] = user
                    
                # Sync Course
                if module not in courses:
                    # Generate unique code
                    code_words = module.split()
                    base_code = "".join(w[0] for w in code_words).upper()
                    if not hasattr(run_seed, "_codes"): run_seed._codes = set()
                    c = 101
                    code = f"{base_code}{c}"
                    while code in run_seed._codes:
                        c += 1
                        code = f"{base_code}{c}"
                    run_seed._codes.add(code)

                    course = Course(
                        name=module,
                        code=code,
                        lecturer_id=lecturers[lect_id].id,
                        day_of_week=day_val,
                        time_slot=time_slot
                    )
                    db.add(course)
                    db.flush() # Populate ID
                    courses[module] = course
                
                # Sync Session
                session_key = (courses[module].id, date_val, time_slot)
                if session_key not in sessions:
                    session = ModuleSession(
                        course_id=courses[module].id,
                        date=date_val,
                        day_of_week=day_val,
                        time_slot=time_slot
                    )
                    db.add(session)
                    db.flush() # Populate ID
                    sessions[session_key] = session
                
                # Enrollment (Initial set from CSV)
                if not hasattr(students[stud_id], "_enrolled"):
                    students[stud_id]._enrolled = set()
                if courses[module].id not in students[stud_id]._enrolled:
                    enrollment = Enrollment(
                        student_id=students[stud_id].id,
                        course_id=courses[module].id
                    )
                    db.add(enrollment)
                    students[stud_id]._enrolled.add(courses[module].id)
                    
                # Attendance Record
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
                
                if row_count % 500 == 0:
                    print(f"Processed {row_count} rows...")
                    db.flush()

        # FINAL STEP: Ensure all students are enrolled in ALL modules of the program
        print("Ensuring all students are enrolled in all program modules...")
        all_course_ids = [c.id for c in courses.values()]
        for stud_reg, student_obj in students.items():
            if not hasattr(student_obj, "_enrolled"):
                student_obj._enrolled = set()
            for c_id in all_course_ids:
                if c_id not in student_obj._enrolled:
                    enrollment = Enrollment(
                        student_id=student_obj.id,
                        course_id=c_id
                    )
                    db.add(enrollment)
                    student_obj._enrolled.add(c_id)

        print("Committing all changes to database...")
        db.commit()
        print("Seeding complete successfully.")
    except Exception as e:
        print(f"CRITICAL ERROR during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
