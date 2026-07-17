from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from ..database import get_db
from ..services.customer_service import CustomerService
from ..schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerOut, PaginatedCustomers,
    PendingCustomerOut, PendingCustomerCreate, PendingCustomerUpdate,
    CustomerProfileUpdateRequestCreate, CustomerProfileUpdateRequestOut
)
from ..utils.auth import get_current_employee
from ..models.employee import Employee
from pydantic import BaseModel
from ..services.gateway import enforce_regional_boundary_rest

router = APIRouter(prefix="/api/customers", tags=["Customers"])
service = CustomerService()

class ProfileUpdateProcessAction(BaseModel):
    action: str  # APPROVE or REJECT

# ── List routes (static paths MUST come before /{customer_id}) ─────────────

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
    region_filter = None
    role_name = getattr(current_employee, "role", None)
    if role_name and role_name.lower() == "manager":
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

@router.get("/pending-updates", response_model=List[CustomerProfileUpdateRequestOut])
def get_pending_profile_updates(
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    region = getattr(current_employee, "region", None)
    role_name = getattr(current_employee, "role", None)
    filter_region = None
    if role_name in ("manager", "Manager"):
        filter_region = region
    return service.get_pending_updates(db, skip=skip, limit=limit, region=filter_region)

@router.post("/pending", response_model=PendingCustomerOut, status_code=status.HTTP_201_CREATED)
def create_pending_customer(
    pending_in: PendingCustomerCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
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
            reason=f"Manager {current_employee.employee_id} submitted pending customer registration for {pending_in.full_name}.",
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

@router.put("/pending-updates/{request_id}", response_model=CustomerProfileUpdateRequestOut)
def process_profile_update_request(
    request_id: int,
    action_in: ProfileUpdateProcessAction,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    role_name = getattr(current_employee, "role", "Support")
    user_id = getattr(current_employee, "employee_id", None) or getattr(current_employee, "customer_id", None)
    region = getattr(current_employee, "region", None)
    return service.process_update_request(db, request_id, action_in.action, user_id, role_name, region)

# ── Dynamic path routes (must come AFTER static paths) ─────────────────────

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    cust = service.get_customer(db, customer_id)
    enforce_regional_boundary_rest(db, current_employee, cust.region, "READ", customer_id)
    return cust

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    enforce_regional_boundary_rest(db, current_employee, customer_in.region, "CREATE", customer_in.customer_id)
    return service.create_customer(db, customer_in, getattr(current_employee, "employee_id", None))

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: str,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    cust = service.get_customer(db, customer_id)
    enforce_regional_boundary_rest(db, current_employee, cust.region, "UPDATE", customer_id)
    return service.update_customer(db, customer_id, customer_in, getattr(current_employee, "employee_id", None))

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    cust = service.get_customer(db, customer_id)
    enforce_regional_boundary_rest(db, current_employee, cust.region, "DELETE", customer_id)
    service.delete_customer(db, customer_id, getattr(current_employee, "employee_id", None))
    return None

@router.post("/{customer_id}/update-request", response_model=CustomerProfileUpdateRequestOut)
def create_profile_update_request(
    customer_id: str,
    updates_in: CustomerProfileUpdateRequestCreate,
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    cust = service.get_customer(db, customer_id)
    from ..models.customer import Customer as CustomerModel
    if isinstance(current_employee, CustomerModel):
        if current_employee.customer_id.upper() != customer_id.upper():
            raise HTTPException(status_code=403, detail="Customers can only submit update requests for their own account.")
    else:
        # Enforce manager region checks
        enforce_regional_boundary_rest(db, current_employee, cust.region, "UPDATE_REQUEST", customer_id)
    return service.create_update_request(db, customer_id.upper(), updates_in.updates)
