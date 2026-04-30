import pandas as pd
import os
import sys
from pathlib import Path
from sqlalchemy.orm import Session
import datetime

# Add backend directory to sys path so we can import from database
sys.path.append(str(Path(__file__).resolve().parent))
from database import SessionLocal
import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def run():
    csv_path = r"C:\Users\windows 10\Downloads\msu_attendance_2026_dirty.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print("Loading CSV Data...")
    df = pd.read_csv(csv_path)

    # 1. Clean Data
    df['Student_Name'] = df['Student_Name'].fillna("Unknown Student")
    df['Date'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m-%d')
    # Default password
    hashed_password = pwd_context.hash("tadiwa0627")

    print("Connecting to DB...")
    db = SessionLocal()
    
    try:
        # 1. Clear existing data except super_admin
        print("Clearing existing data...")
        db.query(models.AttendanceRecord).delete()
        db.query(models.ModuleSession).delete()
        db.query(models.Enrollment).delete()
        db.query(models.Course).delete()
        db.query(models.Programme).delete()
        db.query(models.User).filter(models.User.role != "super_admin").delete()
        db.commit()

        # 2. Sync Lecturers
        print("Syncing Lecturers...")
        lecturers = df[['Lecturer_ID', 'Lecturer_Name']].drop_duplicates(subset=['Lecturer_ID']).dropna(subset=['Lecturer_ID'])
        lecturer_map = {}
        for _, row in lecturers.iterrows():
            lid = row['Lecturer_ID']
            lname = row['Lecturer_Name']
            user = models.User(
                role="lecturer",
                email=f"{lid.lower()}@msu.edu",
                password_hash=hashed_password,
                full_name=lname,
                lecturer_id=lid
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            lecturer_map[lid] = user.id

        # 3. Sync Students
        print("Syncing Students...")
        students = df[['Student_ID', 'Student_Name']].drop_duplicates(subset=['Student_ID']).dropna(subset=['Student_ID'])
        student_map = {}
        for _, row in students.iterrows():
            sid = row['Student_ID']
            sname = row['Student_Name']
            user = models.User(
                role="student",
                email=f"{sid.lower()}@students.msu.edu",
                password_hash=hashed_password,
                full_name=sname,
                student_reg_number=sid
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            student_map[sid] = user.id

        # 4. Sync Courses
        print("Syncing Courses...")
        courses = df[['Module', 'Lecturer_ID', 'Day', 'Time_Slot', 'Faculty']].drop_duplicates()
        course_map = {}
        
        # Deduplicate courses by Module Code
        for _, row in courses.iterrows():
            mname = row['Module']
            lid = row['Lecturer_ID']
            code = mname.replace(' ', '').upper()
            
            if mname not in course_map:
                if pd.notna(lid) and lid in lecturer_map:
                    lecturer_db_id = lecturer_map[lid]
                else:
                    lecturer_db_id = None
                
                # Check if course code already exists (some courses might have multiple entries with different lecturers, we just keep first)
                course = db.query(models.Course).filter(models.Course.code == code).first()
                if not course:
                    course = models.Course(
                        name=mname,
                        code=code,
                        lecturer_id=lecturer_db_id,
                        day_of_week=row['Day'],
                        time_slot=row['Time_Slot']
                    )
                    db.add(course)
                    db.commit()
                    db.refresh(course)
                course_map[mname] = course.id

        # 5. Sync Enrollments
        print("Syncing Enrollments...")
        enrolls = df[['Student_ID', 'Module']].drop_duplicates().dropna()
        new_enrolls = []
        for _, row in enrolls.iterrows():
            sid = row['Student_ID']
            mname = row['Module']
            if sid in student_map and mname in course_map:
                new_enrolls.append(models.Enrollment(
                    student_id=student_map[sid],
                    course_id=course_map[mname]
                ))
        db.bulk_save_objects(new_enrolls)
        db.commit()

        # 6. Sync Module Sessions
        print("Syncing Module Sessions...")
        sessions = df[['Module', 'Date', 'Day', 'Time_Slot']].drop_duplicates().dropna()
        session_map = {} # Maps (Module, Date) to session.id
        for _, row in sessions.iterrows():
            mname = row['Module']
            date = row['Date']
            day = row['Day']
            time_slot = row['Time_Slot']
            
            if mname in course_map:
                session = models.ModuleSession(
                    course_id=course_map[mname],
                    date=date,
                    day_of_week=day,
                    time_slot=time_slot
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                session_map[(mname, date)] = session.id

        # 7. Sync Attendance Records
        print("Syncing Attendance Records...")
        attendance_records = []
        for _, row in df.iterrows():
            sid = row['Student_ID']
            mname = row['Module']
            date = row['Date']
            status = row['Attendance']
            check_in_time = row['Check_In_Time'] if pd.notna(row['Check_In_Time']) else None
            
            if sid in student_map and mname in course_map and (mname, date) in session_map:
                attendance_records.append(models.AttendanceRecord(
                    student_id=student_map[sid],
                    course_id=course_map[mname],
                    session_id=session_map[(mname, date)],
                    check_in_time=str(check_in_time) if check_in_time else None,
                    status=status
                ))
        
        # Insert in chunks to avoid blowing up memory
        chunk_size = 1000
        for i in range(0, len(attendance_records), chunk_size):
            db.bulk_save_objects(attendance_records[i:i+chunk_size])
        db.commit()

        print("Database sync completed successfully!")

    except Exception as e:
        print(f"Error syncing DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    run()
