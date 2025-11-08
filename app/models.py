"""
SQLAlchemy models for HAVEN
"""
from datetime import datetime
from app import db

class User(db.Model):
    """User model - minimal for now"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    reports = db.relationship('HazardReport', backref='user', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'external_id': self.external_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Incident(db.Model):
    """Incident model - groups related hazard reports"""
    __tablename__ = 'incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    hazard_type = db.Column(db.String(100), nullable=False, index=True)
    severity = db.Column(db.String(50), nullable=False)  # low, medium, high
    status = db.Column(db.String(50), nullable=False, default='unverified')  # unverified, verified
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(500), nullable=True)
    impact_radius_m = db.Column(db.Float, nullable=False)  # in meters
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    reports = db.relationship('HazardReport', backref='incident', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_reports=False):
        """Convert incident to dictionary"""
        data = {
            'id': self.id,
            'hazard_type': self.hazard_type,
            'severity': self.severity,
            'status': self.status,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'impact_radius_m': self.impact_radius_m,
            'impact_radius': self.impact_radius_m / 1000.0,  # Convert to km for frontend
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'report_count': len(self.reports) if self.reports else 0
        }
        if include_reports:
            data['reports'] = [report.to_dict() for report in self.reports]
        return data
    
    def get_distinct_user_count(self):
        """Get count of distinct users who reported this incident"""
        if not self.reports:
            return 0
        user_ids = {r.user_id for r in self.reports if r.user_id is not None}
        return len(user_ids)

class HazardReport(db.Model):
    """Hazard report model - individual reports from citizens or devices"""
    __tablename__ = 'hazard_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey('incidents.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    source = db.Column(db.String(50), nullable=False, default='citizen')  # citizen, device
    hazard_type = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(500), nullable=True)
    image_url = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'incident_id': self.incident_id,
            'user_id': self.user_id,
            'source': self.source,
            'hazard_type': self.hazard_type,
            'severity': self.severity,
            'confidence': self.confidence,
            'description': self.description,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SafeZone(db.Model):
    """Safe zone model - shelters and evacuation locations"""
    __tablename__ = 'safe_zones'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accessible = db.Column(db.Boolean, default=True, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'accessible': self.accessible,
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


