from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class CustomerBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: str
    profile_image: Optional[str] = None
    status: str
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    card_number: Optional[str] = None
    region: Optional[str] = None

class CustomerCreate(CustomerBase):
    customer_id: str
    password: str

class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    card_number: Optional[str] = None
    region: Optional[str] = None

class CustomerOut(CustomerBase):
    customer_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PendingCustomerBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: str
    profile_image: Optional[str] = None
    request_status: str
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    card_number: Optional[str] = None
    region: Optional[str] = None

class PendingCustomerCreate(PendingCustomerBase):
    pass

class PendingCustomerUpdate(BaseModel):
    request_status: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    card_number: Optional[str] = None
    region: Optional[str] = None

class PendingCustomerOut(PendingCustomerBase):
    request_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CustomerActivityBase(BaseModel):
    customer_id: str
    activity_type: str
    activity_description: str

class CustomerActivityCreate(CustomerActivityBase):
    pass

class CustomerActivityOut(CustomerActivityBase):
    activity_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedCustomers(BaseModel):
    items: List[CustomerOut]
    total: int
    skip: int
    limit: int
