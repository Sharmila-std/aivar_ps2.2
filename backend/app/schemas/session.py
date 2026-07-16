from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class SessionBase(BaseModel):
    user_id: Optional[str] = None
    user_role: str
    session_status: str

class SessionCreate(SessionBase):
    session_id: str

class SessionUpdate(BaseModel):
    logout_time: Optional[datetime] = None
    session_status: Optional[str] = None

class SessionOut(SessionBase):
    session_id: str
    login_time: datetime
    logout_time: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedSessions(BaseModel):
    items: List[SessionOut]
    total: int
    skip: int
    limit: int
