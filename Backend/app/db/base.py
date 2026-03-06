from sqlalchemy.orm import declarative_base

# Central Base for all models to ensure relationships work correctly
Base = declarative_base()