import time
import datetime
from typing import Dict, Any, List, Union, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.employee import Employee
from ..models.customer import Customer
from ..models.order import Order, Refund
from ..models.session import Session as SessionModel
from ..models.security import PermissionManifest, AuditLog, SecurityAlert
from ..services.ai_service import AIService

class ABACDecision:
    def __init__(self, decision: str, reason: str, failed_stage: str):
        self.decision = decision # "ALLOW" or "DENY"
        self.reason = reason
        self.failed_stage = failed_stage # "Gateway", "Permission Manifest", "ABAC", "Scope"

class ABACEngine:
    @staticmethod
    def evaluate(db: Session, session: dict, resource: Any, tool: str, operation: str, manifest_allowed: bool, params: dict) -> ABACDecision:
        role = session.get("role")
        user_id = session.get("user_id")
        user_region = session.get("region")

        # Phase 4: Permission Check
        if not manifest_allowed:
            return ABACDecision(
                decision="DENY",
                reason=f"Role '{role}' is not permitted to perform '{operation}' on tool '{tool}'.",
                failed_stage="Permission Manifest"
            )

        # Phase 5: Scope Validation (ABAC)
        if role == "Admin":
            return ABACDecision(decision="ALLOW", reason="Admins have full operational access.", failed_stage="")

        # Resolve target customer record for attribute resolution
        target_customer = None
        if tool == "crm.customer" and isinstance(resource, Customer):
            target_customer = resource
        elif tool == "crm.order" and isinstance(resource, Order):
            target_customer = resource.customer
        elif tool == "crm.refund" and isinstance(resource, Refund):
            target_customer = resource.customer

        if not target_customer:
            # Fallback parameters-based customer resolution
            c_id = params.get("customer_id")
            if c_id and not str(c_id).startswith("{"):
                target_customer = db.query(Customer).filter(Customer.customer_id == c_id.upper()).first()
            if not target_customer:
                o_id = params.get("order_id")
                if o_id and not str(o_id).startswith("{"):
                    order = db.query(Order).filter(Order.order_id == o_id.upper()).first()
                    if order:
                        target_customer = order.customer
            if not target_customer:
                r_id = params.get("refund_id")
                if r_id and not str(r_id).startswith("{"):
                    refund = db.query(Refund).filter(Refund.refund_id == r_id.upper()).first()
                    if refund:
                        target_customer = refund.customer

        op_lower = operation.lower()

        if role == "Manager":
            # Manager blocks deletes for ALL tools EXCEPT crm.customer and crm.order
            if op_lower == "delete" and tool not in ("crm.customer", "crm.order"):
                return ABACDecision(
                    decision="DENY",
                    reason="Manager role is restricted from performing delete operations on this resource.",
                    failed_stage="Permission Manifest"
                )

            # Customer Tool Rules
            if tool == "crm.customer":
                if op_lower in ("create",):
                    # Check if region matches manager's region
                    target_region = None
                    if params.get("region"):
                        target_region = params.get("region")
                    elif prompt:
                        all_regions = ["coimbatore", "bangalore", "hyderabad", "kochin", "kolkata"]
                        prompt_lower = prompt.lower()
                        for reg in all_regions:
                            if reg in prompt_lower:
                                target_region = reg.capitalize()
                                break
                    
                    if not target_region or target_region.lower() != user_region.lower():
                        return ABACDecision(
                            decision="DENY",
                            reason=f"The region should be {user_region}.",
                            failed_stage="Scope Validation"
                        )
                if target_customer and target_customer.region != user_region:
                    return ABACDecision(
                        decision="DENY",
                        reason=f"Manager {user_id} belongs to '{user_region}' Region. Requested customer belongs to '{target_customer.region}' Region.",
                        failed_stage="Scope Validation"
                    )

            # Order Tool Rules
            elif tool == "crm.order":
                if op_lower in ("create",):
                    return ABACDecision(
                        decision="DENY",
                        reason="Manager role is restricted from creating orders.",
                        failed_stage="Permission Manifest"
                    )
                if op_lower == "delete":
                    # Check if order is in PENDING_DELETE status
                    order_id = params.get("order_id")
                    if order_id:
                        order = db.query(Order).filter(Order.order_id == order_id.upper()).first()
                        if order and order.order_status == "PENDING_DELETE":
                            pass
                        else:
                            return ABACDecision(
                                decision="DENY",
                                reason="Manager can only delete orders that are in a PENDING_DELETE status.",
                                failed_stage="Permission Manifest"
                            )
                    else:
                        return ABACDecision(
                            decision="DENY",
                            reason="Manager is restricted from performing bulk delete operations on orders.",
                            failed_stage="Permission Manifest"
                        )
                if target_customer and target_customer.region != user_region:
                    return ABACDecision(
                        decision="DENY",
                        reason=f"Manager {user_id} belongs to '{user_region}' Region. Requested order's customer belongs to '{target_customer.region}' Region.",
                        failed_stage="Scope Validation"
                    )

            # Refund Tool Rules
            elif tool == "crm.refund":
                if target_customer and target_customer.region != user_region:
                    return ABACDecision(
                        decision="DENY",
                        reason=f"Manager {user_id} belongs to '{user_region}' Region. Requested refund's customer belongs to '{target_customer.region}' Region.",
                        failed_stage="Scope Validation"
                    )

            # Employee Tool Rules
            elif tool == "crm.employee":
                if op_lower in ("create", "update"):
                    return ABACDecision(
                        decision="DENY",
                        reason="Manager role is restricted from modifying employee profiles.",
                        failed_stage="Permission Manifest"
                    )
                if resource and getattr(resource, "region", None) != user_region:
                    return ABACDecision(
                        decision="DENY",
                        reason=f"Manager {user_id} belongs to '{user_region}' Region. Target employee belongs to '{resource.region}' Region.",
                        failed_stage="Scope Validation"
                    )

            return ABACDecision(decision="ALLOW", reason="Manager request meets regional validation constraints.", failed_stage="")

        elif role == "Customer":
            session_customer_id = session.get("customer_id")

            # Customer Tool Rules
            if tool == "crm.customer":
                if op_lower in ("create", "update", "delete"):
                    return ABACDecision(
                        decision="DENY",
                        reason="Customer role is restricted from modifying customer profiles.",
                        failed_stage="Permission Manifest"
                    )
                if target_customer and target_customer.customer_id != session_customer_id:
                    return ABACDecision(
                        decision="DENY",
                        reason=f"Customer can only access their own record. Requested customer ID is '{target_customer.customer_id}'.",
                        failed_stage="Scope Validation"
                    )

            # Order Tool Rules
            elif tool == "crm.order":
                if op_lower in ("update", "delete"):
                    return ABACDecision(
                        decision="DENY",
                        reason="Customer role is restricted from modifying or deleting orders directly.",
                        failed_stage="Permission Manifest"
                    )
                if op_lower == "create":
                    param_cust_id = params.get("customer_id")
                    if param_cust_id and param_cust_id.upper() != session_customer_id.upper():
                        return ABACDecision(
                            decision="DENY",
                            reason=f"Customer can only place orders for themselves. Requested customer ID is '{param_cust_id}'.",
                            failed_stage="Scope Validation"
                        )
                if target_customer and target_customer.customer_id != session_customer_id:
                    return ABACDecision(
                        decision="DENY",
                        reason=f"Customer can only access their own orders. Requested order belongs to customer ID '{target_customer.customer_id}'.",
                        failed_stage="Scope Validation"
                    )

            # Refund Tool Rules
            elif tool == "crm.refund":
                if op_lower in ("update", "delete", "approve", "reject"):
                    return ABACDecision(
                        decision="DENY",
                        reason="Customer role is restricted from approving or updating refunds.",
                        failed_stage="Permission Manifest"
                    )
                if op_lower == "create":
                    param_cust_id = params.get("customer_id")
                    if param_cust_id and param_cust_id.upper() != session_customer_id.upper():
                        return ABACDecision(
                            decision="DENY",
                            reason=f"Customer can only submit refund requests for themselves. Requested customer ID is '{param_cust_id}'.",
                            failed_stage="Scope Validation"
                        )
                    order_id = params.get("order_id")
                    if order_id:
                        order = db.query(Order).filter(Order.order_id == order_id.upper()).first()
                        if not order or order.customer_id.upper() != session_customer_id.upper():
                            return ABACDecision(
                                decision="DENY",
                                reason="Customer can only submit refund requests for their own orders.",
                                failed_stage="Scope Validation"
                            )
                if target_customer and target_customer.customer_id != session_customer_id:
                    return ABACDecision(
                        decision="DENY",
                        reason=f"Customer can only access their own refunds. Requested refund belongs to customer ID '{target_customer.customer_id}'.",
                        failed_stage="Scope Validation"
                    )

            # Employee/Dashboard Blocks
            elif tool in ("crm.employee", "crm.dashboard"):
                return ABACDecision(
                    decision="DENY",
                    reason="Customer role has no access permission for administrative modules.",
                    failed_stage="Permission Manifest"
                )

            return ABACDecision(decision="ALLOW", reason="Customer request meets ownership validation constraints.", failed_stage="")

        return ABACDecision(decision="DENY", reason="Role context is not supported.", failed_stage="Gateway")


