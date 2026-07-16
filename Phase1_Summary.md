# Phase 1 Summary: Enterprise CRM Security Gateway

This document provides a comprehensive report of all work accomplished during Phase 1. It details the database schema, exact record counts, structural modules of both backend and frontend, PII configuration changes, and verification summaries.

---

## 1. Project Goal & Accomplished Milestones

The goal of Phase 1 was to build a complete, production-ready, administrative **Enterprise CRM** using a modern FastAPI backend, a React + Vite + TailwindCSS frontend, and a Supabase PostgreSQL database. This CRM serves as the foundation for the AI Security Gateway proxy layers planned for later phases.

### Key Milestones Met:
1. **Replicated & Populated Database**: Migrated 13 tables from the original Neon database to the Supabase instance.
2. **Added Session Telemetry**: Created a `sessions` table to track administrative and customer logins.
3. **Established Layered Backend**: Built a clean, decoupled architecture using the Repository-Service-Controller pattern.
4. **Customized Premium Frontend UI**: Programmed a complete Single Page Application (SPA) with a sleek glassmorphic layout, fully working tables, filters, search, paginated routes, and interactive modals.
5. **PII Masking Foundation**: Added custom columns (`aadhaar_number`, `pan_number`, `card_number`) to the customer records and seeded them with realistic mock data.
6. **Resolved Core Serialization & Passlib Version Bugs**: Fixed a `passlib` version conflict in Python 3.11+ by invoking direct `bcrypt` libraries, and resolved Pydantic v2 list serialization bugs by defining proper paginated wrappers.

---

## 2. Database Schema & Record Counts

The database is active on Supabase under host `db.effxoocqzqnsohwqanep.supabase.co`. It contains **14 tables** in the `public` schema.

### Record Inventory (Actual Count):
- **`roles`**: **6 records** (Support, Manager, HR, Finance, Admin, Customer).
- **`employees`**: **12 records** (1 system admin, 11 supplemental personnel).
- **`customers`**: **26 records** (All updated with fictional Aadhaar, PAN, and card numbers).
- **`pending_customers`**: **0 records** (Fresh registration requests).
- **`orders`**: **100 records** (Fictional billing transactions).
- **`order_items`**: **197 records** (Line-item details linked to the orders).
- **`refunds`**: **30 records** (Billing refund request tickets).
- **`sessions`**: **20 records** (Mock session logs).
- **`permission_manifest`**: **34 records** (Policy definitions mapping roles to tool operations).
- **`audit_logs`**: **11 records** (CRM telemetry logs).
- **`security_alerts`**: **3 records** (Telemetry indicators).
- **`user_warnings`**: **0 records** (Security warning entries).
- **`blocked_sessions`**: **0 records** (Locked session lists).
- **`customer_activity`**: **0 records** (Customer telemetry logs).

---

### Detailed Table Schemas

#### 1. Table: `roles`
*   **Columns**:
    - `role_id` (Integer, Primary Key, Serial)
    - `role_name` (Varchar(50), Unique, Not Null)
    - `description` (Text, Nullable)

#### 2. Table: `employees`
*   **Columns**:
    - `employee_id` (Varchar(20), Primary Key)
    - `full_name` (Varchar(255), Not Null)
    - `email` (Varchar(255), Unique, Not Null)
    - `password_hash` (Varchar(255), Not Null)
    - `role_id` (Integer, Foreign Key -> `roles.role_id`, Not Null)
    - `created_at` (Timestamp, Default: `now()`)

#### 3. Table: `customers`
*   **Columns**:
    - `customer_id` (Varchar(20), Primary Key)
    - `full_name` (Varchar(255), Not Null)
    - `email` (Varchar(255), Unique, Not Null)
    - `phone` (Varchar(50), Unique, Not Null)
    - `address` (Text, Not Null)
    - `profile_image` (Varchar(255), Nullable)
    - `password_hash` (Varchar(255), Not Null)
    - `status` (Varchar(20), Not Null)
    - `aadhaar_number` (Varchar(20), Nullable)
    - `pan_number` (Varchar(20), Nullable)
    - `card_number` (Varchar(20), Nullable)
    - `created_at` (Timestamp, Default: `now()`)
    - `updated_at` (Timestamp, Default: `now()`)

