import asyncio
import unittest

from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app.api.routes_admin import impersonate_building, reset_password, update_lead_status
from app.auth.dependencies import get_current_user
from app.auth.security import decode_token, get_password_hash, verify_password
from app.db.base import Base
from app.models import AuditLog, Building, CustomerLead, Floor, User
from app.models.lead import LeadStatus
from app.models.user import UserRole
from app.schemas.lead import LeadStatusUpdate


def make_request(method: str, path: str) -> Request:
    return Request({
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    })


class CustomerManagementTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        host = Building(name="Emberpath Internal", code="INTERNAL")
        self.db.add(host)
        self.db.flush()
        self.admin = User(
            building_id=host.id,
            name="Super Admin",
            email="root@emberpath.test",
            password_hash=get_password_hash("secret123"),
            role=UserRole.SUPER_ADMIN.value,
        )
        self.lead = CustomerLead(
            full_name="Nguyễn An",
            phone="0901234567",
            email="an@example.com",
            company_name="An Tower",
            facility_type="office",
            expected_scale="5_10",
        )
        self.db.add_all([self.admin, self.lead])
        self.db.commit()
        self.db.refresh(self.admin)
        self.db.refresh(self.lead)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_closing_ticket_provisions_tenant_with_hashed_password(self):
        response = update_lead_status(
            self.lead.id,
            LeadStatusUpdate(status=LeadStatus.CLOSED),
            make_request("PATCH", f"/admin/leads/{self.lead.id}/status"),
            self.admin,
            self.db,
        )

        self.assertEqual(response.lead.status, LeadStatus.CLOSED.value)
        self.assertIsNotNone(response.provisioned_account)
        account = response.provisioned_account
        customer = self.db.scalar(select(User).where(User.email == self.lead.email))
        self.assertNotEqual(customer.password_hash, account.temporary_password)
        self.assertTrue(verify_password(account.temporary_password, customer.password_hash))
        self.assertIsNotNone(self.db.scalar(select(Floor).where(Floor.building_id == customer.building_id)))
        self.assertIsNotNone(self.db.scalar(select(AuditLog).where(AuditLog.action == "tenant_provisioned")))

    def test_impersonation_token_is_scoped_and_requests_are_audited(self):
        provisioned = update_lead_status(
            self.lead.id,
            LeadStatusUpdate(status=LeadStatus.CLOSED),
            make_request("PATCH", f"/admin/leads/{self.lead.id}/status"),
            self.admin,
            self.db,
        ).provisioned_account

        response = impersonate_building(
            provisioned.building_id,
            make_request("POST", f"/admin/buildings/{provisioned.building_id}/impersonate"),
            self.admin,
            self.db,
        )
        claims = decode_token(response.access_token)
        self.assertEqual(claims["impersonator_id"], self.admin.id)
        self.assertEqual(claims["building_id"], provisioned.building_id)

        current_user = asyncio.run(get_current_user(
            make_request("GET", "/dashboard/summary"),
            token=response.access_token,
            db=self.db,
        ))
        self.assertEqual(current_user.building_id, provisioned.building_id)
        self.assertIsNotNone(self.db.scalar(select(AuditLog).where(AuditLog.action == "impersonated_request")))

    def test_password_reset_replaces_hash_and_returns_one_time_password(self):
        provisioned = update_lead_status(
            self.lead.id,
            LeadStatusUpdate(status=LeadStatus.CLOSED),
            make_request("PATCH", f"/admin/leads/{self.lead.id}/status"),
            self.admin,
            self.db,
        ).provisioned_account
        customer = self.db.scalar(select(User).where(User.building_id == provisioned.building_id))
        old_hash = customer.password_hash

        response = reset_password(
            customer.id,
            make_request("POST", f"/admin/users/{customer.id}/reset-password"),
            self.admin,
            self.db,
        )
        self.db.refresh(customer)
        self.assertNotEqual(old_hash, customer.password_hash)
        self.assertTrue(verify_password(response.temporary_password, customer.password_hash))

    def test_cancellation_requires_reason(self):
        with self.assertRaises(ValidationError):
            LeadStatusUpdate(status=LeadStatus.CANCELLED)


if __name__ == "__main__":
    unittest.main()
