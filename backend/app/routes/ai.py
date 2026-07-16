from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..services.ai_service import AIService
from ..services.gateway import SecurityGateway
from ..utils.auth import get_current_employee

router = APIRouter(prefix="/api/ai", tags=["AI Copilot Workspace"])
service = AIService()
gateway = SecurityGateway()

@router.post("/generate", response_model=dict)
def generate_tool_call(
    payload: Dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    prompt = payload.get("prompt")
    if not prompt or not prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt query parameter is required."
        )
    
    try:
        role_name = "Customer" if hasattr(current_employee, "customer_id") else getattr(current_employee, "role", "Support")
        user_id = getattr(current_employee, "customer_id", None) or getattr(current_employee, "employee_id", None)
        tool_json = service.generate_tool_call(prompt, db=db, role_name=role_name, user_id=user_id)
        
        # Simple validations: Check if tool and operation keys exist (support lists/dicts)
        if isinstance(tool_json, list):
            is_valid = len(tool_json) > 0 and all(isinstance(item, dict) and "tool" in item and "operation" in item for item in tool_json)
        else:
            is_valid = isinstance(tool_json, dict) and "tool" in tool_json and "operation" in tool_json
        
        return {
            "prompt": prompt,
            "tool_call": tool_json,
            "is_valid": is_valid,
            "status": "Resolved" if is_valid else "Parse Error"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile AI tool call: {str(e)}"
        )

@router.post("/execute", response_model=dict)
def execute_tool_call(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_employee: Any = Depends(get_current_employee)
):
    from typing import Any
    tool_call = payload.get("tool_call")
    prompt = payload.get("prompt", "")
    if not tool_call:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tool call JSON structure is required."
        )

    result = gateway.execute_with_gateway(db, current_employee, tool_call, prompt=prompt)
    
    # Generate human generative explanation
    if prompt:
        explanation = service.generate_human_explanation(prompt, result)
        result["explanation"] = explanation
    else:
        result["explanation"] = "No prompt provided to generate human explanation."
        
    return result
