from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from ..database import Base

class Employee(Base):
    __tablename__ = 'employees'

    employee_id = Column(String(20), primary_key=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.role_id'), nullable=False)
    role = Column(String(50), nullable=True)
    region = Column(String(100), nullable=True)
    status = Column(String(20), default="Active", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    role_obj = relationship("Role", back_populates="employees")
