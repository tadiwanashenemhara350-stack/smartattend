from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, index=True) # "super_admin", "admin", "lecturer", "student"
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String)
    full_name = Column(String, nullable=True)
    
    # Role-specific fields
    student_reg_number = Column(String, unique=True, index=True, nullable=True)
    lecturer_id = Column(String, unique=True, index=True, nullable=True)
    faculty = Column(String, nullable=True)
    year_of_study = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    code = Column(String, unique=True, index=True)
    lecturer_id = Column(Integer, ForeignKey("users.id"))
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=True)
    level = Column(String, nullable=True)
    day_of_week = Column(String, nullable=True)
    time_slot = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    
    programme = relationship("Programme")
    lecturer = relationship("User", foreign_keys=[lecturer_id])

class ModuleSession(Base):
    __tablename__ = "module_sessions"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    date = Column(String)
    day_of_week = Column(String)
    time_slot = Column(String)
    
    course = relationship("Course", foreign_keys=[course_id])


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    session_id = Column(Integer, ForeignKey("module_sessions.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    check_in_time = Column(String, nullable=True)
    status = Column(String, default="Present")
    
    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course", foreign_keys=[course_id])
    session = relationship("ModuleSession", foreign_keys=[session_id])

class Programme(Base):
    __tablename__ = "programmes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    levels = Column(String) # Stored as comma-separated values

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)

class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    
    student = relationship("User", foreign_keys=[student_id])
    course = relationship("Course", foreign_keys=[course_id])

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    type = Column(String) # "info", "warning", "risk", "attendance"
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User")

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=True) # If null, it's for system/admin
    subject = Column(String)
    message = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
