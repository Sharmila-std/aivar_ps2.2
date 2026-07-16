from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Tuple, Optional
from ..repositories.customer_repository import CustomerRepository
from ..models.customer import Customer, PendingCustomer, CustomerActivity
from ..models.security import AuditLog
from ..schemas.customer import CustomerCreate, CustomerUpdate, PendingCustomerUpdate
from ..utils.auth import hash_password

class CustomerService:
    def __init__(self):
        self.repo = CustomerRepository()

    def get_customer(self, db: Session, customer_id: str) -> Customer:
        db_customer = self.repo.get_by_id(db, customer_id)
        if not db_customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return db_customer

    def get_customers(
        self,
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "customer_id",
        sort_desc: bool = False,
        skip: int = 0,
        limit: int = 100,
        region: Optional[str] = None
    ) -> Tuple[List[Customer], int]:
        return self.repo.get_all(db, search, status, sort_by, sort_desc, skip, limit, region)

    def create_customer(self, db: Session, customer_in: CustomerCreate, operator_id: Optional[str] = None) -> Customer:
        # Check if email exists
        if self.repo.get_by_email(db, customer_in.email):
            raise HTTPException(status_code=400, detail="Customer email already registered")
        
        # Check phone unique
        # We can query
        existing_phone = db.query(Customer).filter(Customer.phone == customer_in.phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Customer phone already registered")

        db_customer = Customer(
            customer_id=customer_in.customer_id,
            full_name=customer_in.full_name,
            email=customer_in.email,
            phone=customer_in.phone,
            address=customer_in.address,
            profile_image=customer_in.profile_image,
            password_hash=hash_password(customer_in.password),
            status=customer_in.status,
            aadhaar_number=customer_in.aadhaar_number,
            pan_number=customer_in.pan_number,
            card_number=customer_in.card_number,
            region=customer_in.region
        )
        
        created = self.repo.create(db, db_customer)
        
        # Log customer activity
        self.repo.log_activity(
            db,
            CustomerActivity(
                customer_id=created.customer_id,
                activity_type="Creation",
                activity_description=f"Customer record created by employee {operator_id or 'System'}"
            )
        )
        
        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="create_customer",
            operation="CREATE",
            resource="customers",
            decision="Allowed",
            reason=f"Customer {created.customer_id} created successfully.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return created

    def update_customer(self, db: Session, customer_id: str, customer_in: CustomerUpdate, operator_id: Optional[str] = None) -> Customer:
        db_customer = self.get_customer(db, customer_id)
        
        # Updates
        update_data = customer_in.model_dump(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            db_customer.password_hash = hash_password(update_data["password"])
            del update_data["password"]
            
        for key, value in update_data.items():
            setattr(db_customer, key, value)
            
        updated = self.repo.update(db, db_customer)
        
        # Log activity
        self.repo.log_activity(
            db,
            CustomerActivity(
                customer_id=updated.customer_id,
                activity_type="Update",
                activity_description=f"Customer record updated by employee {operator_id or 'System'}"
            )
        )
        
        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="update_customer",
            operation="UPDATE",
            resource="customers",
            decision="Allowed",
            reason=f"Customer {updated.customer_id} updated.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return updated

    def delete_customer(self, db: Session, customer_id: str, operator_id: Optional[str] = None) -> None:
        db_customer = self.get_customer(db, customer_id)
        self.repo.delete(db, db_customer)
        
        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="delete_customer",
            operation="DELETE",
            resource="customers",
            decision="Allowed",
            reason=f"Customer {customer_id} deleted.",
            risk_score=0,
            status="success"
        ))
        db.commit()

    # Pending Customer approval flow
    def get_pending_customers(self, db: Session, skip: int = 0, limit: int = 100) -> List[PendingCustomer]:
        return self.repo.get_pending_all(db, skip, limit)

    def process_pending_customer(self, db: Session, request_id: int, status_in: PendingCustomerUpdate, operator_id: Optional[str] = None) -> PendingCustomer:
        pending = self.repo.get_pending_by_id(db, request_id)
        if not pending:
            raise HTTPException(status_code=404, detail="Pending customer request not found")
        
        pending.request_status = status_in.request_status
        updated = self.repo.update_pending(db, pending)
        
        # If approved, convert to real customer
        if updated.request_status == "Approved":
            # Generate a new Customer ID
            last_cust = db.query(Customer).order_by(Customer.customer_id.desc()).first()
            if last_cust:
                num = int(last_cust.customer_id.replace("CUS", "")) + 1
                new_id = f"CUS{num:06d}"
            else:
                new_id = "CUS000001"
                
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
            
            cust_in = CustomerCreate(
                customer_id=new_id,
                full_name=updated.full_name,
                email=updated.email,
                phone=updated.phone,
                address=updated.address,
                profile_image=updated.profile_image,
                password=temp_password,
                status="Approved",
                aadhaar_number=updated.aadhaar_number,
                pan_number=updated.pan_number,
                card_number=updated.card_number,
                region=updated.region
            )
            self.create_customer(db, cust_in, operator_id)
            
            # Send SMTP Welcome email
            from ..utils.email import send_email
            subject = "Welcome to SecureScope CRM - Your Account is Approved!"
            body = f"""Dear {updated.full_name},

Welcome to the SecureScope CRM Portal! Your registration request has been approved by the administrator.

Here are your account credentials:
- Customer ID: {new_id}
- Temporary Password: {temp_password}

Login Instructions:
1. Go to the login page (http://localhost:5173/).
2. Enter your Customer ID in the Username/Email field.
3. Enter your Temporary Password.
4. Click 'Sign In'.

IMPORTANT: For security purposes, we highly recommend changing your temporary password immediately after your first successful login.

Best regards,
SecureScope Security Gateway Team
"""
            send_email(updated.email, subject, body)
            
        # Log system audit log for approval / rejection
        action_type = "APPROVAL" if status_in.request_status == "Approved" else "REJECTION"
        tool_name = "approve_customer_registration" if status_in.request_status == "Approved" else "reject_customer_registration"
        
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name=tool_name,
            operation=action_type,
            resource="pending_customers",
            decision="Allowed",
            reason=f"Customer registration request {request_id} for '{updated.full_name}' was {status_in.request_status.lower()} by admin {operator_id}.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return updated
