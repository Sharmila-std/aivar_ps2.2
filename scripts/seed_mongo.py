import os
import sys
from sqlalchemy import create_engine, text
from pymongo import MongoClient

# Database URIs
SOURCE_URL = "postgresql://neondb_owner:npg_h8akAGBUlO6T@ep-withered-night-ah3ppnip.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
MONGO_URL = "mongodb+srv://sarmiladevig45_db_user:r2FUOv1qIv6iIhCN@aivar.6nnqwej.mongodb.net/?tlsAllowInvalidCertificates=true"

print("1. Connecting to source cloud PostgreSQL database...")
sql_engine = create_engine(SOURCE_URL)

print("2. Connecting to target MongoDB Atlas database...")
try:
    mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    # Ping check
    mongo_client.admin.command('ping')
    print("-> Connected to MongoDB Atlas successfully!")
except Exception as e:
    print(f"\nERROR: Connection to MongoDB Atlas failed. This is typically because your IP address is not whitelisted in the MongoDB Atlas Network Security settings.")
    print(f"Details: {e}")
    sys.exit(1)

mongo_db = mongo_client["aivar"]

# Database collections/tables to seed
tables = [
    "roles",
    "employees",
    "customers",
    "orders",
    "order_items",
    "refunds",
    "permission_manifest",
    "audit_logs",
    "blocked_sessions",
    "security_alerts",
    "user_warnings",
    "sessions"
]

print("\n3. Migrating records...")
with sql_engine.connect() as conn:
    for table in tables:
        print(f"\nProcessing collection: '{table}'...")
        try:
            res = conn.execute(text(f"SELECT * FROM {table}"))
            keys = res.keys()
            rows = [dict(zip(keys, r)) for r in res.fetchall()]
        except Exception as sql_err:
            print(f"-> Error reading SQL table '{table}': {sql_err}. Skipping.")
            continue
            
        print(f"-> Found {len(rows)} records in source database.")
        
        coll = mongo_db[table]
        # Clean collection
        coll.delete_many({})
        
        if rows:
            # Clean Decimal types for BSON encoding
            from decimal import Decimal
            for r in rows:
                for col_key, col_val in r.items():
                    if isinstance(col_val, Decimal):
                        r[col_key] = float(col_val)
            # Pymongo insert
            coll.insert_many(rows)
            print(f"-> Inserted {len(rows)} records into MongoDB Atlas.")
        else:
            print(f"-> Collection is empty, skipped insert.")

print("\nMigration to MongoDB Atlas completed successfully!")
