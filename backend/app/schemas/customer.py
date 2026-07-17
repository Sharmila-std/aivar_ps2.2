from pydantic import BaseModel, EmailStr, ConfigDict, model_validator
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


class CustomerProfileUpdateRequestCreate(BaseModel):
    updates: dict

class CustomerProfileUpdateRequestOut(BaseModel):
    id: Optional[int] = None
    request_id: int
    customer_id: str
    updates_json: str
    updates: Optional[dict] = None
    request_status: str
    status: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def parse_fields(self) -> "CustomerProfileUpdateRequestOut":
        import json
        if self.updates_json:
            try:
                self.updates = json.loads(self.updates_json)
            except Exception:
                self.updates = {}
        else:
            self.updates = {}
        self.id = self.request_id
        self.status = self.request_status
        return self
