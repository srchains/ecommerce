import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sr_chains.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresl://", 1) if "postgresql://" not in DATABASE_URL else DATABASE_URL
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# connect_args={"check_same_thread": False} is required only for SQLite
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_light_migrations():
    """Additive, idempotent schema tweaks that Base.metadata.create_all can't do
    on its own (it never ALTERs an existing table). Safe to run on every start."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "customers" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("customers")}
        if "email_verified" not in cols:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE customers ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0"
                ))
                # Grandfather every existing customer as already-verified.
                conn.execute(text("UPDATE customers SET email_verified = 1"))
