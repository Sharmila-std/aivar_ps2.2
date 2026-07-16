from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from .role import RoleOut

class EmployeeBase(BaseModel):
    employee_id: str
    full_name: str
    email: EmailStr
    role_id: int
    role: Optional[str] = None
    region: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    password: str

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    password: Optional[str] = None
    role: Optional[str] = None
    region: Optional[str] = None

class EmployeeOut(EmployeeBase):
    created_at: datetime
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    employee_id: str
    full_name: str
    role_name: str
    region: Optional[str] = None
    department: Optional[str] = None

class TokenData(BaseModel):
    employee_id: Optional[str] = None
    role_name: Optional[str] = None

class PaginatedEmployees(BaseModel):
    items: List[EmployeeOut]
    total: int
    skip: int
    limit: int
