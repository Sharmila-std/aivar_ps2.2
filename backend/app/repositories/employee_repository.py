from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from ..models.employee import Employee
from ..models.role import Role

class EmployeeRepository:
    # Employee CRUD
    def get_by_id(self, db: Session, employee_id: str) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.employee_id == employee_id).first()

    def get_by_email(self, db: Session, email: str) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.email == email).first()

    def get_all(
        self,
        db: Session,
        search: Optional[str] = None,
        role_id: Optional[int] = None,
        sort_by: str = "employee_id",
        sort_desc: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Employee], int]:
        query = db.query(Employee)

        # Filter
        if role_id:
            query = query.filter(Employee.role_id == role_id)

        # Search
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Employee.full_name.ilike(search_pattern),
                    Employee.email.ilike(search_pattern),
                    Employee.employee_id.ilike(search_pattern)
                )
            )

        # Count total
        total = query.count()

        # Sort
        sort_col = getattr(Employee, sort_by, Employee.employee_id)
        if sort_desc:
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Paginate
        results = query.offset(skip).limit(limit).all()
        return results, total

    def create(self, db: Session, employee: Employee) -> Employee:
        db.add(employee)
        db.commit()
        db.refresh(employee)
        return employee

    def update(self, db: Session, employee: Employee) -> Employee:
        db.commit()
        db.refresh(employee)
        return employee

    def delete(self, db: Session, employee: Employee) -> None:
        db.delete(employee)
        db.commit()

    # Roles Methods
    def get_roles(self, db: Session) -> List[Role]:
        return db.query(Role).order_by(Role.role_id.asc()).all()

    def get_role_by_id(self, db: Session, role_id: int) -> Optional[Role]:
        return db.query(Role).filter(Role.role_id == role_id).first()

    def create_role(self, db: Session, role: Role) -> Role:
        db.add(role)
        db.commit()
        db.refresh(role)
        return role
