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
        limit: int = 100
    ) -> Tuple[List[AuditLog], int]:
        return self.repo.get_audit_logs_all(db, user_id, operation, resource, decision, skip, limit)

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
                                    {"role": "user", "content": prompt}
                                ],
                                "temperature": 0.2
                            }
                        )
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
            
        # 2. Call Groq to generate warning email
        system_prompt = (
            "You are a professional Enterprise Security Officer. Generate a professional warning email "
            "notifying a user that their account was temporarily suspended due to multiple security violations. "
            "The email must explain:\n"
            "- The reason for suspension (repeated unauthorized AI tool access)\n"
            "- The policy violated\n"
            "- Instructions for future usage (adhere to regional and role boundaries)\n"
            "- Consequences of repeated violations (permanent disablement)\n\n"
            "Format it nicely with a Subject: header at the top, followed by the Body."
        )
        
        prompt = (
            f"User ID: {alert.user_id}\n"
            f"User Name: {user_name}\n"
            f"Role: {user_role}\n"
            f"Incident Reason: {alert.reason}\n"
        )
        
        email_content = (
            "Subject: Security Warning: Account Temporarily Suspended\n\n"
            "Dear User,\n\n"
            "Your account has been temporarily suspended due to repeated policy violations. "
            "Please contact your administrator."
        )
        from ..config import settings
        import httpx
        if settings.GROQ_API_KEY:
            try:
                with httpx.Client(timeout=15.0) as client:
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
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.7
                        }
                    )
                    if res.status_code == 200:
                        email_content = res.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"Error calling Groq for warning email: {e}")
                
        # Parse Subject
        subject = "Security Warning: Account Suspended"
        body = email_content
        if "Subject:" in email_content:
            parts = email_content.split("\n", 1)
            subject = parts[0].replace("Subject:", "").strip()
            body = parts[1].strip() if len(parts) > 1 else email_content

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
