from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..services.employee_service import EmployeeService
from ..schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, PaginatedEmployees
from ..schemas.role import RoleOut
from ..utils.auth import get_current_employee
from ..models.employee import Employee

router = APIRouter(tags=["Employees & Roles"])
service = EmployeeService()

@router.get("/api/employees", response_model=PaginatedEmployees)
def get_employees(
    search: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None),
    sort_by: str = Query("employee_id"),
    sort_desc: bool = Query(False),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    items, total = service.get_employees(db, search, role_id, sort_by, sort_desc, skip, limit)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/api/employees/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_employee(db, employee_id)

@router.post("/api/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.create_employee(db, employee_in, current_employee.employee_id)

@router.put("/api/employees/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: str,
    employee_in: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.update_employee(db, employee_id, employee_in, current_employee.employee_id)

@router.delete("/api/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    service.delete_employee(db, employee_id, current_employee.employee_id)
    return None

# Roles list
@router.get("/api/roles", response_model=List[RoleOut])
def get_roles(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    return service.get_roles(db)
