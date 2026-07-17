from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from typing import Dict, Any

from ..database import get_db
from ..services.security_service import SecurityService
from ..utils.auth import get_current_employee
from ..models.employee import Employee
from ..schemas.policy_simulator import LiveSettingsResponse, SimulationRequest, SimulationResponse

router = APIRouter(prefix="/api/policy-simulator", tags=["Policy Impact Simulator"])
service = SecurityService()

@router.get("/live-settings", response_model=LiveSettingsResponse)
def get_live_settings(
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    role_name = getattr(current_employee, "role", "Customer")
    if role_name.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Administrator role."
        )
    return service.get_live_settings(db)

@router.post("/run", response_model=SimulationResponse)
def run_simulation(
    payload: SimulationRequest = Body(...),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    role_name = getattr(current_employee, "role", "Customer")
    if role_name.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Administrator role."
        )
    
    return service.run_policy_simulation(db, payload.dict())

@router.post("/export")
def export_report(
    payload: Dict[str, Any] = Body(...),
    current_employee: Any = Depends(get_current_employee)
):
    role_name = getattr(current_employee, "role", "Customer")
    if role_name.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Administrator role."
        )

    results = payload.get("results")
    export_format = payload.get("format", "csv").lower()

    if not results:
        raise HTTPException(
            status_code=400,
            detail="Simulation results payload is required to export report."
        )

    report_bytes = service.export_simulation_report(results, export_format)

    if export_format == "json":
        media_type = "application/json"
        filename = "policy_simulation_report.json"
    elif export_format == "csv":
        media_type = "text/csv"
        filename = "policy_simulation_report.csv"
    else:
        media_type = "application/pdf"
        filename = "policy_simulation_report.pdf"

    return StreamingResponse(
        BytesIO(report_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
