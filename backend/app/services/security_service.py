from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Tuple, Optional
import datetime
from ..repositories.security_repository import SecurityRepository
from ..models.security import PermissionManifest, AuditLog, BlockedSession, SecurityAlert, UserWarning
from ..models.customer import Customer
from ..models.employee import Employee
from ..schemas.security import PermissionManifestCreate, PermissionManifestUpdate, SecurityAlertUpdate

class SecurityService:
    def __init__(self):
        self.repo = SecurityRepository()

    # Permission Manifest Services
    def get_manifest(self, db: Session, manifest_id: int) -> PermissionManifest:
        manifest = self.repo.get_manifest_by_id(db, manifest_id)
        if not manifest:
            raise HTTPException(status_code=404, detail="Permission manifest entry not found")
        return manifest

    def get_manifests(
        self,
        db: Session,
        role: Optional[str] = None,
        tool_name: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[PermissionManifest], int]:
        return self.repo.get_manifest_all(db, role, tool_name, skip, limit)

    def create_manifest(self, db: Session, manifest_in: PermissionManifestCreate) -> PermissionManifest:
        db_manifest = PermissionManifest(
            role=manifest_in.role,
            tool_name=manifest_in.tool_name,
            operation=manifest_in.operation,
            resource=manifest_in.resource,
            allowed=manifest_in.allowed,
            scope_rule=manifest_in.scope_rule,
            description=manifest_in.description
        )
        return self.repo.create_manifest(db, db_manifest)

    def update_manifest(self, db: Session, manifest_id: int, manifest_in: PermissionManifestUpdate) -> PermissionManifest:
        db_manifest = self.get_manifest(db, manifest_id)
        
        update_data = manifest_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_manifest, key, value)
            
        return self.repo.update_manifest(db, db_manifest)

    def delete_manifest(self, db: Session, manifest_id: int) -> None:
        db_manifest = self.get_manifest(db, manifest_id)
        self.repo.delete_manifest(db, db_manifest)

    # Audit Logs
    def get_audit_logs(
        self,
        db: Session,
        user_id: Optional[str] = None,
        operation: Optional[str] = None,
        resource: Optional[str] = None,
        decision: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        order_id: Optional[str] = None,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        user_role: Optional[str] = None,
        region: Optional[str] = None,
        attack_category: Optional[str] = None,
        tool_name: Optional[str] = None
    ) -> Tuple[List[AuditLog], int]:
        logs, total = self.repo.get_audit_logs_all(
            db, user_id, operation, resource, decision, skip, limit,
            customer_id, order_id, request_id, session_id,
            start_date, end_date, user_role, region, attack_category, tool_name
        )

        try:
            from ..models.customer import Customer
            from ..models.employee import Employee
            from ..models.security import SecurityAlert

            # Collect unique IDs to batch-resolve in 3 queries
            all_user_ids = list({lg.user_id for lg in logs if lg.user_id})
            all_alert_ids = list({lg.security_alert_id for lg in logs if lg.security_alert_id})

            # Batch fetch customers and employees
            cust_map: dict = {}
            emp_map: dict = {}
            if all_user_ids:
                custs = db.query(Customer).filter(Customer.customer_id.in_(all_user_ids)).all()
                cust_map = {c.customer_id: c for c in custs}
                remaining = [uid for uid in all_user_ids if uid not in cust_map]
                if remaining:
                    emps = db.query(Employee).filter(Employee.employee_id.in_(remaining)).all()
                    emp_map = {e.employee_id: e for e in emps}

            # Batch fetch alerts
            alert_map: dict = {}
            if all_alert_ids:
                alerts = db.query(SecurityAlert).filter(SecurityAlert.alert_id.in_(all_alert_ids)).all()
                alert_map = {a.alert_id: a for a in alerts}

            # Annotate each log in-memory (no per-row queries)
            for log in logs:
                uid = log.user_id
                role_val = "Unknown"
                region_val = "Unknown"
                if uid in cust_map:
                    role_val = "Customer"
                    region_val = cust_map[uid].region or "Unknown"
                elif uid in emp_map:
                    role_val = emp_map[uid].role or "Unknown"
                    region_val = emp_map[uid].region or "Unknown"

                # Set virtual fields directly on object (safe since session still alive)
                try:
                    log.user_role = role_val
                    log.region = region_val
                    log.request_id = f"REQ{log.log_id:06d}"

                    sev_val = "Low"
                    if log.security_alert_id and log.security_alert_id in alert_map:
                        sev_val = alert_map[log.security_alert_id].severity or "Low"
                    elif log.decision == "Blocked":
                        sev_val = "High"
                    log.severity = sev_val
                except Exception:
                    pass

        except Exception:
            # Fallback — return logs with defaults, never crash the list endpoint
            for log in logs:
                try:
                    log.user_role = getattr(log, "user_role", None) or "Unknown"
                    log.region = getattr(log, "region", None) or "Unknown"
                    log.severity = getattr(log, "severity", None) or "Low"
                    log.request_id = f"REQ{log.log_id:06d}"
                except Exception:
                    pass

        return logs, total

    def log_action(self, db: Session, log_in: AuditLog) -> AuditLog:
        return self.repo.create_audit_log(db, log_in)

    # Blocked Sessions Services
    def get_blocked_sessions(
        self,
        db: Session,
        user_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[BlockedSession], int]:
        return self.repo.get_blocked_sessions_all(db, user_id, is_active, skip, limit)

    def toggle_session_block(self, db: Session, block_id: int, is_active: bool, operator_id: Optional[str] = None) -> BlockedSession:
        block = self.repo.get_blocked_session_by_id(db, block_id)
        if not block:
            raise HTTPException(status_code=404, detail="Blocked session record not found")
        
        block.is_active = is_active
        updated = self.repo.update_blocked_session(db, block)
        
        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="toggle_session_block",
            operation="UPDATE",
            resource="blocked_sessions",
            decision="Allowed",
            reason=f"Session block {block_id} active status updated to {is_active}.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return updated

    # Security Alerts Services
    def get_alert(self, db: Session, alert_id: int) -> SecurityAlert:
        alert = self.repo.get_alert_by_id(db, alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Security alert not found")
        return alert

    def get_alerts(
        self,
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[SecurityAlert], int]:
        return self.repo.get_alerts_all(db, status, severity, skip, limit)

    def update_alert(self, db: Session, alert_id: int, alert_in: SecurityAlertUpdate, operator_id: Optional[str] = None) -> SecurityAlert:
        alert = self.get_alert(db, alert_id)

        update_data = alert_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(alert, key, value)

        if alert_in.status == "RESOLVED":
            alert.resolved_at = datetime.datetime.utcnow()
            alert.resolved_by = operator_id or "System"

        updated = self.repo.update_alert(db, alert)

        # Log system audit log
        db.add(AuditLog(
            user_id=operator_id or "System",
            tool_name="update_alert",
            operation="UPDATE",
            resource="security_alerts",
            decision="Allowed",
            reason=f"Security alert {alert_id} updated. Status: {updated.status}.",
            risk_score=0,
            status="success"
        ))
        db.commit()
        return updated

    def get_alert_details(self, db: Session, alert_id: int) -> dict:
        alert = self.get_alert(db, alert_id)
        
        # Get associated audit logs
        from ..models.security import AuditLog
        logs = db.query(AuditLog).filter(
            (AuditLog.session_id == alert.session_id) | (AuditLog.user_id == alert.user_id)
        ).order_by(AuditLog.timestamp.desc()).all()
        
        # Serialize logs to list of dicts for frontend display
        logs_list = [
            {
                "log_id": log.log_id,
                "timestamp": log.timestamp.isoformat() if hasattr(log.timestamp, "isoformat") else (log.timestamp or datetime.datetime.utcnow().isoformat()),
                "session_id": log.session_id,
                "user_id": log.user_id,
                "tool_name": log.tool_name,
                "operation": log.operation,
                "resource": log.resource,
                "decision": log.decision,
                "reason": log.reason
            }
            for log in logs
        ]
        
        # Get user details
        user_role = alert.user_role or "Customer"
        user_name = "Unknown User"
        if user_role == "Customer":
            cust = db.query(Customer).filter(Customer.customer_id == alert.user_id).first()
            if cust:
                user_name = cust.full_name
        else:
            emp = db.query(Employee).filter(Employee.employee_id == alert.user_id).first()
            if emp:
                user_name = emp.full_name
                
        # Generate LLM Incident Summary if not cached
        investigation_summary = alert.investigation_notes
        if not investigation_summary:
            # Generate summary via Groq
            logs_text = "\n".join([
                f"[{log['timestamp']}] Tool: {log['tool_name']} | Operation: {log['operation']} | Decision: {log['decision']} | Reason: {log['reason']}"
                for log in logs_list[:10]  # Limit to 10 logs for token limit
            ])
            
            prompt = (
                f"User ID: {alert.user_id}\n"
                f"Role: {user_role}\n"
                f"Session ID: {alert.session_id}\n"
                f"Violation Count: {alert.violation_count}\n"
                f"Triggered Rule: {alert.triggered_rule}\n"
                f"Reason for alert: {alert.reason}\n\n"
                f"Recent Audit Logs:\n{logs_text}"
            )
            
            system_prompt = (
                "You are an expert AI Security Analyst. Generate a professional incident report. "
                "You MUST respond in clean Markdown containing exactly these five sections:\n"
                "### Incident Summary\n"
                "[Provide summary here]\n\n"
                "### Potential Cause\n"
                "[Provide potential cause here]\n\n"
                "### Observed Behaviour\n"
                "[Provide observed behavior here]\n\n"
                "### Risk Assessment\n"
                "[Provide risk assessment here]\n\n"
                "### Recommended Administrative Action\n"
                "[Provide recommended action here]"
            )
            
            investigation_summary = "Llama-3 model generated security incident report fallback."
            from ..config import settings
            import httpx
            import json
            if settings.GROQ_API_KEY:
                try:
                    with httpx.Client(timeout=15.0) as client:
                        url = "https://api.groq.com/openai/v1/chat/completions"
                        headers = {
                            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        }
                        payload = {
                            "model": "llama-3.3-70b-8192",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.2
                        }
                        res = client.post(url, headers=headers, json=payload)
                        if res.status_code != 200:
                            if res.status_code in (400, 404) and "model" in res.text:
                                payload["model"] = "llama-3.3-70b-versatile"
                                res = client.post(url, headers=headers, json=payload)
                                
                        if res.status_code == 200:
                            investigation_summary = res.json()["choices"][0]["message"]["content"]
                except Exception as e:
                    print(f"Error calling Groq for incident summary: {e}")
            
            # Cache it
            alert.investigation_notes = investigation_summary
            db.commit()
            
        return {
            "alert_id": alert.alert_id,
            "session_id": alert.session_id,
            "user_id": alert.user_id,
            "user_name": user_name,
            "role": user_role,
            "severity": alert.severity,
            "threat_level": alert.threat_level or "Critical",
            "violation_count": alert.violation_count,
            "security_rule_triggered": alert.triggered_rule or "Too many failed/blocked security operations",
            "reason": alert.reason,
            "status": alert.status,
            "resolution_notes": alert.resolution_notes,
            "investigation_summary": investigation_summary,
            "audit_logs": logs_list
        }

    def send_warning_email_and_unlock(self, db: Session, alert_id: int, operator_id: str) -> dict:
        alert = self.get_alert(db, alert_id)
        
        # 1. Fetch user's email
        user_role = alert.user_role or "Customer"
        user_email = None
        user_name = "User"
        
        if user_role == "Customer":
            cust = db.query(Customer).filter(Customer.customer_id == alert.user_id).first()
            if cust:
                user_email = cust.email
                user_name = cust.full_name
        else:
            emp = db.query(Employee).filter(Employee.employee_id == alert.user_id).first()
            if emp:
                user_email = emp.email
                user_name = emp.full_name
                
        if not user_email:
            user_email = "sarmiladummy@gmail.com"
            
        # 2. Build fixed warning email content
        subject = "Security Notice: Account Restored with Formal Warning"
        body = (
            f"Dear {user_name},\n\n"
            "We are writing to inform you that your account, which was previously suspended due to a "
            "security policy violation, has now been restored and reactivated after administrative review.\n\n"
            "This restoration serves as a formal warning. Please ensure that all future activities comply "
            "with the platform's security policies, access controls, and acceptable usage guidelines.\n\n"
            "Any further violations, including unauthorized access attempts, misuse of system features, "
            "or actions that breach established policies, may result in immediate suspension or permanent "
            "disabling of your account without further notice.\n\n"
            "We encourage you to review and adhere to all applicable security rules and organizational "
            "policies before continuing to use the platform.\n\n"
            "If you believe you have received this notice in error or require clarification regarding the "
            "policy, please contact your system administrator.\n\n"
            "Thank you for your cooperation.\n\n"
            "Kind regards,\n\n"
            "Security Administration Team\n"
            "SecureScope AI – Enterprise Security Gateway\n"
            "System Security & Compliance Team"
        )

        # 3. Send warning email
        from ..utils.email import send_email
        email_sent = send_email(user_email, subject, body)
            
        # Log warning email audit
        db.add(AuditLog(
            user_id=operator_id,
            tool_name="warning_email",
            operation="SEND",
            resource="emails",
            decision="Allowed",
            reason=f"Warning email sent to {user_email}. Success: {email_sent}.",
            risk_score=0,
            status="success" if email_sent else "failed"
        ))
        db.commit()

        # 4. Unlock account
        if user_role == "Customer":
            cust = db.query(Customer).filter(Customer.customer_id == alert.user_id).first()
            if cust:
                cust.status = "Approved"
                db.commit()
        else:
            emp = db.query(Employee).filter(Employee.employee_id == alert.user_id).first()
            if emp:
                emp.status = "Active"
                db.commit()
                
        # Audit Account Unlock
        db.add(AuditLog(
            user_id=operator_id,
            tool_name="account_unlock",
            operation="UNLOCK",
            resource="users",
            decision="Allowed",
            reason=f"Account for user {alert.user_id} unlocked by admin {operator_id}.",
            risk_score=0,
            status="success"
        ))
        db.commit()

        # 5. Resolve Security Alert
        alert.status = "RESOLVED"
        alert.resolution_notes = "Warning Issued"
        alert.resolved_at = datetime.datetime.utcnow()
        alert.resolved_by = operator_id
        db.commit()

        # Audit Administrator Decision
        db.add(AuditLog(
            user_id=operator_id,
            tool_name="admin_decision",
            operation="RESOLVE",
            resource="security_alerts",
            decision="Allowed",
            reason=f"Security alert {alert_id} resolved with warning email.",
            risk_score=0,
            status="success"
        ))
        db.commit()

        return {"success": True, "detail": "Warning email sent and account unlocked successfully."}

    def disable_account_permanently(self, db: Session, alert_id: int, operator_id: str) -> dict:
        alert = self.get_alert(db, alert_id)
        user_role = alert.user_role or "Customer"
        
        # 1. Permanently disable the account
        if user_role == "Customer":
            cust = db.query(Customer).filter(Customer.customer_id == alert.user_id).first()
            if cust:
                cust.status = "Disabled"
                db.commit()
        else:
            emp = db.query(Employee).filter(Employee.employee_id == alert.user_id).first()
            if emp:
                emp.status = "Disabled"
                db.commit()
                
        # Audit Account Disable
        db.add(AuditLog(
            user_id=operator_id,
            tool_name="account_disable",
            operation="DISABLE",
            resource="users",
            decision="Allowed",
            reason=f"Account for user {alert.user_id} permanently disabled by admin {operator_id}.",
            risk_score=0,
            status="success"
        ))
        db.commit()

        # 2. Resolve Security Alert
        alert.status = "RESOLVED"
        alert.resolution_notes = "Account Disabled"
        alert.resolved_at = datetime.datetime.utcnow()
        alert.resolved_by = operator_id
        db.commit()

        # Audit Administrator Decision
        db.add(AuditLog(
            user_id=operator_id,
            tool_name="admin_decision",
            operation="RESOLVE",
            resource="security_alerts",
            decision="Allowed",
            reason=f"Security alert {alert_id} resolved. Account permanently disabled.",
            risk_score=0,
            status="success"
        ))
        db.commit()

        return {"success": True, "detail": "Account permanently disabled and security alert resolved."}

    def get_alert_replay(self, db: Session, alert_id: int) -> dict:
        alert = self.get_alert(db, alert_id)
        import json
        if not alert.decision_trace:
            raise HTTPException(status_code=404, detail="Decision trace not found for this alert. Only alerts generated by blocked gateway actions have a replay trace.")
        try:
            return json.loads(alert.decision_trace)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error parsing decision trace: {e}")

    def get_audit_log_details(self, db: Session, log_id: int) -> dict:
        log = self.repo.get_audit_log_by_id(db, log_id)
        if not log:
            raise HTTPException(status_code=404, detail="Audit log entry not found")

        from ..models.customer import Customer, PendingCustomer, PendingCustomerUpdate
        from ..models.employee import Employee
        from ..models.security import SecurityAlert
        import json

        # ── 1. Resolve User metadata (safe, never crashes) ──────────────────────
        username, role_val, region_val = "Unknown", "Unknown", "Unknown"
        try:
            if log.user_id:
                cust = db.query(Customer).filter(Customer.customer_id == log.user_id).first()
                if cust:
                    username = cust.full_name or log.user_id
                    role_val = "Customer"
                    region_val = cust.region or "Unknown"
                else:
                    emp = db.query(Employee).filter(Employee.employee_id == log.user_id).first()
                    if emp:
                        username = emp.full_name or log.user_id
                        role_val = emp.role or "Unknown"
                        region_val = emp.region or "Unknown"
        except Exception:
            pass

        # ── 2. Determine source ─────────────────────────────────────────────────
        source_val = "Admin Portal"
        if role_val == "Customer":
            source_val = "Customer Portal"
        elif role_val == "Manager":
            source_val = "Manager Portal"
        if log.original_prompt or (log.tool_name and log.tool_name.startswith("crm.")):
            source_val = "AI Workspace"

        # ── 3. Parse stored tool JSON from DB ──────────────────────────────────
        params_dict: dict = {}
        target_cust_id = None
        target_ord_id = None
        if log.generated_tool:
            try:
                raw = json.loads(log.generated_tool)
                if isinstance(raw, dict):
                    inner = raw.get("parameters") or raw.get("arguments") or raw
                    if isinstance(inner, dict):
                        params_dict = inner
                        target_cust_id = inner.get("customer_id") or inner.get("id")
                        target_ord_id = inner.get("order_id")
            except Exception:
                pass

        # ── 4. Pipeline reconstruction from DB fields ─────────────────────────
        # Try to read stored decision_trace (pipeline already captured at request time)
        pipeline_from_db = None
        if log.decision_trace:
            try:
                trace = json.loads(log.decision_trace)
                if isinstance(trace, list) and trace and "name" in trace[0]:
                    pipeline_from_db = trace
            except Exception:
                pass

        if pipeline_from_db:
            nodes = pipeline_from_db
        else:
            # Reconstruct from stored decision + reason (no external deps)
            nodes = [
                {"name": "User Request",                  "status": "PASS", "execution_time": "1.2 ms",   "decision": "Allowed",  "explanation": "Received incoming client request payload."},
                {"name": "Tool Validation",               "status": "PASS", "execution_time": "3.5 ms",   "decision": "Allowed",  "explanation": "Validated tool name schema matches definition."},
                {"name": "Permission Manifest Evaluation","status": "PASS", "execution_time": "5.1 ms",   "decision": "Allowed",  "explanation": "Rule matches manifest permission entry."},
                {"name": "ABAC Evaluation",               "status": "PASS", "execution_time": "8.3 ms",   "decision": "Allowed",  "explanation": "Evaluated attribute rules successfully."},
                {"name": "Region Validation",             "status": "PASS", "execution_time": "4.2 ms",   "decision": "Allowed",  "explanation": "User region matches resource region context."},
                {"name": "Ownership Validation",          "status": "PASS", "execution_time": "3.9 ms",   "decision": "Allowed",  "explanation": "User ownership boundary validation matches resource owner."},
                {"name": "PII Output Redaction",          "status": "SKIP", "execution_time": "0.0 ms",   "decision": "Skipped",  "explanation": "No sensitive fields found in raw output payload."},
                {"name": "Threat Detection",              "status": "PASS", "execution_time": "2.1 ms",   "decision": "Allowed",  "explanation": "Violation count is below lockout threshold limit."},
                {"name": "Audit Logging",                 "status": "PASS", "execution_time": "10.4 ms",  "decision": "Allowed",  "explanation": "Persisted action telemetry event inside Audit Log table."},
                {"name": "Database Execution",            "status": "PASS", "execution_time": "12.7 ms",  "decision": "Allowed",  "explanation": "Successfully committed transaction changes to database."},
                {"name": "Final AI Response",             "status": "PASS", "execution_time": "450.2 ms", "decision": "Allowed",  "explanation": "Returned final natural language summary payload."},
            ]

            if log.decision == "Blocked":
                reason_lower = (log.reason or "").lower()
                failed_stage = "Tool Validation"
                if "manifest" in reason_lower or "permission" in reason_lower:
                    failed_stage = "Permission Manifest Evaluation"
                elif "abac" in reason_lower:
                    failed_stage = "ABAC Evaluation"
                elif "region" in reason_lower:
                    failed_stage = "Region Validation"
                elif "owner" in reason_lower or "belong" in reason_lower or "your order" in reason_lower:
                    failed_stage = "Ownership Validation"
                elif "threat" in reason_lower or "limit" in reason_lower or "lock" in reason_lower:
                    failed_stage = "Threat Detection"

                found = False
                for node in nodes:
                    if found:
                        if node["name"] in ("Audit Logging", "Threat Detection"):
                            node["status"] = "PASS"
                            node["decision"] = "Allowed"
                            node["explanation"] = "Telemetry error log captured successfully."
                            node["execution_time"] = "5.0 ms"
                        else:
                            node["status"] = "SKIP"
                            node["decision"] = "Skipped"
                            node["explanation"] = "Bypassed — previous stage blocked execution."
                            node["execution_time"] = "0.0 ms"
                    elif node["name"] == failed_stage:
                        node["status"] = "FAIL"
                        node["decision"] = "Blocked"
                        node["explanation"] = log.reason or "Evaluation failed boundary constraint rules."
                        node["execution_time"] = "15.0 ms"
                        found = True

        # ── 5. PII shield (from stored fields only) ────────────────────────────
        is_pii = False
        pii_fields: list = []
        reason_str = log.reason or ""
        if log.tool_name == "pii_shield" or "PII Shield" in reason_str or "redact" in reason_str.lower():
            is_pii = True
            for node in nodes:
                if node.get("name") == "PII Output Redaction":
                    node["status"] = "PASS"
                    node["decision"] = "Redacted"
                    node["explanation"] = "Masked sensitive data fields before leaving gateway boundary."
                    node["execution_time"] = "4.2 ms"
            if "Aadhaar" in reason_str:
                pii_fields.append("Aadhaar Number")
            if "PAN" in reason_str:
                pii_fields.append("PAN Number")
            if "Card" in reason_str or "Credit" in reason_str:
                pii_fields.append("Credit Card Number")
            if not pii_fields:
                pii_fields = ["Aadhaar Number", "PAN Number", "Credit Card Number"]

        # ── 6. Threat info — from SecurityAlert via stored security_alert_id ───
        threat_info = None
        alert_id_for_actions = None
        try:
            alert = None
            if log.security_alert_id:
                alert = db.query(SecurityAlert).filter(SecurityAlert.alert_id == log.security_alert_id).first()
            if not alert and log.session_id and log.decision == "Blocked":
                alert = db.query(SecurityAlert).filter(
                    SecurityAlert.session_id == log.session_id
                ).order_by(SecurityAlert.created_at.desc()).first()
            if alert:
                alert_id_for_actions = alert.alert_id
                curr = alert.violation_count or 0
                threat_info = {
                    "alert_id": alert.alert_id,
                    "threat_level": alert.threat_level or "Warning",
                    "counter_before": max(0, curr - 1),
                    "counter_after": curr,
                    "attack_category": alert.alert_type or "Policy Violation",
                    "alert_status": alert.status
                }
        except Exception:
            pass

        # ── 7. Approval workflow — only from PendingCustomerUpdate (has request_status) ─
        approval_workflow = None
        try:
            if log.operation and log.operation.lower() in ("create", "delete", "update") and target_cust_id:
                p_update = db.query(PendingCustomerUpdate).filter(
                    PendingCustomerUpdate.customer_id == target_cust_id
                ).order_by(PendingCustomerUpdate.request_id.desc()).first()
                if p_update:
                    approval_workflow = {
                        "status": p_update.request_status,
                        "approved_by": "Manager" if p_update.request_status == "Approved" else None,
                        "approved_timestamp": p_update.created_at.isoformat() if p_update.request_status == "Approved" and p_update.created_at else None,
                        "rejected_by": "Manager" if p_update.request_status == "Rejected" else None,
                        "rejected_timestamp": None
                    }
                else:
                    # Pending customer creation — use created_at as timestamp (no resolved_at col)
                    p_cust = None
                    if params_dict.get("email"):
                        p_cust = db.query(PendingCustomer).filter(
                            PendingCustomer.email == params_dict.get("email")
                        ).first()
                    if p_cust:
                        approval_workflow = {
                            "status": p_cust.request_status,
                            "approved_by": "Admin" if p_cust.request_status == "Approved" else None,
                            "approved_timestamp": p_cust.created_at.isoformat() if p_cust.request_status == "Approved" and p_cust.created_at else None,
                            "rejected_by": "Admin" if p_cust.request_status == "Rejected" else None,
                            "rejected_timestamp": None
                        }
        except Exception:
            pass

        # ── 8. Database change summary (from stored fields) ───────────────────
        database_changes = None
        if log.decision == "Allowed" and log.operation:
            op = log.operation.upper()
            if op in ("CREATE", "UPDATE", "DELETE"):
                database_changes = {
                    "table_name": log.resource or "records",
                    "operation": op,
                    "before_values": "Historical snapshot not captured",
                    "after_values": "Transaction committed successfully to database."
                }

        # ── 9. Final response ─────────────────────────────────────────────────
        final_response = {
            "http_status": 200 if log.decision == "Allowed" else 403,
            "backend_response": "Operation executed successfully." if log.decision == "Allowed"
                else f"Blocked by Security Gateway: {log.reason}",
            "ai_response": log.reason if log.decision == "Blocked"
                else "Execution response payload delivered to client."
        }

        return {
            "request_info": {
                "log_id": log.log_id,
                "request_id": f"REQ{log.log_id:06d}",
                "session_id": log.session_id,
                "timestamp": log.timestamp.isoformat() if hasattr(log.timestamp, "isoformat") else str(log.timestamp),
                "user_id": log.user_id,
                "username": username,
                "role": role_val,
                "region": region_val,
                "client_ip": "127.0.0.1",
                "source": source_val
            },
            "user_request": {
                "original_prompt": log.original_prompt,
                "generated_tool": log.generated_tool,
                "tool_name": log.tool_name,
                "operation": log.operation,
                "parameters": params_dict,
                "target_customer_id": target_cust_id,
                "target_order_id": target_ord_id
            },
            "pipeline": nodes,
            "security_decision": {
                "final_decision": log.decision,
                "triggered_rule": log.reason.split(":")[0].strip() if (log.reason and ":" in log.reason)
                    else ("Policy Violation" if log.decision == "Blocked" else "None"),
                "reason": log.reason
            },
            "resource_info": {
                "customer_id": target_cust_id,
                "order_id": target_ord_id,
                "employee_id": log.user_id if role_val not in ("Customer", "Unknown") else None,
                "region": region_val,
                "resource_type": log.resource
            },
            "metrics": {
                "gateway_time": "12.5 ms",
                "abac_time": "8.3 ms",
                "db_time": "12.7 ms" if log.decision == "Allowed" else "0.0 ms",
                "total_time": f"{log.execution_time:.1f} ms" if log.execution_time else "33.5 ms"
            },
            "threat_info": threat_info,
            "pii_redaction": {
                "enabled": is_pii,
                "masked_fields": pii_fields
            },
            "approval_workflow": approval_workflow,
            "database_changes": database_changes,
            "final_response": final_response
        }

    # ══════════════════════════════════════════════════════════════════════════
    #  ATTACK REPLAY CENTER  (Admin-only, DB-driven, no LLM calls)
    # ══════════════════════════════════════════════════════════════════════════

    def get_attack_replay_list(
        self, db: Session,
        skip: int = 0, limit: int = 50,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        region: Optional[str] = None,
        user_role: Optional[str] = None,
        attack_category: Optional[str] = None,
        threat_level: Optional[str] = None,
        decision: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> dict:
        import datetime, json
        from ..models.customer import Customer
        from ..models.employee import Employee
        from ..models.security import AuditLog, SecurityAlert

        # Base: only blocked/denied entries
        query = db.query(AuditLog).filter(AuditLog.decision.in_(["Blocked", "Denied"]))

        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if decision and decision.lower() != "all":
            query = query.filter(AuditLog.decision == decision)
        if start_date:
            try:
                query = query.filter(AuditLog.timestamp >= datetime.datetime.fromisoformat(start_date))
            except Exception:
                pass
        if end_date:
            try:
                query = query.filter(AuditLog.timestamp <= datetime.datetime.fromisoformat(end_date))
            except Exception:
                pass
        if request_id:
            try:
                rid = int(request_id.upper().replace("REQ", "").lstrip("0") or "0")
                query = query.filter(AuditLog.log_id == rid)
            except Exception:
                pass

        # User Role filters
        if user_role and user_role.lower() != "all":
            if user_role.lower() == "customer":
                custs = db.query(Customer).all()
                cust_ids = [c.customer_id for c in custs if c.customer_id]
                query = query.filter(AuditLog.user_id.in_(cust_ids))
            else:
                emps = db.query(Employee).filter(Employee.role.ilike(user_role)).all()
                emp_ids = [e.employee_id for e in emps if e.employee_id]
                query = query.filter(AuditLog.user_id.in_(emp_ids))

        # Region filters
        if region and region.lower() != "all":
            custs = db.query(Customer).filter(Customer.region.ilike(region)).all()
            cust_ids = [c.customer_id for c in custs if c.customer_id]
            emps = db.query(Employee).filter(Employee.region.ilike(region)).all()
            emp_ids = [e.employee_id for e in emps if e.employee_id]
            query = query.filter(AuditLog.user_id.in_(cust_ids + emp_ids))

        # Attack Category filter via matching alerts
        if attack_category and attack_category.lower() != "all":
            alerts = db.query(SecurityAlert).filter(SecurityAlert.alert_type.ilike(f"%{attack_category}%")).all()
            alert_ids = [a.alert_id for a in alerts if a.alert_id]
            query = query.filter(AuditLog.security_alert_id.in_(alert_ids))

        # Threat Level filter via matching alerts
        if threat_level and threat_level.lower() != "all":
            alerts = db.query(SecurityAlert).filter(SecurityAlert.threat_level.ilike(threat_level)).all()
            alert_ids = [a.alert_id for a in alerts if a.alert_id]
            query = query.filter(AuditLog.security_alert_id.in_(alert_ids))

        total = query.count()
        logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

        # Batch resolve user info just for current page logs
        user_ids = list({log.user_id for log in logs if log.user_id})
        alert_ids = list({log.security_alert_id for log in logs if log.security_alert_id})

        cust_map = {}
        emp_map = {}
        if user_ids:
            custs = db.query(Customer).filter(Customer.customer_id.in_(user_ids)).all()
            cust_map = {c.customer_id: c for c in custs}
            remaining = [uid for uid in user_ids if uid not in cust_map]
            if remaining:
                emps = db.query(Employee).filter(Employee.employee_id.in_(remaining)).all()
                emp_map = {e.employee_id: e for e in emps}

        alert_map = {}
        if alert_ids:
            alerts = db.query(SecurityAlert).filter(SecurityAlert.alert_id.in_(alert_ids)).all()
            alert_map = {a.alert_id: a for a in alerts}

        items = []
        for log in logs:
            uid = log.user_id or ""
            role_val = "Unknown"
            region_val = "Unknown"
            if uid in cust_map:
                role_val = "Customer"
                region_val = cust_map[uid].region or "Unknown"
            elif uid in emp_map:
                role_val = emp_map[uid].role or "Unknown"
                region_val = emp_map[uid].region or "Unknown"

            alert = alert_map.get(log.security_alert_id) if log.security_alert_id else None
            category = alert.alert_type if alert else self._infer_category(log.reason)
            tlevel = alert.threat_level if alert else ("Critical" if log.decision == "Blocked" else "High")
            alert_id = alert.alert_id if alert else None

            ts_str = log.timestamp.isoformat() if hasattr(log.timestamp, "isoformat") else str(log.timestamp)
            ts_str = ts_str.replace(" ", "T")
            if not ts_str.endswith("Z") and "+" not in ts_str:
                ts_str += "Z"

            items.append({
                "log_id": log.log_id,
                "request_id": f"REQ{log.log_id:06d}",
                "timestamp": ts_str,
                "user_id": log.user_id,
                "user_role": role_val,
                "region": region_val,
                "tool_name": log.tool_name,
                "operation": log.operation,
                "decision": log.decision,
                "reason": log.reason,
                "attack_category": category,
                "threat_level": tlevel,
                "alert_id": alert_id,
                "session_id": log.session_id,
                "has_prompt": bool(log.original_prompt)
            })

        return {"items": items, "total": total, "skip": skip, "limit": limit}

    def _infer_category(self, reason: Optional[str]) -> str:
        if not reason:
            return "Policy Violation"
        r = reason.lower()
        if "cross" in r and "region" in r:
            return "Cross Region Access"
        if "privilege" in r or "escalat" in r:
            return "Privilege Escalation"
        if "own" in r or "belong" in r or "your order" in r:
            return "Ownership Violation"
        if "pii" in r or "aadhaar" in r or "pan" in r:
            return "PII Access Attempt"
        if "prompt" in r or "inject" in r:
            return "Prompt Injection"
        if "threat" in r or "lock" in r or "limit" in r:
            return "Threat Threshold Violation"
        if "permission" in r or "manifest" in r:
            return "Permission Violation"
        if "abac" in r:
            return "ABAC Policy Violation"
        return "Security Policy Violation"

    def get_attack_replay_detail(self, db: Session, log_id: int) -> dict:
        """Full forensic replay from stored DB data. No LLM calls whatsoever."""
        from ..models.customer import Customer
        from ..models.employee import Employee
        from ..models.security import AuditLog, SecurityAlert
        import json, datetime

        log = self.repo.get_audit_log_by_id(db, log_id)
        if not log:
            raise HTTPException(status_code=404, detail="Attack log entry not found")
        if log.decision not in ("Blocked", "Denied"):
            raise HTTPException(status_code=400, detail="This log entry is not a blocked/denied attack. Use /api/audit-logs/{log_id}/details for normal entries.")

        # ── Resolve user ──────────────────────────────────────────────────────
        username, role_val, region_val = "Unknown", "Unknown", "Unknown"
        try:
            if log.user_id:
                cust = db.query(Customer).filter(Customer.customer_id == log.user_id).first()
                if cust:
                    username = cust.full_name or log.user_id
                    role_val = "Customer"
                    region_val = cust.region or "Unknown"
                else:
                    emp = db.query(Employee).filter(Employee.employee_id == log.user_id).first()
                    if emp:
                        username = emp.full_name or log.user_id
                        role_val = emp.role or "Unknown"
                        region_val = emp.region or "Unknown"
        except Exception:
            pass

        # ── Parse tool JSON ───────────────────────────────────────────────────
        params_dict: dict = {}
        target_cust_id = None
        target_ord_id = None
        if log.generated_tool:
            try:
                raw = json.loads(log.generated_tool)
                if isinstance(raw, dict):
                    inner = raw.get("parameters") or raw.get("arguments") or raw
                    if isinstance(inner, dict):
                        params_dict = inner
                        target_cust_id = inner.get("customer_id") or inner.get("id")
                        target_ord_id = inner.get("order_id")
            except Exception:
                pass

        # ── Resolve security alert ────────────────────────────────────────────
        alert = None
        try:
            if log.security_alert_id:
                alert = db.query(SecurityAlert).filter(SecurityAlert.alert_id == log.security_alert_id).first()
            if not alert and log.session_id:
                alert = db.query(SecurityAlert).filter(
                    SecurityAlert.session_id == log.session_id
                ).order_by(SecurityAlert.created_at.desc()).first()
        except Exception:
            pass

        attack_category = self._infer_category(log.reason)
        threat_level = "Critical"
        violation_before = 0
        violation_after = 1
        alert_id = None
        alert_status = "OPEN"
        if alert:
            attack_category = alert.alert_type or attack_category
            threat_level = alert.threat_level or "Critical"
            curr = alert.violation_count or 1
            violation_before = max(0, curr - 1)
            violation_after = curr
            alert_id = alert.alert_id
            alert_status = alert.status or "OPEN"

        # ── Determine failed stage from reason ────────────────────────────────
        reason_lower = (log.reason or "").lower()
        failed_stage = "Tool Validation"
        if "manifest" in reason_lower or "permission" in reason_lower:
            failed_stage = "Permission Manifest"
        elif "abac" in reason_lower:
            failed_stage = "ABAC Evaluation"
        elif "region" in reason_lower:
            failed_stage = "Region Validation"
        elif "own" in reason_lower or "belong" in reason_lower or "your order" in reason_lower:
            failed_stage = "Ownership Validation"
        elif "threat" in reason_lower or "lock" in reason_lower or "limit" in reason_lower:
            failed_stage = "Threat Detection"
        elif "pii" in reason_lower or "aadhaar" in reason_lower:
            failed_stage = "PII Protection"

        ts_base = log.timestamp if log.timestamp else datetime.datetime.utcnow()

        def ts_offset(ms: float) -> str:
            return (ts_base + datetime.timedelta(milliseconds=ms)).strftime("%H:%M:%S.%f")[:-3]

        # ── Build ordered replay nodes ─────────────────────────────────────────
        # Each node: id, name, icon, status, exec_time, description, input, output, decision, validation_result, details
        stage_order = [
            "User Prompt", "LLM Processing", "Generated Tool Call",
            "Tool Validation", "Permission Manifest", "ABAC Evaluation",
            "Region Validation", "Ownership Validation", "PII Protection",
            "Threat Detection", "Security Decision", "Audit Log Written", "Final AI Response"
        ]

        def node_status(name: str) -> str:
            idx_fail = stage_order.index(failed_stage) if failed_stage in stage_order else 99
            idx_node = stage_order.index(name) if name in stage_order else 0
            if name == failed_stage:
                return "FAIL"
            if name in ("Threat Detection", "Audit Log Written") and idx_node > idx_fail:
                return "PASS"
            if idx_node > idx_fail:
                return "SKIP"
            return "PASS"

        exec_times = {
            "User Prompt": 1.2, "LLM Processing": 312.4, "Generated Tool Call": 2.1,
            "Tool Validation": 3.5, "Permission Manifest": 5.1, "ABAC Evaluation": 8.3,
            "Region Validation": 4.2, "Ownership Validation": 3.9, "PII Protection": 0.0,
            "Threat Detection": 2.1, "Security Decision": 1.5, "Audit Log Written": 10.4,
            "Final AI Response": 1.8
        }
        if failed_stage in exec_times:
            exec_times[failed_stage] = 15.0

        nodes = []
        cumulative_ms = 0.0
        for sname in stage_order:
            et = exec_times.get(sname, 2.0)
            cumulative_ms += et
            st = node_status(sname)

            if sname == "User Prompt":
                node_in = log.original_prompt or "(no prompt — direct API call)"
                node_out = f"User: {log.user_id} | Role: {role_val} | Region: {region_val}"
                desc = "Original user request received by the Security Gateway."
                details = {
                    "original_prompt": log.original_prompt or "",
                    "user_id": log.user_id,
                    "user_role": role_val,
                    "username": username,
                    "region": region_val,
                    "session_id": log.session_id,
                    "timestamp": ts_base.isoformat()
                }
            elif sname == "LLM Processing":
                node_in = log.original_prompt or "(direct tool call)"
                node_out = log.generated_tool or "(tool JSON generated)"
                desc = "Groq LLM processed the user prompt and generated a structured tool call JSON."
                details = {
                    "prompt_sent": log.original_prompt or "",
                    "model_used": "llama-3.3-70b-versatile",
                    "request_time": ts_offset(1.2),
                    "response_time": ts_offset(313.6),
                    "execution_ms": 312.4
                }
            elif sname == "Generated Tool Call":
                node_in = "LLM response"
                node_out = log.generated_tool or "{}"
                desc = "The LLM generated a structured tool call that was submitted to the Security Gateway."
                details = {
                    "tool_json_raw": log.generated_tool or "{}",
                    "tool_name": log.tool_name,
                    "operation": log.operation,
                    "parameters": params_dict,
                    "target_customer_id": target_cust_id,
                    "target_order_id": target_ord_id,
                    "generated_at": ts_offset(313.6)
                }
            elif sname == "Tool Validation":
                status_v = "PASS" if failed_stage not in ("Tool Validation",) else "FAIL"
                node_in = f"Tool: {log.tool_name}.{log.operation}"
                node_out = "Tool name exists in permission manifest schema" if st == "PASS" else f"BLOCKED: {log.reason}"
                desc = "Validates the generated tool name and operation against the system schema."
                details = {"tool_name": log.tool_name, "operation": log.operation, "schema_valid": st == "PASS", "validation_rule": "Tool must exist in registered CRM gateway tools"}
            elif sname == "Permission Manifest":
                node_in = f"Role: {role_val} | Tool: {log.tool_name} | Op: {log.operation}"
                node_out = "Permission granted" if st == "PASS" else f"BLOCKED: Permission denied for {role_val}"
                desc = "Checks the Permission Manifest table to verify this role can invoke this tool and operation."
                details = {"role": role_val, "tool": log.tool_name, "operation": log.operation, "manifest_result": st, "rule": f"{role_val} permissions for {log.tool_name}.{log.operation}"}
            elif sname == "ABAC Evaluation":
                node_in = f"User attributes | Resource attributes"
                node_out = "ABAC policies satisfied" if st == "PASS" else f"BLOCKED: ABAC policy violation"
                desc = "Attribute-Based Access Control engine evaluates user, resource, and environment attributes."
                details = {"user_id": log.user_id, "user_role": role_val, "region": region_val, "resource": log.resource, "abac_result": st, "rule": "User attributes must satisfy all ABAC policy conditions"}
            elif sname == "Region Validation":
                node_in = f"User region: {region_val}"
                node_out = "Region boundary satisfied" if st == "PASS" else f"BLOCKED: Cross-region access detected"
                desc = "Validates that the user's region matches the target resource's region."
                details = {"user_region": region_val, "resource_region": params_dict.get("region", "Unknown"), "result": st, "rule": "Manager region must match Customer region"}
            elif sname == "Ownership Validation":
                node_in = f"User: {log.user_id} | Resource owner check"
                node_out = "Ownership verified" if st == "PASS" else f"BLOCKED: Resource does not belong to requesting user"
                desc = "Verifies the requesting user owns or has authority over the target resource."
                details = {"requesting_user": log.user_id, "target_customer": target_cust_id, "target_order": target_ord_id, "result": st, "rule": "Users can only access their own resources"}
            elif sname == "PII Protection":
                pii_active = "pii" in reason_lower or "aadhaar" in reason_lower or "pan" in reason_lower
                node_in = "Response payload"
                node_out = "PII fields redacted" if pii_active else "No PII fields detected"
                desc = "PII Output Shield scans the response for sensitive data and redacts it."
                details = {"pii_enabled": pii_active, "masked_fields": ["Aadhaar Number", "PAN Number", "Credit Card Number"] if pii_active else [], "status": "REDACTED" if pii_active else "CLEAN"}
                st = "PASS" if pii_active else "SKIP"
            elif sname == "Threat Detection":
                node_in = f"Violation count: {violation_before}"
                node_out = f"Violation count incremented to {violation_after} | Threat level: {threat_level}"
                desc = "Tracks cumulative violation count per session. Locks account when threshold exceeded."
                details = {
                    "counter_before": violation_before,
                    "counter_after": violation_after,
                    "threat_level": threat_level,
                    "attack_category": attack_category,
                    "lockout_threshold": 10,
                    "locked": violation_after >= 10
                }
                st = "PASS"
            elif sname == "Security Decision":
                node_in = "Gateway evaluation results"
                node_out = f"{log.decision}: {log.reason}"
                desc = "Final security decision issued by the Enterprise Security Gateway."
                triggered = log.reason.split(":")[0].strip() if (log.reason and ":" in log.reason) else "Policy Violation"
                details = {
                    "decision": log.decision,
                    "exact_reason": log.reason,
                    "triggered_rule": triggered,
                    "policy": f"{failed_stage} Policy",
                    "http_status": 403
                }
                st = "FAIL" if log.decision in ("Blocked", "Denied") else "PASS"
            elif sname == "Audit Log Written":
                node_in = "Attack event metadata"
                node_out = f"Log ID: REQ{log.log_id:06d} persisted to audit_logs table"
                desc = "The complete attack event telemetry is persisted to the audit_logs database table."
                details = {"log_id": log.log_id, "request_id": f"REQ{log.log_id:06d}", "table": "audit_logs", "written_at": ts_offset(cumulative_ms - et), "status": "SUCCESS"}
                st = "PASS"
            elif sname == "Final AI Response":
                node_in = "Security decision"
                node_out = f"HTTP 403 | {log.reason}"
                desc = "The AI returns a natural language explanation of why the request was blocked."
                stored_explanation = None
                if log.decision_trace:
                    try:
                        trace_dict = json.loads(log.decision_trace)
                        if isinstance(trace_dict, dict):
                            stored_explanation = trace_dict.get("explanation")
                    except Exception:
                        pass
                details = {
                    "http_status": 403,
                    "backend_response": f"Blocked by Gateway: {log.reason}",
                    "ai_response": stored_explanation or log.reason or "Access denied by security policy."
                }

            nodes.append({
                "id": sname.lower().replace(" ", "_"),
                "name": sname,
                "status": st,
                "execution_time_ms": et if st != "SKIP" else 0.0,
                "offset_ms": cumulative_ms,
                "timestamp": ts_offset(cumulative_ms),
                "description": desc,
                "input_data": node_in,
                "output_data": node_out,
                "decision": "Blocked" if st == "FAIL" else ("Skipped" if st == "SKIP" else "Allowed"),
                "validation_result": st,
                "details": details
            })

        # ── Timeline ──────────────────────────────────────────────────────────
        timeline = []
        cum = 0.0
        for node in nodes:
            if node["status"] in ("PASS", "FAIL"):
                cum += node["execution_time_ms"]
                timeline.append({
                    "timestamp": node["timestamp"],
                    "event": node["name"],
                    "status": node["status"],
                    "ms": node["execution_time_ms"],
                    "offset_ms": cum
                })

        ts_str = ts_base.isoformat()
        ts_str = ts_str.replace(" ", "T")
        if not ts_str.endswith("Z") and "+" not in ts_str:
            ts_str += "Z"

        return {
            "log_id": log.log_id,
            "request_id": f"REQ{log.log_id:06d}",
            "session_id": log.session_id,
            "timestamp": ts_str,
            "user_id": log.user_id,
            "username": username,
            "user_role": role_val,
            "region": region_val,
            "tool_name": log.tool_name,
            "operation": log.operation,
            "decision": log.decision,
            "reason": log.reason,
            "attack_category": attack_category,
            "threat_level": threat_level,
            "failed_stage": failed_stage,
            "alert_id": alert_id,
            "alert_status": alert_status,
            "violation_count": violation_after,
            "nodes": nodes,
            "timeline": timeline,
            "total_execution_ms": round(cum, 2)
        }

    # ══════════════════════════════════════════════════════════════════════════
    #  POLICY IMPACT SIMULATOR
    # ══════════════════════════════════════════════════════════════════════════

    def get_live_settings(self, db: Session) -> dict:
        from ..models.security import PermissionManifest

        # Fetch current live permissions from DB (Python-side filtering to avoid custom MongoDB driver boolean query issue)
        all_manifests = db.query(PermissionManifest).all()
        manifests = [m for m in all_manifests if getattr(m, "allowed", False) is True or str(getattr(m, "allowed", "")).lower() == "true"]
        
        cust_perms = []
        mgr_perms = []

        # Map live permission manifests to UI checkbox names
        for m in manifests:
            role = m.role.lower()
            tool = m.tool_name
            op = m.operation.lower()
            
            if role == "customer":
                if tool == "read_customer":
                    cust_perms.append("Read Own Profile")
                elif tool == "list_customers":
                    cust_perms.append("Read Other Customers")
                elif tool == "update_customer":
                    cust_perms.append("Update Profile Request")
                elif tool == "delete_customer":
                    cust_perms.append("Delete Customers")
                elif tool == "read_orders":
                    cust_perms.append("View Own Orders")
            elif role == "manager":
                if tool in ("read_customer", "list_customers"):
                    mgr_perms.append("Read Regional Customers")
                elif tool == "read_orders":
                    mgr_perms.append("View Pending Requests")
                elif tool == "update_customer":
                    mgr_perms.append("Approve Customer Updates")
                # Exclude direct Delete Customer and Create Customer from manager live settings,
                # as in the live system these write actions are restricted to Admin.

        # Live defaults for Customer (always allowed by core system rules)
        cust_perms = list(set(cust_perms + ["Read Own Profile", "View Own Orders", "Create Order Request", "Delete Order Request", "Update Profile Request"]))
        # Live defaults for Manager (direct customer creation/deletes are Admin-only)
        mgr_perms = list(set(mgr_perms + ["Read Regional Customers", "Approve Orders", "Approve Customer Updates", "View Pending Requests"]))
        
        allow_rules = [
            "Customer can only access own profile",
            "Manager limited to own region",
            "Customer can create order requests",
            "Manager can approve pending requests",
            "Admin unrestricted"
        ]
        deny_rules = [
            "Deny Cross Region Access",
            "Deny Direct Customer Creation",
            "Deny Customer Delete",
            "Deny Unauthorized Tool Calls",
            "Deny PII Access",
            "Deny Privilege Escalation",
            "Deny Direct Database Operations"
        ]

        return {
            "customer_permissions": cust_perms,
            "manager_permissions": mgr_perms,
            "allow_rules": allow_rules,
            "deny_rules": deny_rules
        }

    def run_policy_simulation(self, db: Session, payload: dict) -> dict:
        import datetime, json
        from ..models.customer import Customer
        from ..models.employee import Employee
        from ..models.security import AuditLog, SecurityAlert

        cust_perms = payload.get("customer_permissions", [])
        mgr_perms = payload.get("manager_permissions", [])
        allow_rules = payload.get("allow_rules", [])
        deny_rules = payload.get("deny_rules", [])
        log_limit = payload.get("log_limit", 100)
        filters = payload.get("filters", {}) or {}

        # 1. Fetch relevant historical audit logs
        query = db.query(AuditLog).filter(AuditLog.tool_name != "pii_shield")
        
        # Apply filters
        user_role_filt = filters.get("user_role", "All")
        region_filt = filters.get("region", "All")
        tool_filt = filters.get("tool", "All")
        op_filt = filters.get("operation", "All")
        allowed_reqs = filters.get("allowed_requests", True)
        blocked_reqs = filters.get("blocked_requests", True)

        # Apply basic decision filters
        if not allowed_reqs and not blocked_reqs:
            # If both unchecked, return empty
            return {
                "summary": {
                    "total_replayed": 0, "changed_count": 0, "unchanged_count": 0, "percentage_affected": 0.0,
                    "old_allowed": 0, "old_blocked": 0, "new_allowed": 0, "new_blocked": 0,
                    "transitions": {"allow_to_allow": 0, "allow_to_block": 0, "block_to_allow": 0, "block_to_block": 0}
                },
                "replayed_requests": [], "top_impacts": [], "chart_data": {}
            }
        elif allowed_reqs and not blocked_reqs:
            query = query.filter(AuditLog.decision == "Allowed")
        elif blocked_reqs and not allowed_reqs:
            query = query.filter(AuditLog.decision.in_(["Blocked", "Denied"]))

        # Apply role and region filtering at database level by resolving matching user IDs first
        if user_role_filt != "All" or region_filt != "All":
            matching_ids = []
            
            # Retrieve matching customer IDs
            if user_role_filt in ("All", "Customer"):
                cust_q = db.query(Customer)
                if region_filt != "All":
                    cust_q = cust_q.filter(Customer.region.ilike(region_filt))
                matching_ids.extend([c.customer_id for c in cust_q.all()])
                
            # Retrieve matching employee IDs
            if user_role_filt in ("All", "Manager", "Admin"):
                emp_q = db.query(Employee)
                if user_role_filt == "Manager":
                    emp_q = emp_q.filter(Employee.role.in_(["manager", "Manager"]))
                elif user_role_filt == "Admin":
                    emp_q = emp_q.filter(Employee.role.in_(["admin", "Admin"]))
                
                if region_filt != "All":
                    emp_q = emp_q.filter(Employee.region.ilike(region_filt))
                matching_ids.extend([e.employee_id for e in emp_q.all()])
                
            query = query.filter(AuditLog.user_id.in_(matching_ids))

        if tool_filt != "All":
            query = query.filter(AuditLog.tool_name.ilike(f"%{tool_filt}%"))
        if op_filt != "All":
            query = query.filter(AuditLog.operation.ilike(f"%{op_filt}%"))

        logs = query.order_by(AuditLog.timestamp.desc()).limit(log_limit).all()

        # Batch resolve user details for filtering
        uids = list({l.user_id for l in logs if l.user_id})
        cust_map = {}
        emp_map = {}
        if uids:
            custs = db.query(Customer).filter(Customer.customer_id.in_(uids)).all()
            cust_map = {c.customer_id: c for c in custs}
            rem = [uid for uid in uids if uid not in cust_map]
            if rem:
                emps = db.query(Employee).filter(Employee.employee_id.in_(rem)).all()
                emp_map = {e.employee_id: e for e in emps}

        # Apply in-memory user role/region filters
        filtered_logs = []
        for log in logs:
            uid = log.user_id or ""
            role_val = "Unknown"
            region_val = "Unknown"
            if uid in cust_map:
                role_val = "Customer"
                region_val = cust_map[uid].region or "Unknown"
            elif uid in emp_map:
                role_val = emp_map[uid].role or "Unknown"
                if role_val in ("manager", "Manager"):
                    role_val = "Manager"
                elif role_val in ("admin", "Admin"):
                    role_val = "Admin"
                region_val = emp_map[uid].region or "Unknown"

            if user_role_filt != "All" and role_val.lower() != user_role_filt.lower():
                continue
            if region_filt != "All" and region_val.lower() != region_filt.lower():
                continue
            
            filtered_logs.append((log, role_val, region_val))

        # 2. Run in-memory simulation against both live policy and new policy rules
        replayed = []
        
        # Stats
        transitions = {"allow_to_allow": 0, "allow_to_block": 0, "block_to_allow": 0, "block_to_block": 0}
        impact_rules = {}

        # Fetch current live settings to evaluate live decisions dynamically and accurately
        live_settings = self.get_live_settings(db)
        live_cust_perms = live_settings["customer_permissions"]
        live_mgr_perms = live_settings["manager_permissions"]
        live_allow_rules = live_settings["allow_rules"]
        live_deny_rules = live_settings["deny_rules"]

        def evaluate_policy(log_obj, role_str, region_str, cust_perms, mgr_perms, allow_rules_list, deny_rules_list) -> tuple:
            # Parse parameters to resolve resource details if present
            params = {}
            if log_obj.generated_tool:
                try:
                    raw = json.loads(log_obj.generated_tool)
                    params = raw.get("parameters") or raw.get("arguments") or raw
                except Exception:
                    pass

            if role_str == "Admin":
                # Admin is unrestricted unless explicitly denied
                if "Admin unrestricted" not in allow_rules_list:
                    return "BLOCK", "Admin unrestricted rule is disabled.", "Admin unrestricted Rule"
                return "ALLOW", "Permitted by policy.", "None"

            # ── Step 1: Tool/Operation Normalization ──
            norm_tool = (log_obj.tool_name or "").lower()
            norm_op = (log_obj.operation or "").lower()

            # Normalize custom actions to standard REST tool types
            if norm_tool in ("approve_order_deletion", "approve_order_creation"):
                norm_tool = "crm.order"
                norm_op = "approve"
            elif norm_tool in ("approve_profile_update", "approve_pending_customer"):
                norm_tool = "crm.customer"
                norm_op = "approve"
            elif norm_tool == "create_pending_customer":
                norm_tool = "crm.customer"
                norm_op = "create"
            elif norm_tool == "rest_api":
                if log_obj.resource == "customers":
                    norm_tool = "crm.customer"
                elif log_obj.resource == "orders":
                    norm_tool = "crm.order"
                elif log_obj.resource == "employees":
                    norm_tool = "crm.employee"

            # ── Step 2: Permission Check (Permission Manifest) ──
            perm_allowed = True
            triggered_rule = "None"

            if norm_tool in ("crm.customer", "crm.order", "crm.employee"):
                if role_str == "Customer":
                    if norm_tool == "crm.customer":
                        if norm_op in ("read", "search", "list"):
                            tgt_cust = params.get("customer_id") or log_obj.user_id
                            is_own = (str(tgt_cust).upper() == str(log_obj.user_id).upper())
                            if is_own:
                                perm_allowed = "Read Own Profile" in cust_perms
                                triggered_rule = "Read Own Profile Permission"
                            else:
                                perm_allowed = "Read Other Customers" in cust_perms
                                triggered_rule = "Read Other Customers Permission"
                        elif norm_op in ("update_request",):
                            perm_allowed = "Update Profile Request" in cust_perms
                            triggered_rule = "Update Profile Request Permission"
                        elif norm_op == "update":
                            tgt_cust = params.get("customer_id") or log_obj.user_id
                            is_own = (str(tgt_cust).upper() == str(log_obj.user_id).upper())
                            if is_own:
                                perm_allowed = "Update Their Own Account" in cust_perms
                                triggered_rule = "Update Own Account Permission"
                            else:
                                perm_allowed = "Update Customer Records" in cust_perms
                                triggered_rule = "Update Customer Records Permission"
                        elif norm_op == "delete":
                            tgt_cust = params.get("customer_id") or log_obj.user_id
                            is_own = (str(tgt_cust).upper() == str(log_obj.user_id).upper())
                            if is_own:
                                perm_allowed = "Delete Their Own Account" in cust_perms
                                triggered_rule = "Delete Own Account Permission"
                            else:
                                perm_allowed = "Update Customer Records" in cust_perms
                                triggered_rule = "Update Customer Records Permission"
                        elif norm_op == "create":
                            perm_allowed = "Update Customer Records" in cust_perms
                            triggered_rule = "Update Customer Records Permission"
                        else:
                            perm_allowed = False
                            triggered_rule = "Default Customer Boundary"

                    elif norm_tool == "crm.order":
                        if norm_op in ("read", "list", "search"):
                            perm_allowed = "View Own Orders" in cust_perms
                            triggered_rule = "View Own Orders Permission"
                        elif norm_op in ("create", "create_request"):
                            perm_allowed = "Create Order Request" in cust_perms
                            triggered_rule = "Create Order Request Permission"
                        elif norm_op == "delete":
                            perm_allowed = "Delete Order Request" in cust_perms
                            triggered_rule = "Delete Order Request Permission"
                        else:
                            perm_allowed = False
                            triggered_rule = "Default Order Boundary"

                    elif norm_tool in ("crm.employee", "crm.dashboard"):
                        tgt_emp_id = params.get("employee_id") or log_obj.resource_id or ""
                        if tgt_emp_id.upper() in ("ALL", "", "NONE"):
                            tgt_emp_id = ""
                            
                        target_emp = None
                        if tgt_emp_id:
                            target_emp = db.query(Employee).filter(Employee.employee_id == tgt_emp_id).first()
                        
                        if target_emp:
                            emp_role = (target_emp.role or "").lower()
                            if emp_role == "admin":
                                perm_allowed = "Read Admin Data" in cust_perms
                                triggered_rule = "Read Admin Data Permission"
                            elif emp_role == "manager":
                                perm_allowed = "Read Managers Data" in cust_perms
                                triggered_rule = "Read Managers Data Permission"
                            else:
                                perm_allowed = False
                                triggered_rule = "Admin Modules Access Restriction"
                        else:
                            # Listing all employees requires both permissions
                            if "Read Admin Data" in cust_perms and "Read Managers Data" in cust_perms:
                                perm_allowed = True
                                triggered_rule = "Read All Employees Permission"
                            else:
                                perm_allowed = False
                                triggered_rule = "Admin Modules Access Restriction"
                    else:
                        perm_allowed = False
                        triggered_rule = "Default Customer Boundary"
                
                elif role_str == "Manager":
                    if norm_tool == "crm.customer":
                        if norm_op in ("read", "list", "search"):
                            res_region = params.get("region") or "Unknown"
                            is_own_region = (res_region.lower() == region_str.lower() or res_region == "Unknown")
                            if is_own_region:
                                perm_allowed = "Read Regional Customers" in mgr_perms
                                triggered_rule = "Read Regional Customers Permission"
                            else:
                                perm_allowed = "View Cross Region Customers" in mgr_perms
                                triggered_rule = "View Cross Region Customers Permission"
                        elif norm_op == "create":
                            perm_allowed = "Create Customer" in mgr_perms
                            triggered_rule = "Create Customer Permission"
                        elif norm_op == "delete":
                            perm_allowed = "Delete Customer" in mgr_perms
                            triggered_rule = "Delete Customer Permission"
                        elif norm_op == "approve":
                            perm_allowed = "Approve Customer Updates" in mgr_perms
                            triggered_rule = "Approve Customer Updates Permission"
                        elif norm_op in ("update", "update_request"):
                            perm_allowed = "Update Customer Records" in mgr_perms
                            triggered_rule = "Update Customer Records Permission"
                        else:
                            perm_allowed = False
                            triggered_rule = "Default Manager Boundary"

                    elif norm_tool == "crm.order":
                        if norm_op in ("approve", "process"):
                            perm_allowed = "Approve Orders" in mgr_perms
                            triggered_rule = "Approve Orders Permission"
                        elif norm_op in ("read", "list", "search"):
                            perm_allowed = "View Pending Requests" in mgr_perms
                            triggered_rule = "View Pending Requests Permission"
                        else:
                            perm_allowed = False
                            triggered_rule = "Default Order Boundary"

                    elif norm_tool == "crm.employee":
                        if norm_op in ("create", "update"):
                            perm_allowed = False
                            triggered_rule = "Employee Modify Restriction"
                        else:
                            tgt_emp_id = params.get("employee_id") or log_obj.resource_id or ""
                            target_emp = None
                            if tgt_emp_id:
                                target_emp = db.query(Employee).filter(Employee.employee_id == tgt_emp_id).first()
                            
                            if target_emp and (target_emp.role or "").lower() == "admin":
                                perm_allowed = "View Admin Details" in mgr_perms
                                triggered_rule = "View Admin Details Permission"
                            else:
                                perm_allowed = True
                    else:
                        perm_allowed = False
                        triggered_rule = "Default Manager Boundary"
            else:
                # Utility, Auth, Login bypasses manifest check
                perm_allowed = True
                triggered_rule = "Bypass Permission Manifest"

            if not perm_allowed:
                return "BLOCK", f"Denied by manifest or role boundary: {triggered_rule}", triggered_rule

            # ── Step 3: Deny Rules Check ──
            if "Deny Cross Region Access" in deny_rules_list and role_str == "Manager":
                res_region = params.get("region") or "Unknown"
                if res_region != "Unknown" and res_region.lower() != region_str.lower():
                    return "BLOCK", f"Cross-region access to region '{res_region}' is denied by rule.", "Deny Cross Region Access"

            if "Deny Direct Customer Creation" in deny_rules_list and role_str == "Manager" and norm_tool == "crm.customer" and norm_op == "create":
                # Bypass deny rule block if Create Customer manifest permission is explicitly granted
                if "Create Customer" in mgr_perms:
                    pass
                else:
                    return "BLOCK", "Direct customer creation is denied by security policy.", "Deny Direct Customer Creation"

            if "Deny Customer Delete" in deny_rules_list and role_str == "Customer" and norm_tool == "crm.customer" and norm_op == "delete":
                # Bypass deny rule block if Delete Customers manifest permission is explicitly granted
                if "Delete Customers" in cust_perms:
                    pass
                else:
                    return "BLOCK", "Customers are prohibited from deleting profiles.", "Deny Customer Delete"

            if "Deny PII Access" in deny_rules_list and (norm_op == "redact" or "pii" in (log_obj.reason or "").lower()):
                return "BLOCK", "Access to sensitive PII data is denied by policy.", "Deny PII Access"

            # ── Step 4: ABAC / Regional & Ownership Validation ──
            if "Customer can only access own profile" in allow_rules_list and role_str == "Customer":
                if norm_tool == "crm.customer":
                    tgt_cust = params.get("customer_id")
                    if tgt_cust and tgt_cust.upper() != log_obj.user_id.upper():
                        # Bypass ownership check on reads if "Read Other Customers" manifest permission is granted
                        if norm_op in ("read", "search", "list") and "Read Other Customers" in cust_perms:
                            pass
                        # Bypass ownership check on updates if "Update Customer Records" manifest permission is granted
                        elif norm_op in ("update", "update_request") and "Update Customer Records" in cust_perms:
                            pass
                        else:
                            return "BLOCK", f"Ownership Violation: Customer cannot access details of '{tgt_cust}'.", "Customer can only access own profile"
                elif norm_tool == "crm.order":
                    param_cust_id = params.get("customer_id")
                    if not param_cust_id and "order_details" in params:
                        param_cust_id = params["order_details"].get("customer_id")
                    if param_cust_id and param_cust_id.upper() != log_obj.user_id.upper():
                        return "BLOCK", f"Ownership Violation: Customer cannot access orders of '{param_cust_id}'.", "Customer can only access own profile"

            if "Manager limited to own region" in allow_rules_list and role_str == "Manager" and norm_tool in ("crm.customer", "crm.order", "crm.employee"):
                res_region = params.get("region") or "Unknown"
                if res_region != "Unknown" and res_region.lower() != region_str.lower():
                    return "BLOCK", f"Scope Violation: Manager region is '{region_str}', target region is '{res_region}'.", "Manager limited to own region"

            # Construct a highly descriptive success reason for allowed actions
            success_reason = "Permitted by simulated policy."
            
            # Resolve target ID details
            tgt_cust = params.get("customer_id") or params.get("customer_info", {}).get("customer_id")
            tgt_emp = params.get("employee_id") or params.get("employee_info", {}).get("employee_id")
            
            if norm_tool == "crm.customer":
                if norm_op in ("read", "search", "list"):
                    is_own = (tgt_cust and tgt_cust.upper() == log_obj.user_id.upper()) or (not tgt_cust and role_str == "Customer")
                    if is_own:
                        success_reason = "Allowed to read own data (own profile)."
                    else:
                        target_label = f"customer '{tgt_cust}'" if tgt_cust else "other customer profiles"
                        success_reason = f"Allowed to read someone else's data (target: {target_label})."
                elif norm_op in ("update", "update_request"):
                    is_own = (tgt_cust and tgt_cust.upper() == log_obj.user_id.upper()) or (not tgt_cust and role_str == "Customer")
                    if is_own:
                        success_reason = "Allowed to update own profile."
                    else:
                        target_label = f"customer '{tgt_cust}'" if tgt_cust else "other profiles"
                        success_reason = f"Allowed to update someone else's profile (target: {target_label})."
            elif norm_tool == "crm.employee":
                if norm_op in ("read", "search", "list"):
                    is_own = (tgt_emp and tgt_emp.upper() == log_obj.user_id.upper())
                    if is_own:
                        success_reason = "Allowed to read own data (own employee record)."
                    else:
                        target_label = f"employee '{tgt_emp}'" if tgt_emp else "other employee records"
                        success_reason = f"Allowed to read someone else's data (target: {target_label})."
            elif norm_tool == "crm.order":
                if norm_op in ("read", "search", "list"):
                    param_cust_id = params.get("customer_id")
                    if not param_cust_id and "order_details" in params:
                        param_cust_id = params["order_details"].get("customer_id")
                    is_own = (param_cust_id and param_cust_id.upper() == log_obj.user_id.upper()) or (not param_cust_id and role_str == "Customer")
                    if is_own:
                        success_reason = "Allowed to read own data (own orders)."
                    else:
                        success_reason = "Allowed to read someone else's data (other orders)."

            return "ALLOW", success_reason, "None"

        for log, role_val, region_val in filtered_logs:
            # Evaluate against current active Live settings configuration
            old_dec, old_reason, _ = evaluate_policy(log, role_val, region_val, live_cust_perms, live_mgr_perms, live_allow_rules, live_deny_rules)
            
            # Evaluate against custom simulated settings setup
            new_dec, new_reason, triggered_rule = evaluate_policy(log, role_val, region_val, cust_perms, mgr_perms, allow_rules, deny_rules)

            # ── Step 4: Compare decisions & track transitions ──
            changed = old_dec != new_dec
            if changed:
                # Log rule trigger count
                impact_rules[triggered_rule] = impact_rules.get(triggered_rule, 0) + 1

            # Transition stats
            if old_dec == "ALLOW" and new_dec == "ALLOW":
                transitions["allow_to_allow"] += 1
            elif old_dec == "ALLOW" and new_dec == "BLOCK":
                transitions["allow_to_block"] += 1
            elif old_dec == "BLOCK" and new_dec == "ALLOW":
                transitions["block_to_allow"] += 1
            elif old_dec == "BLOCK" and new_dec == "BLOCK":
                transitions["block_to_block"] += 1

            # Build request details context
            params = {}
            if log.generated_tool:
                try:
                    raw = json.loads(log.generated_tool)
                    params = raw.get("parameters") or raw.get("arguments") or raw
                except Exception:
                    pass

            tgt_cust = params.get("customer_id") or params.get("customer_info", {}).get("customer_id")
            tgt_emp = params.get("employee_id") or params.get("employee_info", {}).get("employee_id")
            tgt_ord = params.get("order_id") or params.get("order_info", {}).get("order_id")

            details_text = "General system operation."
            norm_tool = (log.tool_name or "").lower()
            norm_op = (log.operation or "").lower()

            if norm_tool in ("approve_order_deletion", "approve_order_creation"):
                norm_tool = "crm.order"
                norm_op = "approve"
            elif norm_tool in ("approve_profile_update", "approve_pending_customer"):
                norm_tool = "crm.customer"
                norm_op = "approve"
            elif norm_tool == "create_pending_customer":
                norm_tool = "crm.customer"
                norm_op = "create"
            elif norm_tool == "rest_api":
                if log.resource == "customers":
                    norm_tool = "crm.customer"
                elif log.resource == "orders":
                    norm_tool = "crm.order"
                elif log.resource == "employees":
                    norm_tool = "crm.employee"

            if norm_tool == "crm.customer":
                if norm_op in ("read", "search", "list"):
                    is_own = (tgt_cust and tgt_cust.upper() == log.user_id.upper()) or (not tgt_cust and role_val == "Customer")
                    details_text = f"Read own profile ({log.user_id})" if is_own else f"Read customer '{tgt_cust or 'All'}' profile"
                elif norm_op in ("update", "update_request", "approve"):
                    is_own = (tgt_cust and tgt_cust.upper() == log.user_id.upper()) or (not tgt_cust and role_val == "Customer")
                    details_text = f"Update own profile ({log.user_id})" if is_own else f"Update customer '{tgt_cust or 'All'}' profile"
                elif norm_op == "create":
                    details_text = f"Create customer profile for '{tgt_cust or 'New'}'"
                elif norm_op == "delete":
                    details_text = f"Delete customer profile '{tgt_cust}'"
            elif norm_tool == "crm.order":
                if norm_op in ("read", "search", "list"):
                    details_text = f"Read order details for '{tgt_ord or 'All'}'"
                elif norm_op in ("create", "create_request"):
                    details_text = f"Create order '{tgt_ord or 'New'}'"
                elif norm_op == "delete":
                    details_text = f"Delete order '{tgt_ord}'"
                elif norm_op in ("approve", "process"):
                    details_text = f"Approve order '{tgt_ord}'"
            elif norm_tool == "crm.employee":
                if norm_op in ("read", "search", "list"):
                    details_text = f"Read employee '{tgt_emp or 'All'}' record"
                elif norm_op in ("create", "update"):
                    details_text = f"Modify employee '{tgt_emp}' record"
            elif norm_tool == "login":
                details_text = f"User login authentication ({log.user_id})"
            elif norm_tool == "session_termination":
                details_text = f"Terminate active session for ({log.user_id})"
            elif norm_tool == "account_suspension":
                details_text = f"Suspend account access for ({log.user_id})"
            elif norm_tool == "threat_meter":
                details_text = f"Update threat risk score for ({log.user_id})"
            elif norm_tool == "security_alert":
                details_text = f"Create dashboard security alert event"
            else:
                details_text = f"Execute action on '{log.tool_name or 'system'}'"

            replayed.append({
                "request_id": f"REQ{log.log_id:06d}",
                "log_id": log.log_id,
                "user_id": log.user_id,
                "user_role": role_val,
                "tool_name": log.tool_name,
                "operation": log.operation,
                "old_decision": old_dec,
                "new_decision": new_dec,
                "changed": changed,
                "details": details_text,
                "reason": new_reason if new_dec == "BLOCK" else (old_reason if old_dec == "BLOCK" else new_reason)
            })

        # Summarize analytics
        total_count = len(replayed)
        changed_count = sum(1 for r in replayed if r["changed"])
        unchanged_count = total_count - changed_count
        pct = round((changed_count / total_count) * 100.0, 2) if total_count > 0 else 0.0

        old_all = sum(1 for r in replayed if r["old_decision"] == "ALLOW")
        old_blk = total_count - old_all
        new_all = sum(1 for r in replayed if r["new_decision"] == "ALLOW")
        new_blk = total_count - new_all

        # Format Top impacts list
        top_impacts_list = [{"rule_name": k, "changes_count": v} for k, v in sorted(impact_rules.items(), key=lambda x: x[1], reverse=True)]

        # Prepare chart values
        chart_data = {
            "old_allowed": old_all,
            "old_blocked": old_blk,
            "new_allowed": new_all,
            "new_blocked": new_blk,
            "changed": changed_count,
            "unchanged": unchanged_count,
            "categories": [{"name": k, "count": v} for k, v in impact_rules.items()]
        }

        return {
            "summary": {
                "total_replayed": total_count,
                "changed_count": changed_count,
                "unchanged_count": unchanged_count,
                "percentage_affected": pct,
                "old_allowed": old_all,
                "old_blocked": old_blk,
                "new_allowed": new_all,
                "new_blocked": new_blk,
                "transitions": transitions
            },
            "replayed_requests": replayed,
            "top_impacts": top_impacts_list,
            "chart_data": chart_data
        }

    def export_simulation_report(self, results: dict, export_format: str) -> bytes:
        import json

        # Export raw JSON
        if export_format.lower() == "json":
            return json.dumps(results, indent=2).encode('utf-8')

        # Export CSV
        elif export_format.lower() == "csv":
            csv_lines = [
                "Request ID,User ID,User Role,Tool Name,Operation,Old Decision,New Decision,Changed?,Reason"
            ]
            for r in results.get("replayed_requests", []):
                changed_str = "Yes" if r["changed"] else "No"
                # Strip commas from reasons
                clean_reason = r["reason"].replace(",", ";")
                csv_lines.append(f"{r['request_id']},{r['user_id']},{r['user_role']},{r['tool_name']},{r['operation']},{r['old_decision']},{r['new_decision']},{changed_str},{clean_reason}")
            return "\n".join(csv_lines).encode('utf-8')

        # Export PDF using custom pure-python basic PDF formatting
        else:
            summary = results.get("summary", {})
            transitions = summary.get("transitions", {})
            top_impacts = results.get("top_impacts", [])

            title = "Enterprise Policy Simulation Impact Report"
            content_lines = [
                "--------------------------------------------------",
                f"Generated At: {datetime.datetime.utcnow().isoformat()}Z",
                f"Total Requests Replayed: {summary.get('total_replayed')}",
                f"Changed Requests: {summary.get('changed_count')} ({summary.get('percentage_affected')}% affected)",
                f"Unchanged Requests: {summary.get('unchanged_count')}",
                "--------------------------------------------------",
                "DECISION TRANSITION STATISTICS:",
                f"  - Allowed -> Allowed: {transitions.get('allow_to_allow')}",
                f"  - Allowed -> Blocked (New Blocks): {transitions.get('allow_to_block')}",
                f"  - Blocked -> Allowed (Access Opens): {transitions.get('block_to_allow')}",
                f"  - Blocked -> Blocked: {transitions.get('block_to_block')}",
                "--------------------------------------------------",
                "TOP RULES CAUSING CHANGES:",
            ]
            
            for item in top_impacts[:10]:
                content_lines.append(f"  - {item['rule_name']}: {item['changes_count']} requests affected")

            content_lines.extend([
                "--------------------------------------------------",
                "AFFECTED REQUESTS TABLE PREVIEW:",
                "Request ID  | Role     | Tool Name    | Old Dec | New Dec | Reason",
            ])

            for r in results.get("replayed_requests", [])[:20]:
                if r["changed"]:
                    rs = f"{r['request_id']:11} | {r['user_role']:8} | {r['tool_name'][:12]:12} | {r['old_decision']:7} | {r['new_decision']:7} | {r['reason'][:25]}"
                    content_lines.append(rs)

            return self._generate_pure_pdf(title, content_lines)

    def _generate_pure_pdf(self, title: str, content_lines: list) -> bytes:
        # Construct basic PDF compliant stream
        pdf = []
        pdf.append(b"%PDF-1.4")
        
        # Catalog
        pdf.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
        
        # Pages tree
        pdf.append(b"2 0 obj\n<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>\nendobj")
        
        # Fonts
        pdf.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj")
        pdf.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj")
        
        # Content Stream
        stream = []
        stream.append(b"BT")
        stream.append(b"/F5 16 Tf")  # Helvetica-Bold
        stream.append(b"60 760 Td")
        stream.append(f"({title}) Tj".encode('latin-1'))
        stream.append(b"0 -30 Td")
        stream.append(b"/F4 9 Tf")   # Helvetica
        
        for line in content_lines:
            escaped = line.replace("(", "\\(").replace(")", "\\)")
            stream.append(f"0 -14 Td ({escaped}) Tj".encode('latin-1'))
            
        stream.append(b"ET")
        stream_content = b"\n".join(stream)
        
        # Page object
        pdf.append(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F4 4 0 R /F5 5 0 R >> >> /Contents 6 0 R >>\nendobj")
        pdf.append(f"6 0 obj\n<< /Length {len(stream_content)} >>\nstream\n".encode('latin-1') + stream_content + b"\nendstream\nendobj")
        
        # Trailer
        pdf.append(b"xref\n0 7\n0000000000 65535 f \n")
        pdf.append(b"trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n0\n%%EOF")
        
        return b"\n".join(pdf)
