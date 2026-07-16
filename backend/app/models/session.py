from sqlalchemy import Column, String, DateTime, Integer
import datetime
from ..database import Base

class Session(Base):
    __tablename__ = 'sessions'

    session_id = Column(String(64), primary_key=True)
    user_id = Column(String(20), nullable=True)
    login_time = Column(DateTime, default=datetime.datetime.utcnow)
    logout_time = Column(DateTime, nullable=True)
    user_role = Column(String(50), nullable=False)
    session_status = Column(String(20), nullable=False)  # Active, Expired, Terminated
    violation_count = Column(Integer, default=0, nullable=False)
