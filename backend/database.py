from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from backend.config import Config

engine = create_engine(
    Config.SQLALCHEMY_DATABASE_URI,
    connect_args={"check_same_thread": False} if Config.SQLALCHEMY_DATABASE_URI.startswith("sqlite") else {},
    pool_pre_ping=True
)

db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    import backend.models  # Ensure models are imported before creating tables
    Base.metadata.create_all(bind=engine)

def check_db_connection():
    """Verify database connection health."""
    try:
        with engine.connect() as connection:
            from sqlalchemy import text
            connection.execute(text("SELECT 1"))
        return {"status": "connected", "database_uri": Config.SQLALCHEMY_DATABASE_URI.split("@")[-1]}
    except Exception as e:
        return {"status": "error", "error": str(e), "database_uri": Config.SQLALCHEMY_DATABASE_URI.split("@")[-1]}