#### 4. Table: `pending_customers`
*   **Columns**:
    - `request_id` (Integer, Primary Key, Serial)
    - `full_name` (Varchar(255), Not Null)
    - `email` (Varchar(255), Not Null)
    - `phone` (Varchar(50), Not Null)
    - `address` (Text, Not Null)
    - `profile_image` (Varchar(255), Nullable)
    - `request_status` (Varchar(20), Not Null)
    - `aadhaar_number` (Varchar(20), Nullable)
    - `pan_number` (Varchar(20), Nullable)
    - `card_number` (Varchar(20), Nullable)
    - `created_at` (Timestamp, Default: `now()`)

#### 5. Table: `orders`
*   **Columns**:
    - `order_id` (Varchar(20), Primary Key)
    - `customer_id` (Varchar(20), Foreign Key -> `customers.customer_id`, Not Null)
    - `product_name` (Varchar(255), Not Null)
    - `category` (Varchar(100), Not Null)
    - `quantity` (Integer, Not Null)
    - `price` (Numeric(10, 2), Not Null)
    - `order_date` (Timestamp, Default: `now()`)
    - `delivery_address` (Text, Not Null)
    - `payment_method` (Varchar(50), Not Null)
    - `payment_status` (Varchar(20), Not Null)
    - `order_status` (Varchar(20), Not Null)
    - `expected_delivery` (Timestamp, Nullable)
    - `updated_at` (Timestamp, Default: `now()`)

#### 6. Table: `order_items`
*   **Columns**:
    - `item_id` (Integer, Primary Key, Serial)
    - `order_id` (Varchar(20), Foreign Key -> `orders.order_id`, Not Null)
    - `product_name` (Varchar(255), Not Null)
    - `quantity` (Integer, Not Null)
    - `unit_price` (Numeric(10, 2), Not Null)
    - `subtotal` (Numeric(10, 2), Not Null)

#### 7. Table: `refunds`
*   **Columns**:
    - `refund_id` (Varchar(20), Primary Key)
    - `customer_id` (Varchar(20), Foreign Key -> `customers.customer_id`, Not Null)
    - `order_id` (Varchar(20), Foreign Key -> `orders.order_id`, Not Null)
    - `refund_reason` (Text, Not Null)
    - `refund_amount` (Numeric(10, 2), Not Null)
    - `refund_status` (Varchar(20), Not Null)
    - `created_at` (Timestamp, Default: `now()`)
    - `updated_at` (Timestamp, Default: `now()`)

#### 8. Table: `sessions`
*   **Columns**:
    - `session_id` (Varchar(64), Primary Key)
    - `user_id` (Varchar(20), Nullable)
    - `login_time` (Timestamp, Default: `now()`)
    - `logout_time` (Timestamp, Nullable)
    - `user_role` (Varchar(50), Not Null)
    - `session_status` (Varchar(20), Not Null)

#### 9. Table: `permission_manifest`
*   **Columns**:
    - `manifest_id` (Integer, Primary Key, Serial)
    - `role` (Varchar(50), Not Null)
    - `tool_name` (Varchar(100), Not Null)
    - `operation` (Varchar(20), Not Null)
    - `resource` (Varchar(50), Not Null)
    - `allowed` (Boolean, Not Null)
    - `scope_rule` (Varchar(255), Not Null)
    - `description` (Text, Nullable)

#### 10. Table: `audit_logs`
*   **Columns**:
    - `log_id` (Integer, Primary Key, Serial)
    - `timestamp` (Timestamp, Default: `now()`)
    - `session_id` (Varchar(64), Nullable)
    - `user_id` (Varchar(20), Nullable)
    - `tool_name` (Varchar(100), Nullable)
    - `operation` (Varchar(20), Nullable)
    - `resource` (Varchar(50), Nullable)
    - `decision` (Varchar(50), Not Null)
    - `reason` (Text, Nullable)
    - `risk_score` (Integer, Nullable)
    - `execution_time` (Float, Nullable)
    - `status` (Varchar(20), Nullable)
    - `original_prompt` (Text, Nullable)
    - `generated_tool` (Text, Nullable)
    - `decision_trace` (Text, Nullable)
    - `security_alert_id` (Integer, Nullable)

#### 11. Table: `security_alerts`
*   **Columns**:
    - `alert_id` (Integer, Primary Key, Serial)
    - `session_id` (Varchar(64), Nullable)
    - `user_id` (Varchar(20), Nullable)
    - `alert_type` (Varchar(100), Not Null)
    - `severity` (Varchar(20), Not Null)
    - `risk_score` (Integer, Not Null)
    - `reason` (Text, Not Null)
    - `decision_trace` (Text, Nullable)
    - `status` (Varchar(20), Not Null)
    - `resolution_notes` (Text, Nullable)
    - `investigation_notes` (Text, Nullable)
    - `created_at` (Timestamp, Default: `now()`)
    - `resolved_at` (Timestamp, Nullable)
    - `resolved_by` (Varchar(20), Nullable)

