from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from deps import get_current_user

router = APIRouter(prefix="/feedback", tags=["feedback"])

@router.post("/", response_model=schemas.FeedbackResponse)
def send_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_feedback = models.Feedback(
        sender_id=current_user.id,
        receiver_id=feedback.receiver_id,
        subject=feedback.subject,
        message=feedback.message
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return new_feedback

@router.get("/inbox", response_model=list[schemas.FeedbackResponse])
def get_inbox(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Feedbacks sent to the user OR sent to system/admin if user is admin
    if current_user.role in ["admin", "super_admin"]:
        return db.query(models.Feedback).filter(
            (models.Feedback.receiver_id == current_user.id) | (models.Feedback.receiver_id == None)
        ).order_by(models.Feedback.created_at.desc()).all()
    else:
        return db.query(models.Feedback).filter(
            models.Feedback.receiver_id == current_user.id
        ).order_by(models.Feedback.created_at.desc()).all()

@router.get("/sent", response_model=list[schemas.FeedbackResponse])
def get_sent_feedback(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Feedback).filter(
        models.Feedback.sender_id == current_user.id
    ).order_by(models.Feedback.created_at.desc()).all()
