import sqlalchemy
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Numeric, Float, text
import datetime
import random

# Connection strings
NEON_URL = "postgresql://neondb_owner:npg_h8akAGBUlO6T@ep-withered-night-ah3ppnip.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
SUPABASE_URL = "postgresql://postgres:sharmila_2004@db.effxoocqzqnsohwqanep.supabase.co:5432/postgres"

# Engines
neon_engine = create_engine(NEON_URL)
supabase_engine = create_engine(SUPABASE_URL)

# 1. Recreate tables on Supabase
# We will define the schema programmatically to ensure defaults and types are perfectly portable
metadata = MetaData()

# Define tables
roles = Table(
    'roles', metadata,
    Column('role_id', Integer, primary_key=True, autoincrement=True),
    Column('role_name', String(50), unique=True, nullable=False),
    Column('description', Text, nullable=True)
)

employees = Table(
    'employees', metadata,
    Column('employee_id', String(20), primary_key=True),
    Column('full_name', String(255), nullable=False),
    Column('email', String(255), unique=True, nullable=False),
    Column('password_hash', String(255), nullable=False),
    Column('role_id', Integer, ForeignKey('roles.role_id'), nullable=False),
    Column('role', String(50), nullable=True),
    Column('region', String(100), nullable=True),
    Column('created_at', DateTime, default=datetime.datetime.utcnow)
)

customers = Table(
    'customers', metadata,
    Column('customer_id', String(20), primary_key=True),
    Column('full_name', String(255), nullable=False),
    Column('email', String(255), unique=True, nullable=False),
    Column('phone', String(50), unique=True, nullable=False),
    Column('address', Text, nullable=False),
    Column('profile_image', String(255), nullable=True),
    Column('password_hash', String(255), nullable=False),
    Column('status', String(20), nullable=False),
    Column('aadhaar_number', String(20), nullable=True),
    Column('pan_number', String(20), nullable=True),
    Column('card_number', String(20), nullable=True),
    Column('region', String(100), nullable=True),
    Column('created_at', DateTime, default=datetime.datetime.utcnow),
    Column('updated_at', DateTime, default=datetime.datetime.utcnow)
)

orders = Table(
    'orders', metadata,
    Column('order_id', String(20), primary_key=True),
    Column('customer_id', String(20), ForeignKey('customers.customer_id', ondelete='CASCADE'), nullable=False),
    Column('product_name', String(255), nullable=False),
    Column('category', String(100), nullable=False),
    Column('quantity', Integer, nullable=False),
    Column('price', Numeric(10, 2), nullable=False),
    Column('order_date', DateTime, default=datetime.datetime.utcnow),
    Column('delivery_address', Text, nullable=False),
    Column('payment_method', String(50), nullable=False),
    Column('payment_status', String(20), nullable=False),
    Column('order_status', String(20), nullable=False),
    Column('expected_delivery', DateTime, nullable=True),
    Column('updated_at', DateTime, default=datetime.datetime.utcnow)
)

order_items = Table(
    'order_items', metadata,
    Column('item_id', Integer, primary_key=True, autoincrement=True),
    Column('order_id', String(20), ForeignKey('orders.order_id', ondelete='CASCADE'), nullable=False),
    Column('product_name', String(255), nullable=False),
    Column('quantity', Integer, nullable=False),
    Column('unit_price', Numeric(10, 2), nullable=False),
    Column('subtotal', Numeric(10, 2), nullable=False)
)

refunds = Table(
    'refunds', metadata,
    Column('refund_id', String(20), primary_key=True),
    Column('customer_id', String(20), ForeignKey('customers.customer_id', ondelete='CASCADE'), nullable=False),
    Column('order_id', String(20), ForeignKey('orders.order_id', ondelete='CASCADE'), nullable=False),
    Column('refund_reason', Text, nullable=False),
    Column('refund_amount', Numeric(10, 2), nullable=False),
    Column('refund_status', String(20), nullable=False),
    Column('created_at', DateTime, default=datetime.datetime.utcnow),
    Column('updated_at', DateTime, default=datetime.datetime.utcnow)
)

