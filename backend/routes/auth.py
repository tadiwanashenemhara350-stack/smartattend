from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, utils
import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/init", response_model=schemas.UserResponse)
def initialize_super_admin(init_data: schemas.SuperAdminInit, db: Session = Depends(get_db)):
    user_count = db.query(models.User).count()
    if user_count > 0:
        raise HTTPException(status_code=400, detail="System already initialized")
    
    hashed_password = utils.get_password_hash(init_data.password)
    super_admin = models.User(
        email=init_data.email,
        password_hash=hashed_password,
        full_name=init_data.full_name,
        role="super_admin"
    )
    db.add(super_admin)
    db.commit()
    db.refresh(super_admin)
    return super_admin

@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    user_count = db.query(models.User).count()
    return {"is_initialized": user_count > 0}

@router.post("/login")
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.email == login_data.identifier) |
        (models.User.student_reg_number == login_data.identifier) |
        (models.User.lecturer_id == login_data.identifier)
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="User not found. Please register first.")
    
    if not user.password_hash:
        raise HTTPException(status_code=400, detail="Password not set. Please set your password first.")
        
    if not utils.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    access_token_expires = datetime.timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": str(user.id), "role": user.role}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user.role, 
        "name": user.full_name,
        "id": user.id,
        "identifier": user.lecturer_id or user.student_reg_number or user.email
    }

@router.post("/register")
def register_user(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.email == user_data.identifier) |
        (models.User.student_reg_number == user_data.identifier) |
        (models.User.lecturer_id == user_data.identifier)
    ).first()
        
    if not user or user.role != user_data.role:
        raise HTTPException(status_code=404, detail="You are not recognized by the system. Contact Admin.")
        
    if user.password_hash:
        raise HTTPException(status_code=400, detail="User already registered. Please login.")
        
    user.full_name = user_data.full_name
    user.password_hash = utils.get_password_hash(user_data.password)
    db.commit()
    db.refresh(user)
    return {"message": "Registration successful. You can now log in."}
