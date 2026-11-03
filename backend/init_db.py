import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

def init_postgres():
    # Connect to default postgres database
    try:
        conn = psycopg2.connect(dbname='postgres', user='postgres', host='127.0.0.1', port=5432)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # Check if database glow_and_glam_db exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname='glow_and_glam_db'")
        if not cur.fetchone():
            cur.execute("CREATE DATABASE glow_and_glam_db")
            print("Created database glow_and_glam_db")
        else:
            print("Database glow_and_glam_db already exists")

        # Check or create user glow_user
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname='glow_user'")
        if not cur.fetchone():
            cur.execute("CREATE USER glow_user WITH PASSWORD 'glow_secure_pass_2026'")
            print("Created user glow_user")
        else:
            cur.execute("ALTER USER glow_user WITH PASSWORD 'glow_secure_pass_2026'")
            print("Updated user glow_user password")

        cur.execute("GRANT ALL PRIVILEGES ON DATABASE glow_and_glam_db TO glow_user")
        cur.close()
        conn.close()

        # Test connecting to glow_and_glam_db as postgres
        test_conn = psycopg2.connect(dbname='glow_and_glam_db', user='postgres', host='127.0.0.1', port=5432)
        test_cur = test_conn.cursor()
        test_cur.execute("SELECT current_database(), current_user")
        print("Successfully connected to:", test_cur.fetchone())
        test_conn.close()
        return True
    except Exception as e:
        print("PostgreSQL initialization error:", e)
        return False

if __name__ == '__main__':
    init_postgres()
