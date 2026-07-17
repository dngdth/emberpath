from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


SQLITE_TABLE_COLUMNS: dict[str, dict[str, str]] = {
    "floor_plans": {
        "canvas_width": "FLOAT DEFAULT 1600.0",
        "canvas_height": "FLOAT DEFAULT 1000.0",
        "canvas_shape": "VARCHAR(40) DEFAULT 'rect'",
    },
    "plan_objects": {
        "shape_type": "VARCHAR(40)",
        "target_floor_id": "INTEGER",
    },
}


def ensure_sqlite_columns(engine: Engine) -> None:
    """Keep local SQLite demo databases compatible with the current models."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        connection.exec_driver_sql("PRAGMA journal_mode=WAL")
        for table_name, columns in SQLITE_TABLE_COLUMNS.items():
            if table_name not in existing_tables:
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_definition in columns.items():
                if column_name not in existing_columns:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"))