class SecurityGateway:
    def __init__(self):
        self.ai_service = AIService()

    def resolve_session_context(self, db: Session, user: Any, session_id: str) -> dict:
        role_name = getattr(user, "role", "Customer")
        if role_name == "customer":
            role_name = "Customer"
        elif role_name == "admin":
            role_name = "Admin"
        elif role_name == "manager":
            role_name = "Manager"

        # Casing normalization for other roles
        if role_name in ("support", "Support"):
            role_name = "Support"
        elif role_name in ("hr", "HR"):
            role_name = "HR"
        elif role_name in ("finance", "Finance"):
            role_name = "Finance"

        # Determine department
        dept = "Support"
        if role_name == "Admin":
            dept = "Admin"
        elif role_name == "Manager":
            dept = "Management"
        elif role_name == "Customer":
            dept = "Customer"
        else:
            dept = role_name

        login_time_str = datetime.datetime.utcnow().isoformat()
        if session_id:
            sess_record = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
            if sess_record and sess_record.login_time:
                login_time_str = sess_record.login_time.isoformat() if hasattr(sess_record.login_time, "isoformat") else str(sess_record.login_time)

        return {
            "user_id": user.employee_id,
            "role": role_name,
            "session_id": session_id or "sess_direct_api",
            "region": getattr(user, "region", None) if role_name != "Admin" else None,
            "department": dept,
            "customer_id": user.customer_id if role_name == "Customer" else None,
            "manager_id": user.employee_id if role_name == "Manager" else None,
            "employee_id": user.employee_id if role_name != "Customer" else None,
            "login_time": login_time_str
        }

    def resolve_resource(self, db: Session, tool: str, operation: str, parameters: dict) -> Any:
        """Fetches the target database resource based on parameter IDs"""
        try:
            if tool == "crm.customer":
                c_id = parameters.get("customer_id")
                if c_id:
                    return db.query(Customer).filter(Customer.customer_id == c_id.upper()).first()
            elif tool == "crm.order":
                o_id = parameters.get("order_id")
                if o_id:
                    return db.query(Order).filter(Order.order_id == o_id.upper()).first()
            elif tool == "crm.refund":
                r_id = parameters.get("refund_id")
                if r_id:
                    return db.query(Refund).filter(Refund.refund_id == r_id.upper()).first()
            elif tool == "crm.employee":
                e_id = parameters.get("employee_id")
                if e_id:
                    return db.query(Employee).filter(Employee.employee_id == e_id.upper()).first()
        except Exception:
            pass
        return None

    def execute_with_gateway(self, db: Session, user: Any, tool_call: Union[dict, list], prompt: str = "") -> dict:
        t_start = time.perf_counter()
        
        # 1. Load Session Context
        session_context = self.resolve_session_context(db, user, getattr(user, "session_id", None))
        
        pipeline_metrics = {
            "prompt": {"status": "Success", "latency_ms": 0.0},
            "groq": {"status": "Success", "latency_ms": 0.0},
            "validation": {"status": "Success", "latency_ms": 0.0},
            "gateway": {"status": "Success", "latency_ms": 0.0},
            "permission": {"status": "Pending", "latency_ms": 0.0},
            "abac": {"status": "Pending", "latency_ms": 0.0},
            "scope": {"status": "Pending", "decision": "PENDING", "latency_ms": 0.0},
            "executor": {"status": "Pending", "latency_ms": 0.0}
        }

        # Measure Gateway interception start
        gw_start = time.perf_counter()
        pipeline_metrics["gateway"]["latency_ms"] = (time.perf_counter() - gw_start) * 1000.0

        # Normalization into sequential execution steps
        calls = tool_call if isinstance(tool_call, list) else [tool_call]
        
        execution_results = []
        
        for idx, call in enumerate(calls):
            # Parse individual tool/operation details
            tool = call.get("tool")
            operation = call.get("operation")
            params = call.get("parameters", {})
            
            # If manager list/search query, check if they are querying other regions
            if session_context["role"] == "Manager" and tool == "crm.customer" and operation in ("list", "search"):
                mgr_region = session_context["region"]
                all_regions = ["coimbatore", "bangalore", "hyderabad", "kochin", "kolkata"]
                
                target_other_region = False
                requested_region = params.get("region")
                if requested_region and requested_region.lower() != mgr_region.lower():
                    target_other_region = True
                
                q = params.get("query")
                if q and not target_other_region:
                    q_lower = q.lower()
                    for reg in all_regions:
                        if reg != mgr_region.lower() and reg in q_lower:
                            target_other_region = True
                            break
                            
                if target_other_region:
                    block_res = self._build_blocked_response(
                        db,
                        role=session_context["role"],
                        op=operation,
                        res="Customer",
                        reason=f"You cannot access other regions. If you want, we can provide the email IDs from your region, i.e., {mgr_region}.",
                        stage="Scope Validation",
                        metrics_total=(time.perf_counter() - t_start) * 1000.0,
                        pipeline=pipeline_metrics,
                        sess=session_context,
                        prompt=prompt,
                        tool_call=call
                    )
                    self._audit_block(db, user, tool, operation, block_res["error"]["reason"])
                    return block_res
                    
                # Quietly inject region filter constraint for allowed queries
                params["region"] = mgr_region

            # Auto-resolve placeholder or name to customer_id by name lookup if necessary
            if tool == "crm.customer" and operation in ("read", "update", "delete"):
                c_id = params.get("customer_id")
                is_placeholder = not c_id or c_id == "CUSXXXXXX" or not c_id.startswith("CUS")
                if is_placeholder:
                    target_name = None
                    if c_id and not c_id.startswith("CUS") and not c_id.startswith("{customer"):
                        target_name = c_id
                    elif params.get("full_name"):
                        target_name = params.get("full_name")
                    
                    if not target_name:
                        for c in calls:
                            if c.get("tool") == "crm.customer" and c.get("operation") == "search":
                                q = c.get("parameters", {}).get("query")
                                if q and not q.startswith("region:"):
                                    target_name = q
                                    break
                    
                    if target_name:
                        cust_query = db.query(Customer)
                        if session_context["role"] == "Manager":
                            cust_query = cust_query.filter(Customer.region == session_context["region"])
                        
                        from sqlalchemy import or_
                        matches = cust_query.filter(
                            or_(
                                Customer.full_name.ilike(f"%{target_name}%"),
                                Customer.email.ilike(f"%{target_name}%"),
                                Customer.customer_id.ilike(f"%{target_name}%")
                            )
                        ).all()
                        if len(matches) > 1:
                            reg_str = f" in '{session_context['region']}' region" if session_context["role"] == "Manager" else ""
                            block_res = self._build_blocked_response(
                                db,
                                role=session_context["role"],
                                op=operation,
                                res="Customer",
                                reason=f"There are many people with name '{target_name}'{reg_str}. Please provide some other detail (like email or customer ID).",
                                stage="Scope Validation",
                                metrics_total=(time.perf_counter() - t_start) * 1000.0,
                                pipeline=pipeline_metrics,
                                sess=session_context,
                                prompt=prompt,
                                tool_call=call
                            )
                            self._audit_block(db, user, tool, operation, block_res["error"]["reason"])
                            return block_res
                        elif len(matches) == 1:
                            params["customer_id"] = matches[0].customer_id
                            call["parameters"]["customer_id"] = matches[0].customer_id
                        else:
                            suggestion = self._suggest_closest_customer(db, target_name, session_context["region"] if session_context["role"] == "Manager" else None)
                            if suggestion:
                                block_res = self._build_blocked_response(
                                    db,
                                    role=session_context["role"],
                                    op=operation,
                                    res="Customer",
                                    reason=f"No such candidate found. Did you mean '{suggestion}'?",
                                    stage="Scope Validation",
                                    metrics_total=(time.perf_counter() - t_start) * 1000.0,
                                    pipeline=pipeline_metrics,
                                    sess=session_context,
                                    prompt=prompt,
                                    tool_call=call
                                )
                                self._audit_block(db, user, tool, operation, block_res["error"]["reason"])
                                return block_res
                            else:
                                # Proceed to let the executor fail the call individually rather than blocking the whole batch
                                pass

            # If Customer attempts to read/search customer details, restrict to own profile
            if session_context["role"] == "Customer" and tool == "crm.customer":
                cust = db.query(Customer).filter(Customer.customer_id == session_context["user_id"]).first()
                if cust:
                    q = None
                    if operation == "search":
                        q = params.get("query")
                    elif operation == "read":
                        q = params.get("customer_id")
                    
                    is_own = True
                    if q:
                        q_lower = q.lower().strip()
                        name_lower = cust.full_name.lower().strip()
                        email_lower = cust.email.lower().strip()
                        id_lower = cust.customer_id.lower().strip()
                        
                        matched = (
                            q_lower in name_lower or
                            q_lower in email_lower or
                            q_lower in id_lower or
                            q_lower in ("my", "me", "self", "my data", "get my data")
                        )
                        if not matched:
                            is_own = False
                            
                    if not is_own:
                        block_res = self._build_blocked_response(
                            db,
                            role=session_context["role"],
                            op=operation,
                            res="Customer",
                            reason="You cannot access other customers' details.",
                            stage="Scope Validation",
                            metrics_total=(time.perf_counter() - t_start) * 1000.0,
                            pipeline=pipeline_metrics,
                            sess=session_context,
                            prompt=prompt,
                            tool_call=call
                        )
                        self._audit_block(db, user, tool, operation, block_res["error"]["reason"])
                        return block_res
                    
                    # Auto-route search/read queries for own records to read their own Customer ID
                    if operation in ("read", "search"):
                        operation = "read"
                        call["operation"] = "read"
                        params["customer_id"] = cust.customer_id
                        call["parameters"]["customer_id"] = cust.customer_id

            # Step 1: Resolve Resource attributes from database
            resource = self.resolve_resource(db, tool, operation, params)
            
            # Map incoming tool call to manifest tool name
            manifest_tool_name = tool
            if tool.startswith("crm."):
                res_name = tool.split(".")[-1]
                if res_name == "customer":
                    if operation == "read":
                        manifest_tool_name = "read_customer"
                    elif operation in ("list", "search"):
                        manifest_tool_name = "list_customers"
                    elif operation == "update":
                        manifest_tool_name = "update_customer"
                    elif operation == "delete":
                        manifest_tool_name = "delete_customer"
                elif res_name == "order":
                    manifest_tool_name = "read_orders"
                elif res_name == "refund":
                    if operation in ("read", "list"):
                        manifest_tool_name = "read_refunds"
                    elif operation in ("approve", "reject", "update"):
                        manifest_tool_name = "update_refund_status"
                elif res_name == "employee":
                    manifest_tool_name = "read_employee"

            # Step 2: Load permission manifest rules for user role
            perm_start = time.perf_counter()
            manifest_row = db.query(PermissionManifest).filter(
                (PermissionManifest.role == session_context["role"]) & 
                (PermissionManifest.tool_name == manifest_tool_name)
            ).first()
            
            # Admins always allowed by manifest, fallback support checks
            manifest_allowed = True
            if session_context["role"] != "Admin":
                # Special overrides to support delegated workflows
                is_override = False
                if session_context["role"] == "Manager" and tool == "crm.customer" and operation in ("create", "delete"):
                    is_override = True
                elif session_context["role"] == "Customer" and tool in ("crm.order", "crm.refund") and operation in ("create", "read", "list", "search"):
                    is_override = True

                if is_override:
                    manifest_allowed = True
                elif manifest_row:
                    manifest_allowed = manifest_row.allowed
                    # Normalize operation into database permission manifest category
                    op_category = operation.lower()
                    if op_category in ("read", "list", "search"):
                        op_category = "read"
                    elif op_category in ("update", "approve", "reject"):
                        op_category = "update"
                    elif op_category in ("create",):
                        op_category = "write"

                    # Check custom operation permissions if present
                    if manifest_row.operation and op_category not in manifest_row.operation.lower():
                        manifest_allowed = False
                else:
                    # Default deny if no manifest mapping exists
                    manifest_allowed = False

            pipeline_metrics["permission"]["latency_ms"] = (time.perf_counter() - perm_start) * 1000.0
            
            if not manifest_allowed:
                pipeline_metrics["permission"]["status"] = "Blocked"
                block_res = self._build_blocked_response(
                    db,
                    role=session_context["role"],
                    op=operation,
                    res=tool.split(".")[-1].title(),
                    reason=f"Role '{session_context['role']}' is not permitted to execute operation '{operation}' on '{tool}'.",
                    stage="Permission Manifest",
                    metrics_total=(time.perf_counter() - t_start) * 1000.0,
                    pipeline=pipeline_metrics,
                    sess=session_context,
                    prompt=prompt,
                    tool_call=call
                )
                self._audit_block(db, user, tool, operation, block_res["error"]["reason"])
                return block_res
            
            pipeline_metrics["permission"]["status"] = "Success"

            # Step 3: Evaluate ABAC Rules
            abac_start = time.perf_counter()
            decision_obj = ABACEngine.evaluate(db, session_context, resource, tool, operation, manifest_allowed, params)
            pipeline_metrics["abac"]["latency_ms"] = (time.perf_counter() - abac_start) * 1000.0
            
            if decision_obj.decision == "DENY":
                pipeline_metrics["abac"]["status"] = "Blocked"
                block_res = self._build_blocked_response(
                    db,
                    role=session_context["role"],
                    op=operation,
                    res=tool.split(".")[-1].title(),
                    reason=decision_obj.reason,
                    stage=decision_obj.failed_stage,
                    metrics_total=(time.perf_counter() - t_start) * 1000.0,
                    pipeline=pipeline_metrics,
                    sess=session_context,
                    prompt=prompt,
                    tool_call=call
                )
                self._audit_block(db, user, tool, operation, decision_obj.reason)
                return block_res
            
            pipeline_metrics["abac"]["status"] = "Success"
            pipeline_metrics["scope"]["status"] = "Success"
            pipeline_metrics["scope"]["decision"] = "ALLOW"

            # Step 4: Dispatch Tool Execution
            exec_start = time.perf_counter()
            try:
                # Run the exact execution in CRM
                res_data = self.ai_service.execute_tool_call(db, call, user.employee_id)
                execution_results.append(res_data)
            except Exception as e:
                execution_results.append({"success": False, "error": str(e)})
            pipeline_metrics["executor"]["latency_ms"] = (time.perf_counter() - exec_start) * 1000.0
            pipeline_metrics["executor"]["status"] = "Success"
            
            # Log successful gateway execution in AuditLog
            try:
                import json
                db.add(AuditLog(
                    user_id=session_context["user_id"],
                    session_id=session_context["session_id"],
                    tool_name=tool,
                    operation=operation,
                    resource=tool.split(".")[-1] + "s",
                    decision="Allowed",
                    reason=f"Security Gateway allowed execution of {operation} on {tool}.",
                    risk_score=0,
                    status="success",
                    original_prompt=prompt,
                    generated_tool=json.dumps(call),
                    execution_time=pipeline_metrics["executor"]["latency_ms"]
                ))
                db.commit()
            except Exception:
                pass
        # Define response data from execution results
        response_data = execution_results[0] if not isinstance(tool_call, list) else {
            "success": True,
            "data": execution_results
        }

        # Step 5: Invoke PII Output Shield
        from ..utils.pii_shield import PIIOutputShield
        redacted_data, masked_fields, pii_latency = PIIOutputShield.redact_payload(response_data)
        
        # Record PII Shield latency & status
        pipeline_metrics["pii_shield"] = {
            "status": "Success",
            "latency_ms": pii_latency,
            "fields_masked": list(masked_fields)
        }

        # Log system audit log if fields were masked
        if masked_fields:
            try:
                db.add(AuditLog(
                    user_id=session_context["user_id"],
                    session_id=session_context["session_id"],
                    tool_name="pii_shield",
                    operation="REDACT",
                    resource="gateway_response",
                    decision="Allowed",
                    reason=f"PII Shield Executed. Fields Masked: {', '.join(masked_fields)}. Masking Latency: {pii_latency} ms. Status: Success.",
                    risk_score=0,
                    status="success"
                ))
                db.commit()
            except Exception:
                pass
        else:
            pipeline_metrics["pii_shield"] = {
                "status": "Success",
                "latency_ms": pii_latency,
                "fields_masked": []
            }

        # Final Response packing
        total_time = (time.perf_counter() - t_start) * 1000.0
        
        # Serialize response size check
        import json
        size_bytes = len(json.dumps(redacted_data))

        # Get active session count
        v_count = 0
        threat_level = "Safe"
        sess_id = session_context.get("session_id")
        if sess_id:
            sess_record = db.query(SessionModel).filter(SessionModel.session_id == sess_id).first()
            if sess_record:
                v_count = sess_record.violation_count or 0
                
        if v_count == 1:
            threat_level = "Warning"
        elif v_count == 2:
            threat_level = "High Risk"
        elif v_count >= 3:
            threat_level = "Critical"

        return {
            "success": True,
            "data": redacted_data.get("data", redacted_data) if "success" in redacted_data else redacted_data,
            "metrics": {
                "status": "Success",
                "execution_time_ms": round(total_time, 2),
                "response_size_bytes": size_bytes,
                "pipeline": pipeline_metrics,
                "session": {
                    "role": session_context["role"],
                    "region": session_context["region"] or "Global",
                    "department": session_context["department"],
                    "user_id": session_context["user_id"],
                    "violation_count": v_count,
                    "threat_level": threat_level,
                    "session_terminated": (v_count >= 3)
                }
            }
        }

    def _build_blocked_response(self, db: Session, role: str, op: str, res: str, reason: str, stage: str, metrics_total: float, pipeline: dict, sess: dict, prompt: str = "", tool_call: Any = None) -> dict:
        sess_id = sess.get("session_id")
        user_id = sess.get("user_id")
        
        # Check if this block should be treated as an attack (incrementing violation counters and alert generation)
        # "for deletion alone have the atack check"
        is_attack = True
        if role == "Manager" and op != "delete":
            is_attack = False

        v_count = 0
        sess_record = None
        if sess_id:
            sess_record = db.query(SessionModel).filter(SessionModel.session_id == sess_id).first()
            if sess_record:
                v_count = sess_record.violation_count or 0

        if is_attack:
            v_count += 1
            if sess_record:
                sess_record.violation_count = v_count
                db.commit()

        # Map threat level
        if v_count == 1:
            threat_level = "Warning"
        elif v_count == 2:
            threat_level = "High Risk"
        elif v_count >= 3:
            threat_level = "Critical"
        else:
            threat_level = "Safe"

        # Update node status in pipeline metrics for the visual graph
        # Map success/block states
        node_status = {
            "prompt": "Success",
            "groq": "Success",
            "validation": "Success",
            "gateway": "Success",
            "permission": "Success" if stage not in ("Gateway", "Permission Manifest") else "Blocked",
            "abac": "Success" if stage not in ("Gateway", "Permission Manifest", "ABAC") else ("Blocked" if stage == "ABAC" else "Skipped"),
            "scope": "Success" if stage not in ("Gateway", "Permission Manifest", "ABAC", "Scope Validation") else ("Blocked" if stage == "Scope Validation" else "Skipped"),
            "decision": "Blocked",
            "threat_engine": "Success",
            "pii_shield": "Skipped",
            "audit_log": "Success",
            "final_response": "Blocked"
        }

        # Build full decision trace JSON
        import json
        trace_data = {
            "original_prompt": prompt or f"Attempted operation {op} on {res}",
            "generated_tool": json.dumps(tool_call) if tool_call else f"{{\"tool\": \"crm.{res.lower()}\", \"operation\": \"{op}\"}}",
            "user_id": user_id,
            "user_role": role,
            "session_id": sess_id,
            "failed_stage": stage,
            "reason": reason,
            "threat_level": threat_level,
            "latency_ms": {
                "prompt": 50.0,
                "groq": 280.0,
                "validation": 2.0,
                "gateway": pipeline["gateway"]["latency_ms"],
                "permission": pipeline["permission"]["latency_ms"],
                "abac": pipeline["abac"]["latency_ms"],
                "scope": pipeline["scope"]["latency_ms"],
                "executor": 0.0,
                "pii_shield": 0.0
            },
            "node_status": node_status
        }
        
        decision_trace_str = json.dumps(trace_data)

        alert_id = None
        session_terminated = False

        if is_attack:
            # 2. Generate AI-powered incident summary using Groq
            ai_summary = "Could not generate AI investigation summary."
            try:
                ai_summary = self._generate_ai_incident_summary(prompt, tool_call, role, user_id, reason, stage)
            except Exception as ex:
                ai_summary = f"Error generating AI summary: {ex}"

            # 3. Create Security Alert for EVERY blocked request
            alert_type = "Potential Probing Behaviour"
            if stage == "Permission Manifest":
                alert_type = "Unauthorized Operation Attempt"
            elif stage == "ABAC":
                alert_type = "ABAC Policy Violation"
            elif stage == "Scope Validation":
                alert_type = "Data Scope/Ownership Intrusion"

            alert = SecurityAlert(
                session_id=sess_id,
                user_id=user_id,
                alert_type=alert_type,
                severity="Critical" if v_count >= 3 else ("High" if v_count == 2 else "Medium"),
                risk_score=95 if v_count >= 3 else (60 if v_count == 2 else 30),
                reason=reason,
                decision_trace=decision_trace_str,
                status="Pending Investigation",
                threat_level=threat_level,
                violation_count=v_count,
                triggered_rule=stage,
                user_role=role,
                investigation_notes=ai_summary
            )
            db.add(alert)
            db.commit()
            alert_id = alert.alert_id

            # 4. Audit: Alert Creation
            db.add(AuditLog(
                user_id=user_id,
                session_id=sess_id,
                tool_name="security_alert",
                operation="CREATE",
                resource="security_alerts",
                decision="Allowed",
                reason=f"Security alert {alert_id} created for user {user_id} due to {stage} block.",
                risk_score=95 if v_count >= 3 else 30,
                status="success",
                original_prompt=prompt,
                generated_tool=json.dumps(tool_call) if tool_call else None,
                decision_trace=decision_trace_str,
                security_alert_id=alert_id
            ))
            db.commit()

            # Audit: Threat Meter Update
            db.add(AuditLog(
                user_id=user_id,
                session_id=sess_id,
                tool_name="threat_meter",
                operation="UPDATE",
                resource="threat_meter",
                decision="Allowed",
                reason=f"Threat meter updated. Violation count: {v_count}. Threat Level: {threat_level}.",
                risk_score=5 if v_count < 3 else 90,
                status="success",
                original_prompt=prompt,
                generated_tool=json.dumps(tool_call) if tool_call else None,
                decision_trace=decision_trace_str,
                security_alert_id=alert_id
            ))
            db.commit()

            # Handle Critical Threshold (>= 3 violations) -> Invalidate session & lock account
            if v_count >= 3:
                session_terminated = True
                
                # Terminate Session
                if sess_record:
                    sess_record.session_status = "Terminated"
                    sess_record.logout_time = datetime.datetime.utcnow()
                    db.commit()
                    db.add(AuditLog(
                        user_id=user_id,
                        session_id=sess_id,
                        tool_name="session_termination",
                        operation="TERMINATE",
                        resource="sessions",
                        decision="Allowed",
                        reason=f"Session {sess_id} automatically terminated due to critical threat.",
                        risk_score=90,
                        status="success",
                        security_alert_id=alert_id
                    ))
                    db.commit()
                
                # Suspend user account
                try:
                    if role == "Customer":
                        cust = db.query(Customer).filter(Customer.customer_id == user_id).first()
                        if cust:
                            cust.status = "Suspended"
                            db.commit()
                    else:
                        emp = db.query(Employee).filter(Employee.employee_id == user_id).first()
                        if emp:
                            emp.status = "Suspended"
                            db.commit()
                    
                    db.add(AuditLog(
                        user_id=user_id,
                        session_id=sess_id,
                        tool_name="account_suspension",
                        operation="SUSPEND",
                        resource="users",
                        decision="Allowed",
                        reason=f"Account for user {user_id} suspended due to repeated policy violations.",
                        risk_score=95,
                        status="success",
                        security_alert_id=alert_id
                    ))
                    db.commit()
                except Exception:
                    pass

        return {
            "success": False,
            "error": {
                "status": "BLOCKED",
                "decision": "DENY",
                "role": role,
                "requested_operation": op,
                "resource": res,
                "reason": reason,
                "failed_stage": stage,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "violation_count": v_count,
                "threat_level": threat_level,
                "session_terminated": session_terminated,
                "alert_id": alert_id
            },
            "metrics": {
                "status": "Blocked",
                "execution_time_ms": round(metrics_total, 2),
                "response_size_bytes": 280,
                "pipeline": pipeline,
                "session": {
                    "role": sess["role"],
                    "region": sess["region"] or "Global",
                    "department": sess["department"],
                    "user_id": sess["user_id"],
                    "violation_count": v_count,
                    "threat_level": threat_level,
                    "session_terminated": session_terminated
                }
            }
        }

    def _generate_ai_incident_summary(self, prompt: str, tool_call: Any, role: str, user_id: str, reason: str, stage: str) -> str:
        from ..config import settings
        import httpx
        import json
        
        system_prompt = """You are an AI Incident Investigator operating an Enterprise Security Command Center. 
Your task is to analyze a blocked security violation and generate a professional, structured investigation summary.
Your summary must explain:
1. What happened (explain the prompt and the generated tool call)
2. Why the request was blocked (explain the gateway decision and failed validation stage)
3. Which policies were violated (permission rules, regional/ownership access control)
4. Risk Assessment (low, medium, high, critical risk and potential impact)
5. Recommended Administrative Action (e.g. warning email, temporary suspension, permanent disable)

Keep the analysis professional, concise, and structured. Return ONLY the markdown summary without any greeting or extra chatter.
"""
        user_content = f"Original User Prompt: {prompt}\nGenerated Tool Call JSON: {json.dumps(tool_call) if tool_call else 'N/A'}\nUser ID: {user_id}\nRole: {role}\nGateway Block Reason: {reason}\nFailed Validation Stage: {stage}\n"
        
        if settings.GROQ_API_KEY:
            try:
                with httpx.Client(timeout=10.0) as client:
                    res = client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.3-70b-8192" if "llama-3.3-70b" in settings.GROQ_API_KEY else "llama-3.3-70b-versatile",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_content}
                            ],
                            "temperature": 0.0
                        }
                    )
                    if res.status_code == 200:
                        return res.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"Error calling Groq for incident summary: {e}")
                
        return f"""### AI Investigation Summary (Fallback)

*   **Incident Type**: {stage} Block
*   **User Details**: User '{user_id}' with role '{role}'
*   **Gateway Reason**: {reason}
*   **Analysis**: The user attempted to execute an unauthorized operation. The system intercepted this action at the {stage} stage.
*   **Risk**: Low-to-Medium depending on historical violations.
*   **Recommended Action**: Review user permissions or notify administrator.
"""

    def _audit_block(self, db: Session, user: Any, tool: str, operation: str, reason: str) -> None:
        try:
            db.add(AuditLog(
                user_id=user.employee_id,
                tool_name=tool,
                operation=operation,
                resource="gateway",
                decision="Blocked",
                reason=reason,
                risk_score=7,
                status="blocked"
            ))
            db.commit()
        except Exception:
            pass

    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def _suggest_closest_customer(self, db: Session, target_name: str, region: Optional[str] = None) -> Optional[str]:
        query = db.query(Customer)
        if region:
            query = query.filter(Customer.region == region)
        customers = query.all()
        
        closest_name = None
        min_dist = 9999
        target_lower = target_name.lower().strip()
        
        for c in customers:
            name_lower = c.full_name.lower().strip()
            dist = self._levenshtein_distance(target_lower, name_lower)
            if dist < min_dist and dist <= 3:
                min_dist = dist
                closest_name = c.full_name
                
        return closest_name
