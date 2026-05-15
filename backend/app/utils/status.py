from datetime import datetime


def evaluate_sensor_status(sensor_type: str, value: float, threshold: float) -> str:
    # Both MQ2 and temperature use the same threshold pattern in this MVP.
    return "danger" if value >= threshold else "safe"


def iso_or_none(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None