permission_manifest = Table(
    'permission_manifest', metadata,
    Column('manifest_id', Integer, primary_key=True, autoincrement=True),
    Column('role', String(50), nullable=False),
    Column('tool_name', String(100), nullable=False),
    Column('operation', String(20), nullable=False),
    Column('resource', String(50), nullable=False),
    Column('allowed', Boolean, nullable=False),
    Column('scope_rule', String(255), nullable=False),
    Column('description', Text, nullable=True)
)

audit_logs = Table(
    'audit_logs', metadata,
    Column('log_id', Integer, primary_key=True, autoincrement=True),
    Column('timestamp', DateTime, default=datetime.datetime.utcnow),
    Column('session_id', String(64), nullable=True),
    Column('user_id', String(20), nullable=True),
    Column('tool_name', String(100), nullable=True),
    Column('operation', String(20), nullable=True),
    Column('resource', String(50), nullable=True),
    Column('decision', String(50), nullable=False),
    Column('reason', Text, nullable=True),
    Column('risk_score', Integer, nullable=True),
    Column('execution_time', Float, nullable=True),
    Column('status', String(20), nullable=True),
    Column('original_prompt', Text, nullable=True),
    Column('generated_tool', Text, nullable=True),
    Column('decision_trace', Text, nullable=True),
    Column('security_alert_id', Integer, nullable=True)
)

blocked_sessions = Table(
    'blocked_sessions', metadata,
    Column('block_id', Integer, primary_key=True, autoincrement=True),
    Column('session_id', String(64), nullable=True),
    Column('user_id', String(20), nullable=False),
    Column('blocked_reason', Text, nullable=False),
    Column('risk_score', Integer, nullable=False),
    Column('blocked_at', DateTime, default=datetime.datetime.utcnow),
    Column('blocked_by', String(20), nullable=False),
    Column('is_active', Boolean, nullable=False)
)

security_alerts = Table(
    'security_alerts', metadata,
    Column('alert_id', Integer, primary_key=True, autoincrement=True),
    Column('session_id', String(64), nullable=True),
    Column('user_id', String(20), nullable=True),
    Column('alert_type', String(100), nullable=False),
    Column('severity', String(20), nullable=False),
    Column('risk_score', Integer, nullable=False),
    Column('reason', Text, nullable=False),
    Column('decision_trace', Text, nullable=True),
    Column('status', String(20), nullable=False),
    Column('resolution_notes', Text, nullable=True),
    Column('investigation_notes', Text, nullable=True),
    Column('created_at', DateTime, default=datetime.datetime.utcnow),
    Column('resolved_at', DateTime, nullable=True),
    Column('resolved_by', String(20), nullable=True)
)

user_warnings = Table(
    'user_warnings', metadata,
    Column('warning_id', Integer, primary_key=True, autoincrement=True),
    Column('user_id', String(20), nullable=False),
    Column('alert_id', Integer, ForeignKey('security_alerts.alert_id', ondelete='CASCADE'), nullable=False),
    Column('warning_number', Integer, nullable=False),
    Column('warning_message', Text, nullable=False),
    Column('email_sent', Boolean, nullable=False),
    Column('created_at', DateTime, default=datetime.datetime.utcnow)
)

customer_activity = Table(
    'customer_activity', metadata,
    Column('activity_id', Integer, primary_key=True, autoincrement=True),
    Column('customer_id', String(20), ForeignKey('customers.customer_id', ondelete='CASCADE'), nullable=False),
    Column('activity_type', String(100), nullable=False),
    Column('activity_description', Text, nullable=False),
    Column('created_at', DateTime, default=datetime.datetime.utcnow)
)

