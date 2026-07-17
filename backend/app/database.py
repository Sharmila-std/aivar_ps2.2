import os
import re
import datetime
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Active database configuration state
USE_MONGO = True
mongo_client = None

# Dummy local in-memory SQLite database for SQLAlchemy metadata/relationships import compat
fallback_engine = create_engine("sqlite:///:memory:")
SqliteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fallback_engine)

# Unconditionally connect to MongoDB Atlas (required, no fallback)
if not settings.DATABASE_URL.startswith("mongodb"):
    raise Exception(f"CRITICAL: DATABASE_URL must start with 'mongodb' or 'mongodb+srv', but got: {settings.DATABASE_URL}")

try:
    import pymongo
    # Short timeout to avoid hangs on startup
    mongo_client = pymongo.MongoClient(
        settings.DATABASE_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000
    )
    # Test connection
    mongo_client.admin.command('ping')
    print("Database Connection: Successfully connected to MongoDB Atlas!")
except Exception as e:
    raise Exception(f"CRITICAL: Failed to connect to MongoDB Atlas. Render deployment will fail: {e}")

# Dummy engine for SQLAlchemy metadata/relationships import compat
engine = fallback_engine
Base = declarative_base()

# MongoDB SQLAlchemy-Compatible Query Adapter
class MongoQuery:
    def __init__(self, session, model_class):
        self.session = session
        self.model_class = model_class
        self.filters = []
        self.joins = []
        self._limit = None
        self._offset = None
        self._order_by = None

    def filter(self, *expressions):
        for expr in expressions:
            self.filters.append(expr)
        return self

    def filter_by(self, **kwargs):
        for k, v in kwargs.items():
            col = getattr(self.model_class, k, None)
            if col is not None:
                self.filters.append(col == v)
        return self

    def join(self, *args, **kwargs):
        self.joins.extend(args)
        return self

    def outerjoin(self, *args, **kwargs):
        self.joins.extend(args)
        return self

    def limit(self, value):
        self._limit = value
        return self

    def offset(self, value):
        self._offset = value
        return self

    def order_by(self, *args):
        self._order_by = args
        return self

    def _compile_filter(self):
        mongo_filter = {}
        for expr in self.filters:
            expr_dict = parse_sqlalchemy_expression(expr, self.session, self.joins)
            merge_filters(mongo_filter, expr_dict)
        return mongo_filter

    def all(self):
        coll_name = get_collection_name(self.model_class)
        coll = self.session.db[coll_name]
        query_dict = self._compile_filter()
        cursor = coll.find(query_dict)
        
        if self._order_by:
            sort_ops = []
            for ob in self._order_by:
                field_name, direction = parse_order_by(ob)
                if field_name:
                    sort_ops.append((field_name, direction))
            if sort_ops:
                cursor = cursor.sort(sort_ops)
        
        if self._offset is not None:
            cursor = cursor.skip(self._offset)
        if self._limit is not None:
            cursor = cursor.limit(self._limit)
            
        results = []
        for doc in cursor:
            doc.pop("_id", None)
            
            # Populate missing default column values on retrieved documents
            from sqlalchemy.inspection import inspect
            mapper = inspect(self.model_class)
            for col in mapper.columns:
                field_name = col.name
                if field_name not in doc or doc[field_name] is None:
                    if col.default is not None:
                        if callable(col.default.arg):
                            doc[field_name] = col.default.arg(None)
                        else:
                            doc[field_name] = col.default.arg
                            
            inst = self.model_class(**doc)
            self.session._register_loaded(inst)
            results.append(inst)
        return results

    def first(self):
        res = self.limit(1).all()
        return res[0] if res else None

    def count(self):
        coll_name = get_collection_name(self.model_class)
        coll = self.session.db[coll_name]
        query_dict = self._compile_filter()
        return coll.count_documents(query_dict)

    def scalar(self):
        # Scalar usually returns count or exists values
        res = self.first()
        if res:
            return res
        return None

