from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from ..database import get_db
from ..services.customer_service import CustomerService
from ..schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerOut, PaginatedCustomers,
    PendingCustomerOut, PendingCustomerCreate, PendingCustomerUpdate
)
from ..utils.auth import get_current_employee
from ..models.employee import Employee

router = APIRouter(prefix="/api/customers", tags=["Customers"])
service = CustomerService()

@router.get("", response_model=PaginatedCustomers)
def get_customers(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("customer_id"),
    sort_desc: bool = Query(False),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    from typing import Any
    region_filter = None
    role_name = getattr(current_employee, "role", None)
    if role_name == "manager":
        region_filter = getattr(current_employee, "region", None)

    items, total = service.get_customers(db, search, status, sort_by, sort_desc, skip, limit, region=region_filter)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/pending", response_model=List[PendingCustomerOut])
def get_pending_customers(
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_pending_customers(db, skip, limit)

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_customer(db, customer_id)

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.create_customer(db, customer_in, current_employee.employee_id)

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: str,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.update_customer(db, customer_id, customer_in, current_employee.employee_id)

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    service.delete_customer(db, customer_id, current_employee.employee_id)
    return None

@router.post("/pending", response_model=PendingCustomerOut, status_code=status.HTTP_201_CREATED)
def create_pending_customer(
    pending_in: PendingCustomerCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    # Map to model directly
    from ..models.customer import PendingCustomer
    db_pending = PendingCustomer(
        full_name=pending_in.full_name,
        email=pending_in.email,
        phone=pending_in.phone,
        address=pending_in.address,
        profile_image=pending_in.profile_image,
    )
    created_pending = service.repo.create_pending(db, db_pending)
    try:
        from ..models.security import AuditLog
        db.add(AuditLog(
            user_id=current_employee.employee_id,
            tool_name="create_pending_customer",
            operation="CREATE",
            resource="pending_customers",
            decision="Allowed",
            reason=f"Manager {current_employee.employee_id} submitted pending customer registration for {pending_in.full_name} in {pending_in.region} region.",
            risk_score=0,
            status="success"
        ))
        db.commit()
    except Exception:
        pass
    return created_pending

@router.put("/pending/{request_id}", response_model=PendingCustomerOut)
def approve_pending_customer(
    request_id: int,
    status_in: PendingCustomerUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.process_pending_customer(db, request_id, status_in, current_employee.employee_id)