pending_customers = Table(
    'pending_customers', metadata,
    Column('request_id', Integer, primary_key=True, autoincrement=True),
    Column('full_name', String(255), nullable=False),
    Column('email', String(255), nullable=False),
    Column('phone', String(50), nullable=False),
    Column('address', Text, nullable=False),
    Column('profile_image', String(255), nullable=True),
    Column('request_status', String(20), nullable=False),
    Column('aadhaar_number', String(20), nullable=True),
    Column('pan_number', String(20), nullable=True),
    Column('card_number', String(20), nullable=True),
    Column('region', String(100), nullable=True),
    Column('created_at', DateTime, default=datetime.datetime.utcnow)
)
# Phase 1 Sessions Table
sessions = Table(
    'sessions', metadata,
    Column('session_id', String(64), primary_key=True),
    Column('user_id', String(20), nullable=True),
    Column('login_time', DateTime, default=datetime.datetime.utcnow),
    Column('logout_time', DateTime, nullable=True),
    Column('user_role', String(50), nullable=False),
    Column('session_status', String(20), nullable=False)
)

def generate_aadhaar():
    return f"{random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}"

def generate_pan():
    letters1 = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
    digits = "".join(random.choices("0123456789", k=4))
    letter2 = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return f"{letters1}{digits}{letter2}"

