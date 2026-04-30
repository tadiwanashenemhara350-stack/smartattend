from pydantic import BaseModel, EmailStr
from typing import Optional
import datetime

class UserCreate(BaseModel):
    role: str
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    student_reg_number: Optional[str] = None
    lecturer_id: Optional[str] = None

class UserRegister(BaseModel):
    identifier: str
    role: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    identifier: str # Email OR student_reg_number OR lecturer_id
    password: str

class UserResponse(BaseModel):
    id: int
    role: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    student_reg_number: Optional[str] = None
    lecturer_id: Optional[str] = None

    class Config:
        from_attributes = True

class SuperAdminInit(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class ProgrammeCreate(BaseModel):
    name: str
    levels: str

class ProgrammeResponse(BaseModel):
    id: int
    name: str
    levels: str

    class Config:
        from_attributes = True

class SystemSettingUpdate(BaseModel):
    key: str
    value: str

class SystemSettingResponse(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True

class CourseCreate(BaseModel):
    code: str
    name: str
    programme_id: int
    level: str
    lecturer_id: int
    day_of_week: Optional[str] = None
    time_slot: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CourseResponse(BaseModel):
    id: int
    code: str
    name: str
    programme_id: Optional[int] = None
    level: Optional[str] = None
    lecturer_id: Optional[int] = None
    day_of_week: Optional[str] = None
    time_slot: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    # Nested fields for UI display
    programme: Optional[ProgrammeResponse] = None
    lecturer: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class EnrollmentCreate(BaseModel):
    course_id: int
    student_ids: list[int]

class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class FeedbackCreate(BaseModel):
    receiver_id: Optional[int] = None
    subject: str
    message: str

class FeedbackResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: Optional[int] = None
    subject: str
    message: str
    created_at: datetime.datetime
    sender: UserResponse
    receiver: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    old_password: str
    new_password: str