# MongoDB SQLAlchemy-Compatible Session Adapter
class MongoSession:
    def __init__(self, client, db_name="aivar"):
        self.client = client
        self.db = client[db_name]
        self._to_save = []
        self._to_delete = []
        self._loaded_instances = {}  # id(instance) -> (instance, initial_dict)

    def _register_loaded(self, instance):
        import copy
        doc = instance_to_dict(instance)
        self._loaded_instances[id(instance)] = (instance, copy.deepcopy(doc))

    def query(self, model_class):
        return MongoQuery(self, model_class)

    def add(self, instance):
        if instance not in self._to_save:
            self._to_save.append(instance)

    def add_all(self, instances):
        for inst in instances:
            self.add(inst)

    def delete(self, instance):
        if instance not in self._to_delete:
            self._to_delete.append(instance)

    def commit(self):
        import copy
        # Detect dirty changes on loaded objects
        for inst_id, (inst, initial_doc) in list(self._loaded_instances.items()):
            current_doc = instance_to_dict(inst)
            if current_doc != initial_doc:
                if inst not in self._to_save:
                    self._to_save.append(inst)

        for inst in self._to_save:
            model_class = type(inst)
            coll_name = get_collection_name(model_class)
            coll = self.db[coll_name]
            
            pk_name, is_auto_int = get_primary_key_info(model_class)
            doc = instance_to_dict(inst)
            
            pk_val = doc.get(pk_name)
            if is_auto_int and (pk_val is None or pk_val == 0):
                max_doc = coll.find_one(sort=[(pk_name, -1)])
                new_pk = (max_doc[pk_name] + 1) if max_doc else 1
                doc[pk_name] = new_pk
                setattr(inst, pk_name, new_pk)
                pk_val = new_pk

            if pk_val is not None:
                coll.update_one({pk_name: pk_val}, {"$set": doc}, upsert=True)
            else:
                coll.insert_one(doc)
            
            # Sync the loaded snapshot with the new saved state
            self._loaded_instances[id(inst)] = (inst, copy.deepcopy(doc))
                
        for inst in self._to_delete:
            model_class = type(inst)
            coll_name = get_collection_name(model_class)
            coll = self.db[coll_name]
            
            pk_name, _ = get_primary_key_info(model_class)
            pk_val = getattr(inst, pk_name)
            if pk_val is not None:
                coll.delete_one({pk_name: pk_val})
                self._loaded_instances.pop(id(inst), None)

        self._to_save = []
        self._to_delete = []

    def rollback(self):
        self._to_save = []
        self._to_delete = []

    def refresh(self, instance):
        model_class = type(instance)
        coll_name = get_collection_name(model_class)
        coll = self.db[coll_name]
        
        pk_name, _ = get_primary_key_info(model_class)
        pk_val = getattr(instance, pk_name)
        if pk_val is not None:
            doc = coll.find_one({pk_name: pk_val})
            if doc:
                for k, v in doc.items():
                    if k != "_id":
                        setattr(instance, k, v)
                import copy
                self._loaded_instances[id(instance)] = (instance, copy.deepcopy(instance_to_dict(instance)))

    def merge(self, instance):
        self.add(instance)
        return instance

    def flush(self):
        pass

    def close(self):
        pass

# Helper logic to parse SQLAlchemy models & queries
def get_collection_name(model_class):
    if hasattr(model_class, "__tablename__"):
        return model_class.__tablename__
    name = model_class.__name__.lower()
    if name == "session":
        return "sessions"
    return name + "s"

def get_primary_key_info(model_class):
    from sqlalchemy.inspection import inspect
    mapper = inspect(model_class)
    pk_column = mapper.primary_key[0]
    pk_name = pk_column.name
    from sqlalchemy.types import Integer
    is_auto_int = isinstance(pk_column.type, Integer)
    return pk_name, is_auto_int

def instance_to_dict(instance):
    from sqlalchemy.inspection import inspect
    mapper = inspect(instance).mapper
    doc = {}
    for attr in mapper.column_attrs:
        field_name = attr.key
        value = getattr(instance, field_name)
        
        # Evaluate defaults if the value is None
        if value is None:
            col = mapper.columns.get(field_name)
            if col is not None and col.default is not None:
                if callable(col.default.arg):
                    value = col.default.arg(None)
                else:
                    value = col.default.arg
                setattr(instance, field_name, value)
                
        # Convert decimal values if any to float
        from decimal import Decimal
        if isinstance(value, Decimal):
            value = float(value)
        doc[field_name] = value
    return doc

def parse_order_by(ob):
    from sqlalchemy.sql.elements import UnaryExpression
    import pymongo
    if isinstance(ob, UnaryExpression):
        element = ob.element
        modifier = str(ob.modifier)
        field_name = getattr(element, "key", getattr(element, "name", None))
        direction = pymongo.DESCENDING if "desc" in modifier.lower() else pymongo.ASCENDING
    else:
        field_name = getattr(ob, "key", getattr(ob, "name", None))
        direction = pymongo.ASCENDING
    return field_name, direction

