import unittest

from pydantic import ValidationError

from app.schemas.auth import RegisterRequest
from app.schemas.lead import LeadCreate


class CustomerInputValidationTests(unittest.TestCase):
    def lead_payload(self, **overrides):
        payload = {
            "full_name": "Nguyễn Văn An",
            "phone": "0901 234 567",
            "email": "an@example.com",
            "facility_type": "office",
            "expected_scale": "5_10",
        }
        payload.update(overrides)
        return payload

    def test_lead_normalizes_vietnamese_mobile_number(self):
        lead = LeadCreate(**self.lead_payload(phone="+84 901 234 567"))
        self.assertEqual(lead.phone, "0901234567")

    def test_lead_rejects_invalid_name_phone_and_email(self):
        invalid_values = [
            {"full_name": "Nguyễn 123"},
            {"phone": "012345"},
            {"email": "khong-phai-email"},
        ]
        for values in invalid_values:
            with self.subTest(values=values), self.assertRaises(ValidationError):
                LeadCreate(**self.lead_payload(**values))

    def test_registration_rejects_invalid_name_and_building_code(self):
        base = {
            "name": "Nguyễn Văn An",
            "email": "admin@example.com",
            "password": "123456",
            "confirm_password": "123456",
            "building_name": "Tòa nhà A",
            "building_code": "TOA-A",
        }
        for values in ({"name": "Admin 01"}, {"building_code": "MÃ CÓ KHOẢNG TRẮNG"}):
            with self.subTest(values=values), self.assertRaises(ValidationError):
                RegisterRequest(**{**base, **values})


if __name__ == "__main__":
    unittest.main()