#### 12. Table: `user_warnings`
*   **Columns**:
    - `warning_id` (Integer, Primary Key, Serial)
    - `user_id` (Varchar(20), Not Null)
    - `alert_id` (Integer, Foreign Key -> `security_alerts.alert_id`, Not Null)
    - `warning_number` (Integer, Not Null)
    - `warning_message` (Text, Not Null)
    - `email_sent` (Boolean, Not Null)
    - `created_at` (Timestamp, Default: `now()`)

#### 13. Table: `blocked_sessions`
*   **Columns**:
    - `block_id` (Integer, Primary Key, Serial)
    - `session_id` (Varchar(64), Nullable)
    - `user_id` (Varchar(20), Not Null)
    - `blocked_reason` (Text, Not Null)
    - `risk_score` (Integer, Not Null)
    - `blocked_at` (Timestamp, Default: `now()`)
    - `blocked_by` (Varchar(20), Not Null)
    - `is_active` (Boolean, Not Null)

#### 14. Table: `customer_activity`
*   **Columns**:
    - `activity_id` (Integer, Primary Key, Serial)
    - `customer_id` (Varchar(20), Foreign Key -> `customers.customer_id`, Not Null)
    - `activity_type` (Varchar(100), Not Null)
    - `activity_description` (Text, Not Null)
    - `created_at` (Timestamp, Default: `now()`)

---

## 3. Architecture & Code Structure

### Backend Modules:
- **`app/database.py`**: Exports the SQLAlchemy engine and thread-local session makers.
- **`app/models/`**: Houses declarative SQLAlchemy mappings.
- **`app/schemas/`**: Defines validation and serialization constraints via Pydantic v2.
- **`app/repositories/`**: Contains direct database queries, filters, paginated results, and sorts.
- **`app/services/`**: Bridges repositories and routing. Manages business logic and hashes credentials.
- **`app/routes/`**: Handles paths for authentications, customers, orders, employees, sessions, security, and dashboard stats.
- **`app/utils/auth.py`**: Generates JSON Web Tokens (JWT) and uses `bcrypt` directly to perform secure password hashing and verification.

### Frontend Modules (Single Page Application):
- **`src/api.js`**: Reusable axios HTTP client configured with a request interceptor that appends the client token from `localStorage` on every outbound request.
- **`src/components/Sidebar.jsx` & `TopNav.jsx`**: Global layout containing app menu links and signed-in status.
- **`src/pages/Login.jsx`**: Administrative entrance requiring corporate credentials.
- **`src/pages/Customers.jsx`**: Customer grid featuring paginated rows, status filter buttons, header sort buttons, and modals.
- **`src/pages/Dashboard.jsx`**: KPI counters and activity streams.
- **`src/pages/Orders.jsx` & `Refunds.jsx`**: Transaction records with itemized overlays and manager actions.
- **`src/pages/Employees.jsx` & `Roles.jsx`**: Directory listing policies and access permissions.
- **`src/pages/Settings.jsx` & `NotFound.jsx`**: Settings page listing connected DB status and custom 404 page template.

---

## 4. PII Mock Data Verification

Mock personal identifier data (PII) has been successfully seeded in the database for the 26 customers.

### Sample Seed Data Output:
- **CUS000001 (Alice Vance)**:
  - Aadhaar: `7757 2004 9186`
  - PAN: `PCTJY4861V`
  - Card Number: `4297-3175-4003-2842`
- **CUS000002 (Bob Vance)**:
  - Aadhaar: `6073 3521 9166`
  - PAN: `WORCY4133D`
  - Card Number: `4125-8196-5676-5014`
- **CUS000022 (Logan Howlett)**:
  - Aadhaar: `8040 8844 3085`
  - PAN: `YTWJC9957Q`
  - Card Number: `4226-5830-8720-3651`

---

## 5. Quick Verification Guide

For detailed instructions, refer to the [README.md](file:///c:/Users/Mohan/Downloads/namashivaya/README.md).

1. **Start Backend**:
   ```bash
   cd backend
   ..\venv\Scripts\python.exe run.py
   ```
2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
3. **Login Details**:
   - URL: `http://localhost:5173/`
   - Email: `admin@securescope.ai`
   - Password: `Admin@123`
