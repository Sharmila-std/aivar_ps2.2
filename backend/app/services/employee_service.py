from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Tuple, Optional
import uuid
import datetime
from ..repositories.employee_repository import EmployeeRepository
from ..models.employee import Employee
from ..models.role import Role
from ..models.customer import Customer
from ..models.session import Session as SessionModel
from ..models.security import AuditLog
from ..schemas.employee import EmployeeCreate, EmployeeUpdate
from ..utils.auth import hash_password, verify_password, create_access_token

class EmployeeService:
    def __init__(self):
        self.repo = EmployeeRepository()

    def authenticate_employee(self, db: Session, email: str, plain_password: str) -> dict:
        # Check employees first
        employee = self.repo.get_by_email(db, email)
        customer = None
        user_id = None
        full_name = None
        role_name = None
        password_hash = None

        if employee:
            user_id = employee.employee_id
            full_name = employee.full_name
            password_hash = employee.password_hash
            # Get role name
            role = self.repo.get_role_by_id(db, employee.role_id)
            # Make sure it matches our standard casing ("Admin", "Manager", etc.)
            role_name = role.role_name if role else "Support"
        else:
            # Check customers table strictly by Customer ID
            customer = db.query(Customer).filter(
                Customer.customer_id == email.upper()
            ).first()
            if customer:
                user_id = customer.customer_id
                full_name = customer.full_name
                password_hash = customer.password_hash
                role_name = "Customer"

        if not user_id or not password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email, customer ID, or password"
            )
        
        if not verify_password(plain_password, password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email, customer ID, or password"
            )

        # Check suspension or disable status before login
        user_status = getattr(employee or customer, "status", "Active")
        if user_status in ("Suspended", "Disabled"):
            detail_msg = "Your account has been temporarily suspended due to repeated unauthorized access attempts. Please contact your administrator."
            if user_status == "Disabled":
                detail_msg = "Your account has been permanently disabled due to policy violations. Please contact your administrator."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail_msg
            )

        # Generate unique session ID and insert to sessions table
        session_id = f"sess_{uuid.uuid4().hex[:16]}"
        db_sess = SessionModel(
            session_id=session_id,
            user_id=user_id,
            login_time=datetime.datetime.utcnow(),
            user_role=role_name,
            session_status="Active"
        )
        db.add(db_sess)

        # Create JWT token including session_id
        token_data = {"sub": user_id, "role": role_name, "session_id": session_id}
        token = create_access_token(data=token_data)

        # Log system audit log
        db.add(AuditLog(
            user_id=user_id,
            tool_name="login",
            operation="AUTHENTICATE",
            resource="sessions",
            decision="Allowed",
            reason=f"{role_name} {user_id} logged in successfully.",
            risk_score=0,
            status="success"
        ))
        db.commit()

        # Determine department name
        dept_name = "Support"
        if role_name == "Admin":
            dept_name = "Admin"
        elif role_name == "Manager":
            dept_name = "Management"
        elif role_name == "Customer":
            dept_name = "Customer"
        else:
            dept_name = role_name

        user_region = getattr(employee or customer, "region", None)

        return {
            "access_token": token,
            "token_type": "bearer",
            "employee_id": user_id,
            "full_name": full_name,
            "role_name": role_name,
            "region": user_region,
            "department": dept_name
        }

    def get_employee(self, db: Session, employee_id: str) -> Employee:
        db_emp = self.repo.get_by_id(db, employee_id)
        if not db_emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        return db_emp

    def get_employees(
        self,
        db: Session,
        search: Optional[str] = None,
        role_id: Optional[int] = None,
        sort_by: str = "employee_id",
        sort_desc: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Employee], int]:
        return self.repo.get_all(db, search, role_id, sort_by, sort_desc, skip, limit)

    def create_employee(self, db: Session, employee_in: EmployeeCreate, operator_id: Optional[str] = None) -> Employee:
        if self.repo.get_by_id(db, employee_in.employee_id):
            raise HTTPException(status_code=400, detail="Employee ID already exists")
        if self.repo.get_by_email(db, employee_in.email):
            raise HTTPException(status_code=400, detail="Email already registered")

        # Get role name from Role db model if not explicitly provided
        role_name_val = employee_in.role
        if not role_name_val:
            role_obj = db.query(Role).filter(Role.role_id == employee_in.role_id).first()
            if role_obj:
                role_name_val = role_obj.role_name

        db_employee = Employee(
            employee_id=employee_in.employee_id,
            full_name=employee_in.full_name,
            email=employee_in.email,
            password_hash=hash_password(employee_in.password),
            role_id=employee_in.role_id,
            region=employee_in.region,
            role=role_name_val
        )

        created = self.repo.create(db, db_employee)

        # Send password to email
        try:
            from ..utils.email import send_email
            subject = "Welcome to SecureScope AI Portal - Corporate Account Details"
            body = (
                f"Hello {created.full_name},\n\n"
                f"Your Corporate employee account has been successfully created by the administrator.\n\n"
                f"Login Details:\n"
                f"Username / Employee ID: {created.employee_id}\n"
                f"Password: {employee_in.password}\n"
                f"Assigned Role: {role_name_val}\n"
                f"Assigned Region: {created.region or 'Global'}\n\n"
                f"Please use these details to log in to the administrative portal.\n\n"
                f"Thank you,\nSecureScope AI Admin Team"
            )
            send_email(created.email, subject, body)
        except Exception as e:
            print(f"Failed to send email to employee: {e}")

        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="create_employee",
            operation="CREATE",
            resource="employees",
            decision="Allowed",
            reason=f"Employee {created.employee_id} created.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return created

    def update_employee(self, db: Session, employee_id: str, employee_in: EmployeeUpdate, operator_id: Optional[str] = None) -> Employee:
        db_employee = self.get_employee(db, employee_id)

        update_data = employee_in.model_dump(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            db_employee.password_hash = hash_password(update_data["password"])
            del update_data["password"]

        for key, value in update_data.items():
            setattr(db_employee, key, value)

        updated = self.repo.update(db, db_employee)

        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="update_employee",
            operation="UPDATE",
            resource="employees",
            decision="Allowed",
            reason=f"Employee {employee_id} updated.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return updated

    def delete_employee(self, db: Session, employee_id: str, operator_id: Optional[str] = None) -> None:
        db_employee = self.get_employee(db, employee_id)
        self.repo.delete(db, db_employee)

        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="delete_employee",
            operation="DELETE",
            resource="employees",
            decision="Allowed",
            reason=f"Employee {employee_id} deleted.",
            risk_score=0,
            status="success"
        ))
        db.commit()

    # Roles Services
    def get_roles(self, db: Session) -> List[Role]:
        return self.repo.get_roles(db)
