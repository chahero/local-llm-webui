#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database migration script: Add admin functionality
- Add is_admin column
- Add is_approved column
- Set first user as admin
- Set other users to approved status
"""

import sqlite3
import sys
import os

def migrate():
    """Run migration"""
    try:
        # Determine database path
        db_path = os.path.join(os.path.dirname(__file__), 'instance', 'app.db')
        if not os.path.exists(db_path):
            db_path = './app.db'

        if not os.path.exists(db_path):
            print("Database file not found at:", db_path)
            return False

        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Starting migration...")
        print("-" * 50)

        # 1. Add is_admin column (ignore if exists)
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0')
            print("[OK] is_admin column added")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("[OK] is_admin column already exists")
            else:
                raise

        # 2. Add is_approved column (ignore if exists)
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 0')
            print("[OK] is_approved column added")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("[OK] is_approved column already exists")
            else:
                raise

        # 3. Set first user as admin
        cursor.execute('SELECT id FROM users ORDER BY id LIMIT 1')
        first_user = cursor.fetchone()
        if first_user:
            first_user_id = first_user[0]
            cursor.execute('UPDATE users SET is_admin = 1, is_approved = 1 WHERE id = ?', (first_user_id,))
            print("[OK] User ID " + str(first_user_id) + " set as admin")

            # 4. Set other users to approved status
            cursor.execute('UPDATE users SET is_approved = 1 WHERE id != ?', (first_user_id,))
            result = cursor.rowcount
            if result > 0:
                print("[OK] " + str(result) + " existing users set to approved")
        else:
            print("[INFO] No existing users found")

        conn.commit()
        print("-" * 50)
        print("Migration completed!")
        print("")
        print("Settings:")
        print("- First user is set as admin (is_admin=True)")
        print("- All existing users are approved (is_approved=True)")
        print("- New users start in pending approval status")

        conn.close()
        return True

    except Exception as e:
        print("Migration failed: " + str(e))
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = migrate()
    sys.exit(0 if success else 1)
