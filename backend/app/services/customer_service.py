from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Tuple, Optional
from ..repositories.customer_repository import CustomerRepository
from ..models.customer import Customer, PendingCustomer, CustomerActivity, PendingCustomerUpdate
from ..models.security import AuditLog
from ..schemas.customer import CustomerCreate, CustomerUpdate, CustomerProfileUpdateRequestCreate
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
        # Check operator role
        from ..models.employee import Employee
        operator = None
        if operator_id:
            operator = db.query(Employee).filter(Employee.employee_id == operator_id).first()

        if operator and operator.role and operator.role.lower() == "manager":
            # Enforce region boundary
            if not customer_in.region or customer_in.region.lower() != operator.region.lower():
                raise HTTPException(status_code=400, detail=f"The region should be {operator.region}.")
            
            # Check unique email/phone in active customers
            if self.repo.get_by_email(db, customer_in.email):
                raise HTTPException(status_code=400, detail="Customer email already registered")
            existing_phone = db.query(Customer).filter(Customer.phone == customer_in.phone).first()
            if existing_phone:
                raise HTTPException(status_code=400, detail="Customer phone already registered")

            # Check if already pending to avoid duplicates
            existing_pending = db.query(PendingCustomer).filter(
                (PendingCustomer.email == customer_in.email) | (PendingCustomer.phone == customer_in.phone)
            ).first()
            if existing_pending and existing_pending.request_status == "Pending":
                raise HTTPException(status_code=400, detail="Customer registration request is already pending approval")

            # Create pending customer entry
            db_pending = PendingCustomer(
                full_name=customer_in.full_name,
                email=customer_in.email,
                phone=customer_in.phone,
                address=customer_in.address,
                profile_image=customer_in.profile_image,
                request_status="Pending",
                aadhaar_number=customer_in.aadhaar_number,
                pan_number=customer_in.pan_number,
                card_number=customer_in.card_number,
                region=customer_in.region
            )
            created_pending = self.repo.create_pending(db, db_pending)

            # Log system audit log
            db.add(AuditLog(
                user_id=operator_id,
                tool_name="create_customer_request",
                operation="CREATE",
                resource="pending_customers",
                decision="Allowed",
                reason=f"Manager {operator_id} submitted pending customer registration for {customer_in.full_name}.",
                risk_score=0,
                status="success"
            ))
            db.commit()

            import datetime
            # Return compatible dict representing the pending customer
            return {
                "customer_id": "PENDING",
                "full_name": customer_in.full_name,
                "email": customer_in.email,
                "phone": customer_in.phone,
                "address": customer_in.address,
                "profile_image": customer_in.profile_image,
                "status": "Pending",
                "aadhaar_number": customer_in.aadhaar_number,
                "pan_number": customer_in.pan_number,
                "card_number": customer_in.card_number,
                "region": customer_in.region,
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            }

        # For Admin (or other non-managers), proceed with active customer insertion
        if self.repo.get_by_email(db, customer_in.email):
            raise HTTPException(status_code=400, detail="Customer email already registered")
        
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

        # Generate a fresh random password for the welcome email
        import random, string
        _alphabet = string.ascii_letters + string.digits + "!@#$%"
        temp_password = ''.join(random.choice(_alphabet) for _ in range(12))
        # Update the stored hash to use this generated password
        created.password_hash = hash_password(temp_password)
        db.commit()

        # Send welcome email with login credentials
        try:
            from ..utils.email import send_email
            subject = "Welcome to SecureScope AI Portal - Your Account Credentials"
            body = (
                f"Hello {created.full_name},\n\n"
                f"Your Customer account has been successfully created.\n\n"
                f"=== LOGIN CREDENTIALS ===\n"
                f"Username (Customer ID): {created.customer_id}\n"
                f"Password: {temp_password}\n"
                f"Assigned Region: {created.region or 'Global'}\n\n"
                f"Login Steps:\n"
                f"1. Go to the login page.\n"
                f"2. Enter your Customer ID as the username.\n"
                f"3. Enter the password above.\n"
                f"4. Click 'Sign In'.\n\n"
                f"IMPORTANT: Please change your password immediately after your first login.\n\n"
                f"Thank you,\nSecureScope AI Admin Team"
            )
            send_email(created.email, subject, body)
        except Exception as e:
            print(f"Failed to send email to customer: {e}")
        
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

    def delete_customer(self, db: Session, customer_id: str, operator_id: Optional[str] = None):
        db_customer = self.get_customer(db, customer_id)
        
        # Check operator role
        from ..models.employee import Employee
        operator = None
        if operator_id:
            operator = db.query(Employee).filter(Employee.employee_id == operator_id).first()

        if operator and operator.role and operator.role.lower() == "manager":
            db_customer.status = "PENDING_DELETE"
            # Create a pending update request so it shows up in admin tasks list
            import json
            db_req = PendingCustomerUpdate(
                customer_id=customer_id,
                updates_json=json.dumps({"status": "PENDING_DELETE"}),
                request_status="Pending"
            )
            db.add(db_req)
            db.commit()
            
            # Log system audit log
            db.add(AuditLog(
                user_id=operator_id,
                tool_name="delete_customer_request",
                operation="DELETE_REQUEST",
                resource="customers",
                decision="Allowed",
                reason=f"Manager {operator_id} requested deletion of customer {customer_id}.",
                risk_score=0,
                status="success"
            ))
            db.commit()
            return {
                "deleted": False,
                "status": "pending_approval",
                "message": f"Customer deletion request for {customer_id} has been forwarded to the administrator for approval.",
                "customer_id": customer_id
            }

        # Admin delete logic (hard delete)
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
                
            import random
            import string
            alphabet = string.ascii_letters + string.digits
            temp_password = ''.join(random.choice(alphabet) for _ in range(10))
            
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
            
            # create_customer already sends the welcome email with the generated password.
            
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

    # Customer Profile Update Requests
    def create_update_request(self, db: Session, customer_id: str, updates: dict) -> PendingCustomerUpdate:
        cust = self.repo.get_by_id(db, customer_id)
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Normalize updates if they contain nested dicts with "new_value" key
        normalized_updates = {}
        for k, v in updates.items():
            if isinstance(v, dict) and "new_value" in v:
                normalized_updates[k] = v["new_value"]
            else:
                normalized_updates[k] = v

        import json
        db_req = PendingCustomerUpdate(
            customer_id=customer_id,
            updates_json=json.dumps(normalized_updates),
            request_status="Pending"
        )
        created = self.repo.create_pending_update(db, db_req)
        
        db.add(AuditLog(
            user_id=customer_id,
            tool_name="profile_update_request",
            operation="CREATE",
            resource="pending_customer_updates",
            decision="Allowed",
            reason=f"Customer {customer_id} submitted a profile update request.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return created

    def get_pending_updates(self, db: Session, skip: int = 0, limit: int = 100, region: Optional[str] = None) -> List[PendingCustomerUpdate]:
        return self.repo.get_pending_updates_all(db, skip, limit, region=region)

    def process_update_request(self, db: Session, request_id: int, action: str, operator_id: str, operator_role: str, operator_region: Optional[str] = None) -> PendingCustomerUpdate:
        req = self.repo.get_pending_update_by_id(db, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Profile update request not found")
            
        cust = self.repo.get_by_id(db, req.customer_id)
        if not cust:
            raise HTTPException(status_code=404, detail="Customer associated with request not found")

        # Regional manager check
        if operator_role.lower() == "manager":
            if not operator_region or (cust.region and cust.region.lower() != operator_region.lower()):
                raise HTTPException(
                    status_code=403,
                    detail=f"Only managers assigned to the {cust.region} region can process this update request."
                )

        if action.upper() == "APPROVE":
            req.request_status = "Approved"
            
            import json
            updates = json.loads(req.updates_json)
            
            if updates.get("status") == "PENDING_DELETE":
                # Hard delete customer profile on approval
                self.repo.delete(db, cust)
                db.commit()
                
                db.add(AuditLog(
                    user_id=operator_id,
                    tool_name="approve_customer_deletion",
                    operation="DELETE",
                    resource="customers",
                    decision="Allowed",
                    reason=f"Customer deletion request {request_id} for customer {req.customer_id} approved by admin/manager {operator_id}.",
                    risk_score=0,
                    status="success"
                ))
                db.commit()
                return req

            for k, v in updates.items():
                if k == "password":
                    setattr(cust, "password_hash", hash_password(v))
                elif hasattr(cust, k):
                    setattr(cust, k, v)
                    
            db.commit()

            db.add(AuditLog(
                user_id=operator_id,
                tool_name="approve_profile_update",
                operation="UPDATE",
                resource="customers",
                decision="Allowed",
                reason=f"Profile update request {request_id} for customer {req.customer_id} approved by manager {operator_id}.",
                risk_score=0,
                status="success"
            ))
            db.commit()
        elif action.upper() == "REJECT":
            req.request_status = "Rejected"
            
            import json
            try:
                updates = json.loads(req.updates_json)
                if updates.get("status") == "PENDING_DELETE":
                    # Restore customer status back to active (Approved)
                    cust.status = "Approved"
            except Exception:
                pass
            db.commit()

            # Audit log
            tool_name = "reject_customer_deletion" if updates.get("status") == "PENDING_DELETE" else "reject_profile_update"
            reason_text = f"Customer deletion request {request_id} rejected" if updates.get("status") == "PENDING_DELETE" else f"Profile update request {request_id} rejected"
            
            db.add(AuditLog(
                user_id=operator_id,
                tool_name=tool_name,
                operation="UPDATE",
                resource="customers",
                decision="Allowed",
                reason=f"{reason_text} for customer {req.customer_id} by manager {operator_id}.",
                risk_score=0,
                status="success"
            ))
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Must be APPROVE or REJECT.")

        return req
