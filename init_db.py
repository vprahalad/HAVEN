"""
Initialize database and create tables
"""
from app import create_app, db
from app.models import User, Incident, HazardReport, SafeZone

def init_db():
    """Initialize the database"""
    app = create_app()
    with app.app_context():
        # Drop all tables (use with caution in production!)
        # db.drop_all()
        
        # Create all tables
        db.create_all()
        print("✅ Database initialized successfully!")

if __name__ == '__main__':
    init_db()


