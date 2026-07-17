from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
import json
from .routes import auth, customers, orders, employees, security, sessions, dashboard, ai, policy_simulator

class PIIRedactionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Only inspect and redact for API JSON responses
        if request.url.path.startswith("/api/"):
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                # Intercept response body
                body = b""
                async for chunk in response.body_iterator:
                    body += chunk
                
                try:
                    payload = json.loads(body.decode("utf-8"))
                    
                    # Run PII Redaction
                    from .utils.pii_shield import PIIOutputShield
                    redacted_payload, masked_fields, pii_latency = PIIOutputShield.redact_payload(payload)
                    
                    if masked_fields:
                        # Log system audit log if fields were masked
                        # Get database session
                        from .database import SessionLocal
                        from .models.security import AuditLog
                        db = SessionLocal()
                        try:
                            # Try to extract user ID or session ID from request headers or state
                            user_id = "API Client"
                            sess_id = None
                            
                            auth_header = request.headers.get("authorization", "")
                            if auth_header.startswith("Bearer "):
                                token = auth_header.split(" ")[1]
                                from .utils.auth import decode_access_token
                                try:
                                    payload_jwt = decode_access_token(token)
                                    if payload_jwt:
                                        user_id = payload_jwt.get("sub", "API Client")
                                        sess_id = payload_jwt.get("session_id")
                                except Exception:
                                    pass
                                    
                            db.add(AuditLog(
                                user_id=user_id,
                                session_id=sess_id,
                                tool_name="pii_shield",
                                operation="REDACT",
                                resource="rest_response",
                                decision="Allowed",
                                reason=f"PII Shield Executed on REST Response. Fields Masked: {', '.join(masked_fields)}. Masking Latency: {pii_latency} ms. Status: Success.",
                                risk_score=0,
                                status="success"
                            ))
                            db.commit()
                        except Exception as ex:
                            print(f"PII middleware audit logging error: {ex}")
                        finally:
                            db.close()
                    
                    # Rebuild response with masked values
                    redacted_body = json.dumps(redacted_payload).encode("utf-8")
                    
                    # Re-create Response
                    new_response = StarletteResponse(
                        content=redacted_body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type="application/json"
                    )
                    # Update content length header
                    new_response.headers["content-length"] = str(len(redacted_body))
                    return new_response
                except Exception as e:
                    # In case of any error, return the original response body intact
                    print(f"PII Shield middleware error: {e}")
                    return StarletteResponse(
                        content=body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=content_type
                    )
        
        return response

app = FastAPI(
    title="Enterprise CRM Security Gateway Backend (Phase 2)",
    description="Backend CRM layer for authentication, customers, orders, audits, and AI agent interface.",
    version="2.0.0"
)

# CORS Configuration
# React app runs on http://localhost:5173 by default
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(PIIRedactionMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(employees.router)
app.include_router(security.router)
app.include_router(sessions.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(policy_simulator.router)

from .database import fallback_engine, Base
Base.metadata.create_all(bind=fallback_engine)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "crm-backend", "phase": 1}
