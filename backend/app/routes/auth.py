from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.employee_service import EmployeeService
from ..schemas.employee import Token, EmployeeOut
from ..utils.auth import get_current_employee

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
service = EmployeeService()

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    return service.authenticate_employee(db, form_data.username, form_data.password)

@router.get("/me", response_model=EmployeeOut)
def get_me(current_employee = Depends(get_current_employee)):
    return current_employee

@router.get("/session/current")
def get_current_session_info(
    db: Session = Depends(get_db),
    current_employee = Depends(get_current_employee)
):
    from ..models.session import Session as SessionModel
    sess_id = getattr(current_employee, "session_id", None)
    v_count = 0
    threat_level = "Safe"
    status_str = "Inactive"
    
    if sess_id:
        sess = db.query(SessionModel).filter(SessionModel.session_id == sess_id).first()
        if sess:
            v_count = sess.violation_count
            status_str = sess.session_status
            if v_count == 1:
                threat_level = "Warning"
            elif v_count == 2:
                threat_level = "High Risk"
            elif v_count >= 3:
                threat_level = "Critical"
                
    return {
        "session_id": sess_id,
        "violation_count": v_count,
        "threat_level": threat_level,
        "session_status": status_str
    }

@router.post("/logout")
def logout(
    db: Session = Depends(get_db),
    current_employee = Depends(get_current_employee)
):
    import datetime
    from ..models.session import Session as SessionModel
    from ..models.security import AuditLog
    
    sess_id = getattr(current_employee, "session_id", None)
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    
    if sess_id:
        sess = db.query(SessionModel).filter(SessionModel.session_id == sess_id).first()
        if sess:
            sess.session_status = "Expired"
            sess.logout_time = datetime.datetime.utcnow()
            db.commit()
            
    # Write AuditLog for Logout
    db.add(AuditLog(
        user_id=user_id,
        session_id=sess_id,
        tool_name="logout",
        operation="LOGOUT",
        resource="sessions",
        decision="Allowed",
        reason=f"User {user_id} logged out successfully.",
        risk_score=0,
        status="success"
    ))
    db.commit()
    return {"success": True, "detail": "Logged out successfully."}
