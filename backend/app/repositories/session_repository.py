from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from ..models.session import Session as SessionModel

class SessionRepository:
    def get_by_id(self, db: Session, session_id: str) -> Optional[SessionModel]:
        return db.query(SessionModel).filter(SessionModel.session_id == session_id).first()

    def get_all(
        self,
        db: Session,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "login_time",
        sort_desc: bool = True,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[SessionModel], int]:
        query = db.query(SessionModel)

        if user_id:
            query = query.filter(SessionModel.user_id == user_id)
        if status and status != "All":
            query = query.filter(SessionModel.session_status == status)

        total = query.count()

        sort_col = getattr(SessionModel, sort_by, SessionModel.login_time)
        if sort_desc:
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        results = query.offset(skip).limit(limit).all()
        return results, total

    def create(self, db: Session, session: SessionModel) -> SessionModel:
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def update(self, db: Session, session: SessionModel) -> SessionModel:
        db.commit()
        db.refresh(session)
        return session

    def delete(self, db: Session, session: SessionModel) -> None:
        db.delete(session)
        db.commit()