def generate_card():
    return f"{random.randint(4000, 4999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def main():
    print("Connecting and creating schema on Supabase...")
    # Drop existing tables to ensure clean slate (safe since user said there are no tables in Supabase db)
    with supabase_engine.connect() as conn:
        print("Dropping tables on Supabase if they exist...")
        metadata.drop_all(bind=supabase_engine)
        
    print("Creating tables on Supabase...")
    metadata.create_all(bind=supabase_engine)
    print("Re-created all tables on Supabase.")

    tables_to_copy = [
        'roles',
        'security_alerts',
        'permission_manifest',
        'pending_customers',
        'audit_logs',
        'blocked_sessions',
        'customers',
        'orders',
        'order_items',
        'refunds',
        'customer_activity',
        'user_warnings'
    ]

    print("\nCopying data from Neon to Supabase...")
    neon_metadata = MetaData()
    neon_metadata.reflect(bind=neon_engine)

    with neon_engine.connect() as neon_conn, supabase_engine.connect() as s_conn:
        for t_name in tables_to_copy:
            n_table = neon_metadata.tables[t_name]
            # Fetch all rows from Neon
            rows = neon_conn.execute(sqlalchemy.text(f"SELECT * FROM {t_name}")).fetchall()
            row_dicts = [dict(r._mapping) for r in rows]
            
            print(f"Copying {len(row_dicts)} rows for table '{t_name}'...")
            
            if len(row_dicts) > 0:
                if t_name in ('customers', 'pending_customers'):
                    for row in row_dicts:
                        row['aadhaar_number'] = generate_aadhaar()
                        row['pan_number'] = generate_pan()
                        row['card_number'] = generate_card()
                s_table = metadata.tables[t_name]
                s_conn.execute(s_table.insert(), row_dicts)
                s_conn.commit()

        # Update ID sequences for tables with autoincrement primary keys
        autoincrement_tables = {
            'roles': 'role_id',
            'permission_manifest': 'manifest_id',
            'audit_logs': 'log_id',
            'blocked_sessions': 'block_id',
            'security_alerts': 'alert_id',
            'user_warnings': 'warning_id',
            'customer_activity': 'activity_id',
            'order_items': 'item_id',
            'pending_customers': 'request_id'
        }
        for tab, pk_col in autoincrement_tables.items():
            max_id_res = s_conn.execute(sqlalchemy.text(f"SELECT COALESCE(MAX({pk_col}), 0) FROM {tab}")).scalar()
            if max_id_res > 0:
                seq_name = f"{tab}_{pk_col}_seq"
                s_conn.execute(sqlalchemy.text(f"SELECT setval('{seq_name}', {max_id_res})"))
                s_conn.commit()
                print(f"Reset sequence '{seq_name}' to {max_id_res}")

    print("\nStarting data supplementation...")
    
    # Let's add extra roles
    # Support, Manager, HR, Finance, Admin, Customer
    with supabase_engine.connect() as s_conn:
        # Check current roles
        roles_res = s_conn.execute(sqlalchemy.text("SELECT role_name FROM roles")).fetchall()
        existing_roles = [r[0] for r in roles_res]
        
        target_roles = [
            ("Support", "Customer support specialist"),
            ("Manager", "Operations and support manager"),
            ("HR", "Human resources manager"),
            ("Finance", "Financial manager for billing and refunds"),
            ("Admin", "System administrator access"),
            ("Customer", "End-user customer role")
        ]
        
        for r_name, r_desc in target_roles:
            if r_name not in existing_roles:
                s_conn.execute(
                    metadata.tables['roles'].insert(),
                    {"role_name": r_name, "description": r_desc}
                )
                print(f"Added role: {r_name}")
        s_conn.commit()

        # Get role mappings for seeding employees
        role_map = {}
        for r_id, r_name in s_conn.execute(sqlalchemy.text("SELECT role_id, role_name FROM roles")).fetchall():
            role_map[r_name] = r_id

        # Seed exactly 5 target employees (1 Admin, 4 Managers)
        print("Re-creating exactly 5 employees (1 Admin, 4 Managers)...")
        s_conn.execute(sqlalchemy.text("DELETE FROM employees"))
        
        target_employees = [
            ("EMP000001", "System Admin", "admin@securescope.ai", "$2b$12$rmYsRahB2rvOOmuxPj5lJe4JL7NAtmXh.Dybzk832urdyIbOPKlyG", "Admin", "admin", "Bangalore"),
            ("EMP000002", "Sarah Connor", "sarah.connor@securescope.ai", "$2b$12$rmYsRahB2rvOOmuxPj5lJe4JL7NAtmXh.Dybzk832urdyIbOPKlyG", "Manager", "manager", "Coimbatore"),
            ("EMP000003", "Bruce Wayne", "bruce.wayne@securescope.ai", "$2b$12$rmYsRahB2rvOOmuxPj5lJe4JL7NAtmXh.Dybzk832urdyIbOPKlyG", "Manager", "manager", "Hyderabad"),
            ("EMP000004", "Peter Parker", "peter.parker@securescope.ai", "$2b$12$rmYsRahB2rvOOmuxPj5lJe4JL7NAtmXh.Dybzk832urdyIbOPKlyG", "Manager", "manager", "Kochin"),
            ("EMP000005", "Diana Prince", "diana.prince@securescope.ai", "$2b$12$rmYsRahB2rvOOmuxPj5lJe4JL7NAtmXh.Dybzk832urdyIbOPKlyG", "Manager", "manager", "Kolkata")
        ]
        for emp_id, name, email, pw, role_name, role, region in target_employees:
            s_conn.execute(
                metadata.tables['employees'].insert(),
                {
                    "employee_id": emp_id,
                    "full_name": name,
                    "email": email,
                    "password_hash": pw,
                    "role_id": role_map[role_name],
                    "role": role,
                    "region": region
                }
            )
            print(f"Added employee: {name} (Role: {role}, Region: {region})")
        s_conn.commit()

        # Supplement Customers (Target 20-30, currently 21)
        cust_count = s_conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM customers")).scalar()
        print(f"Current customer count: {cust_count}")
        if cust_count < 26:
            extra_customers = [
                ("CUS000022", "Logan Howlett", "wolverine@xmen.org", "+1555020022", "1407 Graymalkin Ln, Westchester, NY", "$2b$12$UzhWtDPokqSjxLFmnrogOe2l.fQeS4/OPFvDYQKN2Qx833ZBBdBO.", "Approved"),
                ("CUS000023", "Jean Grey", "jean.grey@xmen.org", "+1555020023", "1407 Graymalkin Ln, Westchester, NY", "$2b$12$UzhWtDPokqSjxLFmnrogOe2l.fQeS4/OPFvDYQKN2Qx833ZBBdBO.", "Approved"),
                ("CUS000024", "Scott Summers", "cyclops@xmen.org", "+1555020024", "1407 Graymalkin Ln, Westchester, NY", "$2b$12$UzhWtDPokqSjxLFmnrogOe2l.fQeS4/OPFvDYQKN2Qx833ZBBdBO.", "Suspended"),
                ("CUS000025", "Ororo Munroe", "storm@xmen.org", "+1555020025", "1407 Graymalkin Ln, Westchester, NY", "$2b$12$UzhWtDPokqSjxLFmnrogOe2l.fQeS4/OPFvDYQKN2Qx833ZBBdBO.", "Approved"),
                ("CUS000026", "Charles Xavier", "professorx@xmen.org", "+1555020026", "1407 Graymalkin Ln, Westchester, NY", "$2b$12$UzhWtDPokqSjxLFmnrogOe2l.fQeS4/OPFvDYQKN2Qx833ZBBdBO.", "Approved")
            ]
            for c_id, name, email, phone, addr, pw, status in extra_customers:
                exists = s_conn.execute(sqlalchemy.text(f"SELECT COUNT(*) FROM customers WHERE customer_id='{c_id}'")).scalar()
                if not exists:
                    s_conn.execute(
                        metadata.tables['customers'].insert(),
                        {
                            "customer_id": c_id,
                            "full_name": name,
                            "email": email,
                            "phone": phone,
                            "address": addr,
                            "password_hash": pw,
                            "status": status,
                            "aadhaar_number": generate_aadhaar(),
                            "pan_number": generate_pan(),
                            "card_number": generate_card()
                        }
                    )
                    print(f"Added customer: {name}")
            s_conn.commit()

        # Seed Sample Sessions in `sessions` table (Target 15+)
        sess_count = s_conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM sessions")).scalar()
        print(f"Current sessions count: {sess_count}")
        if sess_count == 0:
            sample_session_data = []
            users = ["EMP000001", "EMP000002", "EMP000006", "EMP000007", "EMP000010"]
            roles_list = ["Admin", "Customer", "Support", "Manager", "Finance"]
            
            for i in range(20):
                s_id = f"sess_{random.randint(100000, 999999)}_seed"
                user = random.choice(users)
                role = random.choice(roles_list)
                status = random.choice(["Active", "Expired", "Terminated"])
                
                # timestamps
                l_time = datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(1, 48))
                if status == "Active":
                    o_time = None
                else:
                    o_time = l_time + datetime.timedelta(hours=random.randint(1, 8))
                    
                sample_session_data.append({
                    "session_id": s_id,
                    "user_id": user,
                    "login_time": l_time,
                    "logout_time": o_time,
                    "user_role": role,
                    "session_status": status
                })
                
            s_conn.execute(metadata.tables['sessions'].insert(), sample_session_data)
            s_conn.commit()
            # Equal distribution of regions to 26 customers
            print("Distributing regions equally among customers...")
            regions_list = ["Coimbatore", "Bangalore", "Hyderabad", "Kochin", "Kolkata"]
            cust_res = s_conn.execute(sqlalchemy.text("SELECT customer_id FROM customers ORDER BY customer_id")).fetchall()
            for idx, customer in enumerate(cust_res):
                c_id = customer[0]
                assigned_region = regions_list[idx % 5]
                s_conn.execute(
                    sqlalchemy.text("UPDATE customers SET region = :region WHERE customer_id = :id"),
                    {"region": assigned_region, "id": c_id}
                )
            s_conn.commit()
            print("Successfully distributed customer regions.")

    print("\nVerification check:")
    with supabase_engine.connect() as s_conn:
        for t in metadata.tables.keys():
            cnt = s_conn.execute(sqlalchemy.text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"Table: {t} | Count on Supabase: {cnt}")

    print("\nDatabase migration and seeding completed successfully!")

if __name__ == '__main__':
    main()
