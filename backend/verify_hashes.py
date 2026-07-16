from app.utils.auth import verify_password
from app.database import SessionLocal
from app.models.customer import Customer

db = SessionLocal()
cust = db.query(Customer).filter(Customer.customer_id == "CUS000001").first()
h = cust.password_hash
print("Hash in DB:", h)

guesses = [
    "Password123",
    "Admin@123",
    "Customer@123",
    "Customer@1234",
    "password",
    "alicevance",
    "alice",
    "Password@123",
    "welcome123",
    "welcome",
    "banu",
    "Banu@123",
    "banu@123"
]

for g in guesses:
    if verify_password(g, h):
        print(f"MATCH FOUND: plaintext is '{g}'!")
        break
else:
    print("No matches found for common guesses.")
