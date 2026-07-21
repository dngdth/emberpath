from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.lead import CustomerLead
from app.schemas.lead import LeadCreate, LeadCreatedResponse


router = APIRouter(prefix="/leads", tags=["customer leads"])


@router.post("", response_model=LeadCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = CustomerLead(
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email.lower(),
        company_name=payload.company_name,
        facility_type=payload.facility_type,
        expected_scale=payload.expected_scale,
        requirements=payload.requirements,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadCreatedResponse(
        id=lead.id,
        message="Yêu cầu đã được ghi nhận. Đội ngũ Emberpath sẽ sớm liên hệ với bạn.",
    )
