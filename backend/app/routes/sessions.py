from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..services.session_service import SessionService
from ..schemas.session import SessionCreate, SessionUpdate, SessionOut, PaginatedSessions
from ..utils.auth import get_current_employee
from ..models.employee import Employee

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])
service = SessionService()

@router.get("", response_model=PaginatedSessions)
def get_sessions(
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("login_time"),
    sort_desc: bool = Query(True),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    items, total = service.get_sessions(db, user_id, status, sort_by, sort_desc, skip, limit)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.create_session(db, session_in, current_employee.employee_id)

@router.put("/{session_id}", response_model=SessionOut)
def update_session(
    session_id: str,
    session_in: SessionUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.update_session(db, session_id, session_in, current_employee.employee_id)

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    service.delete_session(db, session_id, current_employee.employee_id)
    return None
