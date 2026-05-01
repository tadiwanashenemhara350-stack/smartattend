from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/users", tags=["users"])

from deps import get_admin_user, get_current_user
from utils import get_password_hash, verify_password

@router.post("/")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    existing_user = None
    if user.role == "student" and user.student_reg_number:
        existing_user = db.query(models.User).filter(models.User.student_reg_number == user.student_reg_number).first()
    elif user.role == "lecturer" and user.lecturer_id:
        existing_user = db.query(models.User).filter(models.User.lecturer_id == user.lecturer_id).first()
    elif user.role in ["admin", "super_admin"] and user.email:
        existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    else:
        raise HTTPException(status_code=400, detail="Missing identifier for role")
        
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists in the system")
        
    password_to_hash = user.password if user.password else "tadiwa0627"
    new_user = models.User(
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        student_reg_number=user.student_reg_number,
        lecturer_id=user.lecturer_id,
        password_hash=get_password_hash(password_to_hash)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": f"User {user.role} added successfully", "id": new_user.id}

@router.get("/")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete super_admin")
    # Cascading deletes
    db.query(models.Enrollment).filter(models.Enrollment.student_id == user_id).delete()
    db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == user_id).delete()
    if user.role == "lecturer":
        db.query(models.Course).filter(models.Course.lecturer_id == user_id).delete()

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

@router.post("/change-password")
def change_password(data: schemas.PasswordChange, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
