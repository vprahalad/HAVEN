"""
Seed database with demo data
"""
from app import create_app, db
from app.models import SafeZone

def seed_safe_zones():
    """Seed demo safe zones"""
    app = create_app()
    with app.app_context():
        # Check if safe zones already exist
        if SafeZone.query.count() > 0:
            print("⚠️  Safe zones already exist. Skipping seed.")
            return
        
        # Demo safe zones (NYC area)
        safe_zones = [
            {
                'name': 'Central Park North',
                'address': 'Central Park, New York, NY 10024',
                'latitude': 40.8002,
                'longitude': -73.9662,
                'accessible': True
            },
            {
                'name': 'Washington Square Park',
                'address': 'Washington Square Park, New York, NY 10012',
                'latitude': 40.7305,
                'longitude': -73.9902,
                'accessible': True
            },
            {
                'name': 'Riverside Park',
                'address': 'Riverside Park, New York, NY 10025',
                'latitude': 40.7769,
                'longitude': -73.9776,
                'accessible': True
            },
            {
                'name': 'Prospect Park',
                'address': 'Prospect Park, Brooklyn, NY 11215',
                'latitude': 40.6602,
                'longitude': -73.9776,
                'accessible': True
            },
        ]
        
        for zone_data in safe_zones:
            zone = SafeZone(**zone_data, active=True)
            db.session.add(zone)
        
        db.session.commit()
        print(f"✅ Seeded {len(safe_zones)} safe zones!")

if __name__ == '__main__':
    seed_safe_zones()


