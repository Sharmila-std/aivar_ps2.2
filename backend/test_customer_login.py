from app.database import SessionLocal
from app.models.customer import Customer

db = SessionLocal()

print("All Customers in MongoDB:")
customers = db.query(Customer).all()
for c in customers:
    print(f"- ID: {c.customer_id} | Email: {c.email} | Status: {c.status}")

print("\nSimulating query for customer ID: 'CUS000001'")
email_input = "CUS000001"
cust = db.query(Customer).filter(
    (Customer.customer_id == email_input.upper()) | (Customer.email == email_input.lower())
).first()
print("Found by ID:", cust.full_name if cust else "None")

print("\nSimulating query for email: 'alicevance@example.com'")
email_input = "alicevance@example.com"
cust2 = db.query(Customer).filter(
    (Customer.customer_id == email_input.upper()) | (Customer.email == email_input.lower())
).first()
print("Found by Email:", cust2.full_name if cust2 else "None")
