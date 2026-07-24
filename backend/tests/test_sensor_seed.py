import unittest

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models import Building, Floor, SensorDevice, SensorReading
from app.seed.seed_data import ensure_extended_satellite_devices


class ExtendedSatelliteSeedTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        building = Building(name="Building A", code="B01")
        self.db.add(building)
        self.db.flush()
        self.floor = Floor(building_id=building.id, name="Tầng 1", order_index=1)
        self.db.add(self.floor)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_existing_database_gets_nodes_4_to_6_only_once(self):
        ensure_extended_satellite_devices(self.db)
        ensure_extended_satellite_devices(self.db)

        devices = self.db.scalars(
            select(SensorDevice).order_by(SensorDevice.device_id)
        ).all()
        self.assertEqual(
            [device.device_id for device in devices],
            [
                "mq2-sat-4",
                "mq2-sat-5",
                "mq2-sat-6",
                "temp-sat-4",
                "temp-sat-5",
                "temp-sat-6",
            ],
        )
        self.assertTrue(all(device.floor_id == self.floor.id for device in devices))
        reading_count = self.db.scalar(select(func.count()).select_from(SensorReading))
        self.assertEqual(reading_count, 6)


if __name__ == "__main__":
    unittest.main()
