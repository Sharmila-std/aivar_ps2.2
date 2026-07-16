from pydantic import BaseModel, ConfigDict
from typing import Optional

class RoleBase(BaseModel):
    role_name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    role_name: Optional[str] = None
    description: Optional[str] = None

class RoleOut(RoleBase):
    role_id: int

    model_config = ConfigDict(from_attributes=True)