def parse_sqlalchemy_expression(expr, session, joins=None):
    from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList, Grouping, UnaryExpression, BindParameter
    
    expr_type = type(expr).__name__
    
    if expr_type == "BinaryExpression" or isinstance(expr, BinaryExpression):
        left = expr.left
        right = expr.right
        operator = expr.operator.__name__ if hasattr(expr.operator, "__name__") else str(expr.operator)
        
        left_key = getattr(left, "key", getattr(left, "name", None))
        left_model = getattr(left, "class_", getattr(getattr(left, "table", None), "name", None))
        
        if isinstance(right, BindParameter):
            value = right.value
        elif hasattr(right, "value"):
            value = right.value
        else:
            value = right

        if hasattr(value, "key") or hasattr(value, "name"):
            value = getattr(value, "key", getattr(value, "name", None))

        # Check if the query is a joined table match
        left_model_name = ""
        if left_model:
            if hasattr(left_model, "__name__"):
                left_model_name = left_model.__name__
            elif isinstance(left_model, str):
                if left_model.lower() == "roles":
                    left_model_name = "Role"
                elif left_model.lower() == "customers":
                    left_model_name = "Customer"
                elif left_model.lower() == "employees":
                    left_model_name = "Employee"
                elif left_model.lower() == "orders":
                    left_model_name = "Order"
                else:
                    left_model_name = left_model.title()

        if left_model_name in ("Role", "Customer", "Employee", "Order"):
            # Avoid recursive lookup if left_model is the query target itself
            pass

        if operator in ("equal_op", "equals", "==", "eq", "equal"):
            if left_model_name in ("Role", "Customer", "Employee") and joins:
                sub_filter = resolve_join_filter(left_model, left_key, value, session)
                if sub_filter:
                    return sub_filter
            return {left_key: value}
        elif operator in ("not_equal_op", "not_equals", "!=", "ne", "not_equal"):
            return {left_key: {"$ne": value}}
        elif operator in ("greater_than_op", "gt", ">"):
            return {left_key: {"$gt": value}}
        elif operator in ("greater_than_or_equal_op", "ge", ">="):
            return {left_key: {"$gte": value}}
        elif operator in ("less_than_op", "lt", "<"):
            return {left_key: {"$lt": value}}
        elif operator in ("less_than_or_equal_op", "le", "<="):
            return {left_key: {"$lte": value}}
        elif operator in ("in_op", "in"):
            return {left_key: {"$in": list(value)}}
        elif "like" in operator.lower():
            val_str = str(value)
            regex_str = "^" + val_str.replace("%", ".*") + "$"
            return {left_key: {"$regex": regex_str, "$options": "i"}}
            
    elif expr_type == "BooleanClauseList" or isinstance(expr, BooleanClauseList):
        clauses = [parse_sqlalchemy_expression(c, session, joins) for c in expr.clauses if c is not None]
        clauses = [c for c in clauses if c]
        if not clauses:
            return {}
        operator = expr.operator.__name__ if hasattr(expr.operator, "__name__") else str(expr.operator)
        if "or" in operator.lower():
            return {"$or": clauses}
        else:
            return {"$and": clauses}
            
    elif expr_type == "Grouping" or isinstance(expr, Grouping):
        return parse_sqlalchemy_expression(expr.element, session, joins)
        
    elif expr_type == "UnaryExpression" or isinstance(expr, UnaryExpression):
        element = expr.element
        left_key = getattr(element, "key", getattr(element, "name", None))
        expr_str = str(expr).lower()
        if "is null" in expr_str:
            return {left_key: None}
        elif "is not null" in expr_str:
            return {left_key: {"$ne": None}}
        elif "not" in expr_str:
            child = parse_sqlalchemy_expression(element, session, joins)
            if child:
                return {"$nor": [child]}
            
    return {}

def resolve_join_filter(join_model, join_key, value, session):
    join_coll = get_collection_name(join_model)
    coll = session.db[join_coll]
    docs = list(coll.find({join_key: value}))
    
    model_name = getattr(join_model, "__name__", "")
    if not model_name and isinstance(join_model, str):
        if join_model.lower() == "roles":
            model_name = "Role"
        elif join_model.lower() == "customers":
            model_name = "Customer"
        elif join_model.lower() == "employees":
            model_name = "Employee"
        elif join_model.lower() == "orders":
            model_name = "Order"
        else:
            model_name = join_model.title()

    if model_name == "Role":
        role_ids = [d["role_id"] for d in docs]
        return {"role_id": {"$in": role_ids}}
    elif model_name == "Customer":
        customer_ids = [d["customer_id"] for d in docs]
        return {"customer_id": {"$in": customer_ids}}
    elif model_name == "Employee":
        employee_ids = [d["employee_id"] for d in docs]
        return {"employee_id": {"$in": employee_ids}}
    return {}

def merge_filters(target, source):
    for k, v in source.items():
        if k in target:
            if isinstance(target[k], dict) and isinstance(v, dict):
                target[k].update(v)
            elif k == "$and":
                target[k].extend(v)
            elif k == "$or":
                target[k].extend(v)
            else:
                target["$and"] = target.get("$and", [])
                target["$and"].append({k: target.pop(k)})
                target["$and"].append({k: v})
        else:
            target[k] = v

# Database Dependency Provider
def SessionLocal():
    if not mongo_client:
        raise Exception("CRITICAL: MongoDB Atlas connection is not initialized.")
    return MongoSession(mongo_client, "aivar")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
