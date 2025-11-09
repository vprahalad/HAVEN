"""
Migration script to add current_address, current_latitude, and current_longitude columns to users table
Run this script to update existing databases with the new columns.
"""
from app import create_app, db
from sqlalchemy import text

def migrate():
    """Add current_address, current_latitude, and current_longitude columns to users table if they don't exist"""
    app = create_app()
    with app.app_context():
        try:
            # Check if columns already exist
            result = db.session.execute(text(
                "PRAGMA table_info(users)"
            ))
            columns = [row[1] for row in result]
            
            added_columns = []
            
            if 'current_address' not in columns:
                # Add the current_address column
                db.session.execute(text(
                    "ALTER TABLE users ADD COLUMN current_address VARCHAR(500)"
                ))
                added_columns.append("current_address")
                print("✅ Added current_address column to users table")
            else:
                print("ℹ️  Column current_address already exists in users table")
            
            if 'current_latitude' not in columns:
                # Add the current_latitude column
                db.session.execute(text(
                    "ALTER TABLE users ADD COLUMN current_latitude REAL"
                ))
                added_columns.append("current_latitude")
                print("✅ Added current_latitude column to users table")
            else:
                print("ℹ️  Column current_latitude already exists in users table")
            
            if 'current_longitude' not in columns:
                # Add the current_longitude column
                db.session.execute(text(
                    "ALTER TABLE users ADD COLUMN current_longitude REAL"
                ))
                added_columns.append("current_longitude")
                print("✅ Added current_longitude column to users table")
            else:
                print("ℹ️  Column current_longitude already exists in users table")
            
            if added_columns:
                db.session.commit()
                print(f"✅ Successfully added {len(added_columns)} column(s) to users table")
            else:
                print("ℹ️  All columns already exist. No migration needed.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during migration: {str(e)}")
            print("Note: If you're using a database other than SQLite, you may need to run this migration manually.")
            raise

if __name__ == '__main__':
    migrate()

