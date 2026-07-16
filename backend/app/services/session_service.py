from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Tuple, Optional
import datetime
from ..repositories.session_repository import SessionRepository
from ..models.session import Session as SessionModel
from ..models.security import AuditLog
from ..schemas.session import SessionCreate, SessionUpdate

class SessionService:
    def __init__(self):
        self.repo = SessionRepository()

    def get_session(self, db: Session, session_id: str) -> SessionModel:
        db_sess = self.repo.get_by_id(db, session_id)
        if not db_sess:
            raise HTTPException(status_code=404, detail="Session record not found")
        return db_sess

    def get_sessions(
        self,
        db: Session,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "login_time",
        sort_desc: bool = True,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[SessionModel], int]:
        return self.repo.get_all(db, user_id, status, sort_by, sort_desc, skip, limit)

    def create_session(self, db: Session, session_in: SessionCreate, operator_id: Optional[str] = None) -> SessionModel:
        if self.repo.get_by_id(db, session_in.session_id):
            raise HTTPException(status_code=400, detail="Session ID already exists")

        db_sess = SessionModel(
            session_id=session_in.session_id,
            user_id=session_in.user_id,
            login_time=datetime.datetime.utcnow(),
            user_role=session_in.user_role,
            session_status=session_in.session_status
        )

        created = self.repo.create(db, db_sess)

        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="create_session",
            operation="CREATE",
            resource="sessions",
            decision="Allowed",
            reason=f"Session {created.session_id} created.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return created

    def update_session(self, db: Session, session_id: str, session_in: SessionUpdate, operator_id: Optional[str] = None) -> SessionModel:
        db_sess = self.get_session(db, session_id)

        update_data = session_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_sess, key, value)

        if session_in.session_status in ["Expired", "Terminated"] and not db_sess.logout_time:
            db_sess.logout_time = datetime.datetime.utcnow()

        updated = self.repo.update(db, db_sess)

        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="update_session",
            operation="UPDATE",
            resource="sessions",
            decision="Allowed",
            reason=f"Session {session_id} status updated to {updated.session_status}.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return updated

    def delete_session(self, db: Session, session_id: str, operator_id: Optional[str] = None) -> None:
        db_sess = self.get_session(db, session_id)
        self.repo.delete(db, db_sess)

        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="delete_session",
            operation="DELETE",
            resource="sessions",
            decision="Allowed",
            reason=f"Session {session_id} deleted.",
            risk_score=0,
            status="success"
        ))
        db.commit()
