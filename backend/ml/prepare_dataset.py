import pandas as pd
import os
import sys
from pathlib import Path

# Add backend directory to sys path so we can import from database
sys.path.append(str(Path(__file__).resolve().parent.parent))
from database import SessionLocal
import models
from passlib.context import CryptContext

pwd_context =CryptContext(schemes=["bcrypt"], deprecated="auto")

def run():
    csv_path = os.path.join(os.path.dirname(__file__), "msu_attendance_2026_dirty.csv")
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print("Loading CSV Data...")
    df = pd.read_csv(csv_path)

    # 1. Clean Data
    # Fill missing names
    df['Student_Name'] = df['Student_Name'].fillna("Unknown Student")
    # Missing times can be left NaN since we only care about the Attendance column for now
    
    print("Connecting to DB for Synchronization...")
    db = SessionLocal()
    
    try:
        # 2. Sync Lecturers
        lecturers = df[['Lecturer_ID', 'Lecturer_Name']].drop_duplicates().dropna()
        lecturer_map = {}
        for _, row in lecturers.iterrows():
            lid = row['Lecturer_ID']
            lname = row['Lecturer_Name']
            user = db.query(models.User).filter(models.User.lecturer_id == lid).first()
            if not user:
                user = models.User(
                    role="lecturer",
                    email=f"{lid.lower()}@msu.edu",
                    password_hash=pwd_context.hash("password"),
                    full_name=lname,
                    lecturer_id=lid
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            lecturer_map[lid] = user.id

        # 3. Sync Students
        students = df[['Student_ID', 'Student_Name']].drop_duplicates().dropna()
        student_map = {}
        for _, row in students.iterrows():
            sid = row['Student_ID']
            sname = row['Student_Name']
            user = db.query(models.User).filter(models.User.student_reg_number == sid).first()
            if not user:
                user = models.User(
                    role="student",
                    email=f"{sid.lower()}@students.msu.edu",
                    password_hash=pwd_context.hash("password"),
                    full_name=sname,
                    student_reg_number=sid
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            student_map[sid] = user.id

        # 4. Sync Courses
        courses = df[['Module', 'Lecturer_ID', 'Day', 'Time_Slot', 'Faculty']].drop_duplicates()
        course_map = {}
        for _, row in courses.iterrows():
            mname = row['Module']
            lid = row['Lecturer_ID']
            code = mname.replace(' ', '').upper()
            course = db.query(models.Course).filter(models.Course.code == code).first()
            if not course and pd.notna(lid) and lid in lecturer_map:
                course = models.Course(
                    name=mname,
                    code=code,
                    lecturer_id=lecturer_map[lid],
                    day_of_week=row['Day'],
                    time_slot=row['Time_Slot']
                )
                db.add(course)
                db.commit()
                db.refresh(course)
            if course:
                course_map[mname] = course.id

        # 5. Sync Enrollments
        # To avoid duplicates safely
        db.query(models.Enrollment).delete()
        db.commit()
        
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

        print("Database sync completed successfully!")

    except Exception as e:
        print(f"Error syncing DB: {e}")
        db.rollback()
    finally:
        db.close()

    # 6. Feature Engineering for ML
    print("Engineering ML features...")
    # Group by student and module to get attendance aggregates
    # Attendance states: Present, Absent, Late
    
    # Ensure Date is datetime for correct sorting
    df['Date'] = pd.to_datetime(df['Date'])
    grouped = df.groupby(['Student_ID', 'Module'])
    
    ml_data = []
    
    for (sid, mod), group in grouped:
        group = group.sort_values('Date')
        total_classes = len(group)
        present = len(group[group['Attendance'] == 'Present'])
        late = len(group[group['Attendance'] == 'Late'])
        absent = len(group[group['Attendance'] == 'Absent'])
        
        classes_attended = present + late
        attendance_ratio = classes_attended / total_classes if total_classes > 0 else 0
        late_ratio = late / total_classes if total_classes > 0 else 0
        
        # New Feature: Morning Absences
        morning_classes = group[group['Time_Slot'] == '08:00-11:00']
        morning_absences = len(morning_classes[morning_classes['Attendance'].isin(['Absent', 'Late'])])
        
        # New Feature: Consecutive Absences
        consecutive_absences = 0
        current_streak = 0
        for status in group['Attendance']:
            if status in ['Absent', 'Late']:
                current_streak += 1
                consecutive_absences = max(consecutive_absences, current_streak)
            else:
                current_streak = 0
        
        # Target Label: Failure Risk (1 = Failed/At Risk, 0 = Passed/Safe)
        # Assuming historical rule: <60% attendance = Failed.
        is_failed = 1 if attendance_ratio < 0.60 else 0
        
        ml_data.append({
            'total_classes': total_classes,
            'classes_attended': classes_attended,
            'late_arrivals': late,
            'attendance_ratio': attendance_ratio,
            'late_ratio': late_ratio,
            'morning_absences': morning_absences,
            'consecutive_absences': consecutive_absences,
            'is_failed': is_failed
        })
    
    ml_df = pd.DataFrame(ml_data)
    ml_csv_path = Path(__file__).resolve().parent / "training_data.csv"
    ml_df.to_csv(ml_csv_path, index=False)
    print(f"ML training dataset created at: {ml_csv_path}")

if __name__ == '__main__':
    run()
