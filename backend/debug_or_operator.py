from app.database import SessionLocal
from app.models.customer import Customer
from sqlalchemy import or_

expr = (Customer.customer_id == 'foo') | (Customer.email == 'bar')
print("Expression type:", type(expr))
print("Expression type name:", type(expr).__name__)
print("Operator attribute exists:", hasattr(expr, "operator"))
if hasattr(expr, "operator"):
    print("Operator type:", type(expr.operator))
    print("Operator name:", expr.operator.__name__ if hasattr(expr.operator, "__name__") else str(expr.operator))
    print("Is or_ in operator name:", "or" in (expr.operator.__name__ if hasattr(expr.operator, "__name__") else str(expr.operator)).lower())

# Compile using database.py parser
db = SessionLocal()
from app.database import parse_sqlalchemy_expression
compiled = parse_sqlalchemy_expression(expr, db)
print("\nCompiled MongoDB Query:", compiled)
