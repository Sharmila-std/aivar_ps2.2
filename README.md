# Enterprise CRM Security Gateway (Phase 1)

Welcome to the **Enterprise AI Agent Security Gateway CRM**. This repository hosts Phase 1 of the project: a production-grade Enterprise CRM that acts as the administrative and database backend for the security gateway.

The project connects to your **Supabase PostgreSQL** database, populates it with realistic enterprise data, provides a **FastAPI** backend with repository/service architecture, and a premium **React + Vite + TailwindCSS** web interface.

---

## 1. Directory Structure & File Manifest

Here is the finalized directory layout for the project:

```
namashivaya/
├── backend/
│   ├── app/
│   │   ├── models/           # SQLAlchemy database model layer
│   │   │   ├── __init__.py
│   │   │   ├── customer.py
│   │   │   ├── employee.py
│   │   │   ├── order.py
│   │   │   ├── security.py
│   │   │   └── session.py
│   │   ├── schemas/          # Pydantic schema validation layer
│   │   │   ├── __init__.py
│   │   │   ├── customer.py
│   │   │   ├── employee.py
│   │   │   ├── order.py
│   │   │   ├── security.py
│   │   │   └── session.py
│   │   ├── repositories/     # Database CRUD selectors & logic
│   │   │   ├── base.py
│   │   │   ├── customer_repository.py
│   │   │   ├── employee_repository.py
│   │   │   ├── order_repository.py
│   │   │   ├── security_repository.py
│   │   │   └── session_repository.py
│   │   ├── services/         # Business logic layer
│   │   │   ├── customer_service.py
│   │   │   ├── employee_service.py
│   │   │   ├── order_service.py
│   │   │   ├── security_service.py
│   │   │   └── session_service.py
│   │   ├── routes/           # FastAPI router handlers
│   │   │   ├── auth.py
│   │   │   ├── customers.py
│   │   │   ├── dashboard.py
│   │   │   ├── employees.py
│   │   │   ├── orders.py
│   │   │   ├── security.py
│   │   │   └── sessions.py
│   │   ├── utils/            # Hashing and token utilities
│   │   │   └── auth.py
│   │   ├── config.py         # Environmental loaders
│   │   ├── database.py       # Engine & Sessionmakers
│   │   └── main.py           # FastAPI entrypoint
│   ├── .env                  # Configuration variables
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Server execution script
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout structural UI parts
│   │   │   ├── DashboardCard.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopNav.jsx
│   │   ├── pages/            # View pages
│   │   │   ├── Customers.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Employees.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── Refunds.jsx
│   │   │   ├── Roles.jsx
│   │   │   └── Settings.jsx
│   │   ├── api.js            # Axios client configuration
│   │   ├── App.jsx           # App layout and route guard wrapper
│   │   ├── index.css         # Tailwind global style rules
│   │   └── main.jsx          # Entrypoint renderer
│   ├── index.html            # Static HTML page
│   ├── package.json          # Node modules details
│   ├── postcss.config.js     # PostCSS setup
│   ├── tailwind.config.js    # Tailwind layout mappings
│   └── vite.config.js        # Vite compiler rules
└── scripts/
    └── migrate_and_populate.py # DB replication and seeder
```

---

## 2. Module Explanations

### Backend Modules
1. **`app/config.py`**: Loads settings from `.env` using python-dotenv. Exposes the DB connection string and JWT credentials.
2. **`app/database.py`**: Initializes the SQLAlchemy engine, configures transaction sessionmakers, and exports the `get_db` session dependency.
3. **`app/models/`**: Defines SQLAlchemy database tables mapping to your relational layout (e.g. `Customer`, `Order`, `Refund`, etc.).
4. **`app/schemas/`**: Pydantic schemas validating shape, types, and constraints for inputs and serialization on API outputs.
5. **`app/repositories/`**: Isolates direct SQL/ORM queries from the routes, acting as selectors/creators.
6. **`app/services/`**: Bridges repositories and routing. Enforces business rules, logs security audits, and hashes passwords.
7. **`app/routes/`**: Handles HTTP path requests, maps parameters to service actions, and parses outputs.
8. **`app/utils/auth.py`**: Handles bcrypt password hashing, JWT token generations, and standard user security checks.

### Frontend Modules
1. **`src/api.js`**: Reusable axios HTTP client configured with a request interceptor that appends the client token from `localStorage` on every outbound request.
2. **`src/components/Sidebar.jsx` & `TopNav.jsx`**: Global layout containing app menu links and signed-in status.
3. **`src/pages/Login.jsx`**: Administrative entrance requiring corporate credentials.
4. **`src/pages/Customers.jsx`**: Customer grid featuring paginated rows, status filter buttons, header sort buttons, and modals.
5. **`src/pages/Dashboard.jsx`**: KPI counters and activity streams.
6. **`src/pages/Orders.jsx` & `Refunds.jsx`**: Transaction records with itemized overlays and manager actions.
7. **`src/pages/Employees.jsx` & `Roles.jsx`**: Directory listing policies and access permissions.

---

## 3. API Endpoints Reference

All endpoints are fully documented in FastAPI's visual documentation (accessible at `http://localhost:8000/docs`).

### Authentication
- `POST /api/auth/login` (Standard OAuth2 password flow, returns JWT access token)
- `GET /api/auth/me` (Returns logged in employee details)

### Dashboard Aggregates
- `GET /api/dashboard` (KPI indicators and recent feed statistics)

### Customers Module
- `GET /api/customers` (List, search, sort, status filter, and paginated outputs)
- `GET /api/customers/{customer_id}` (Inspect unique customer details)
- `POST /api/customers` (Create a new customer account)
- `PUT /api/customers/{customer_id}` (Modify customer details)
- `DELETE /api/customers/{customer_id}` (Delete customer account)
- `GET /api/customers/pending` (List registration requests)
- `PUT /api/customers/pending/{request_id}` (Approve or Reject registration request)

### Orders & Refunds Modules
- `GET /api/orders` (Search and list purchase transactions)
- `GET /api/orders/{order_id}` (Retrieve itemized products in order)
- `POST /api/orders` (Place purchase order)
- `PUT /api/orders/{order_id}` (Update order details)
- `DELETE /api/orders/{order_id}` (Delete order)
- `GET /api/refunds` (List refund claim lists)
- `GET /api/refunds/{refund_id}` (Inspect refund status)
- `POST /api/refunds` (Create refund request)
- `PUT /api/refunds/{refund_id}` (Process refund status)
- `DELETE /api/refunds/{refund_id}` (Delete refund claim)

### Corporate Personnel (Employees) & Roles
- `GET /api/employees` (Roster of corporate personnel)
- `POST /api/employees` (Add employee profile)
- `PUT /api/employees/{employee_id}` (Modify employee role or credentials)
- `DELETE /api/employees/{employee_id}` (Remove employee)
- `GET /api/roles` (List system roles)

### Security Manifest & Telemetry
- `GET /api/permission-manifest` (Policy list)
- `GET /api/audit-logs` (Database of CRM activities and operations)
- `GET /api/blocked-sessions` (List locked sessions)
- `PUT /api/blocked-sessions/{block_id}` (Toggle blocked status)
- `GET /api/alerts` (List security system alerts)
- `PUT /api/alerts/{alert_id}` (Resolve alerts)
- `GET /api/sessions` (List Active/Expired/Terminated session logs)

---

## 4. Connectivity Explanations

### Backend to Database
The backend communicates with your Supabase database using **SQLAlchemy** (Object Relational Mapping).
1. When FastAPI boots, `database.py` initiates a thread-safe `Engine` using the direct connection string (`postgresql://postgres:sharmila_2004@db.effxoocqzqnsohwqanep.supabase.co:5432/postgres`).
2. When an API route is hit, `get_db()` yields a local transaction context (`SessionLocal`).
3. Services query tables by calling SQLAlchemy queries (e.g. `db.query(Customer)`), translating Python actions to standard Postgres commands.
4. When database updates finish, `db.commit()` writes the transactions.

### Frontend to Backend
The frontend React application communicates only with the FastAPI server.
1. All client requests are routed through the central axios instance (`src/api.js`) pointing to `http://localhost:8000`.
2. When the user logs in, the backend sends a JWT token, which is stored in `localStorage.setItem('token', token)`.
3. The axios request interceptor automatically appends `Authorization: Bearer <token>` to all HTTP headers.
4. The response interceptor listens for `401 Unauthorized` responses and automatically logs out the user if the token expires or is rejected.

---

## 5. Technical Verification Guide

Follow these instructions to run and test every component.

### Step 1: Run the Backend
1. Open a terminal and navigate to the project directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and run the FastAPI server:
   ```bash
   ..\venv\Scripts\python.exe run.py
   ```
3. **Expected Result**: Terminal outputs:
   `INFO:     Uvicorn server running on http://0.0.0.0:8000 (Press CTRL+C to quit)`
   Open your browser and load `http://localhost:8000/api/health`. It should return:
   `{"status": "healthy", "service": "crm-backend", "phase": 1}`

### Step 2: Run the Frontend
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
3. **Expected Result**: Terminal outputs:
   `  VITE v5.x.x  ready in X ms`
   `  ➜  Local:   http://localhost:5173/`

### Step 3: Login to the Gateway
1. Open your browser and navigate to `http://localhost:5173/`.
2. **Expected Result**: Page automatically redirects to `/login`. You should see the sleek corporate gateway form.
3. Enter email: `admin@securescope.ai` and password: `Admin@123`. Click "Sign In".
4. **Expected Result**: Page log in successfully and redirects to `/` showing the main workspace dashboard.

### Step 4: Verify the Dashboard Metrics
1. View the KPI cards on the dashboard page.
2. **Expected Result**:
   - Total Customers: **26**
   - Total Orders: **100**
   - Pending Refunds: **30**
   - Total Employees: **12**
   - Roster lists underneath showing recent entries.

### Step 5: Test Customers CRUD Modals
1. Click **Customers** in the sidebar.
2. **Expected Result**: The customer roster grid renders 8 rows. Page indicator shows `Showing page 1 of 4 (26 entries)`.
3. In the search box, type `Logan`.
4. **Expected Result**: Table filters instantly to show only "Logan Howlett" (1 entry).
5. Clear the search and click "Create Customer".
6. Fill in:
   - Full Name: `Clark Kent`
   - Email: `clark.kent@dailyplanet.com` (use unique email)
   - Phone: `+1555987654` (use unique phone)
   - Address: `Metropolis, NY`
   - Password: `supermanpassword`
   - Status: `Approved`
   Click "Create Account".
7. **Expected Result**: Modal closes, and the customer record is added to the table. Log in to your Supabase PostgreSQL editor and run `SELECT * FROM customers WHERE email = 'clark.kent@dailyplanet.com';` to verify the row exists.
8. Locate `Clark Kent` in the table and click the **Edit (pencil)** icon.
9. Change "Status" from "Approved" to "Suspended". Click "Save Changes".
10. **Expected Result**: The status badge updates to "Suspended" in the table and in the Supabase database.
11. Click the **Trash** icon next to Clark Kent. Click OK on the confirmation dialog.
12. **Expected Result**: The customer record is removed from the table and deleted from your Supabase database.

### Step 6: Test Orders & Refunds Modals
1. Click **Orders** in the sidebar.
2. Click the **View (eye)** icon next to any order.
3. **Expected Result**: Overlay opens and lists the itemized products, units, price, and grand total.
4. Click **Refunds** in the sidebar.
5. Click **Approve (check)** on a pending refund.
6. **Expected Result**: Status badge changes from "Pending" to "Approved" and the action buttons disappear.

### Step 7: Test Settings and 404
1. Click **Settings** in the sidebar.
2. **Expected Result**: Page displays provider (Supabase) connection parameters.
3. Type `http://localhost:5173/some-fake-url` in your browser address bar.
4. **Expected Result**: Render custom 404 page: "404 - Page Not Found. Return to Dashboard".

---

## 6. User Acceptance Testing (UAT) Guide

This guide describes testing scenarios from the perspective of non-technical corporate operators.

### Scenario A: Adding a New Client Account
> **Persona**: "I am a customer support executive, and a new client calls to register an account. I need to register their profile in the CRM."
1. Click **Customers** in the left navigation sidebar.
2. Click the **Create Customer** button at the top right.
3. A form pops up. I type the client's name: `Tony Stark`.
4. I enter their contact details: `tony@stark.com`, `+1555300300`, and address: `Stark Tower, Malibu, CA`.
5. I set their account status to `Approved` and enter a temporary password: `ironmanpassword`.
6. I click the **Create Account** button.
7. **Acceptance Criteria**:
   - The popup disappears.
   - A success alert may be logged.
   - `Tony Stark` appears in the customer grid.
   - Searching `Tony` in the search box shows only their record.

### Scenario B: Auditing Client Order Items
> **Persona**: "I am an account auditor. A client is requesting an breakdown of their order ORD000001 because they forgot which items they purchased."
1. Click **Orders** in the sidebar.
2. Locate order `ORD000001` in the grid.
3. Click the **View (eye icon)** button on the right side of the row.
4. **Acceptance Criteria**:
   - A neat overlay pops up showing "Order Details - ORD000001".
   - Under "Itemized Products", I see a breakdown of the product names, quantity purchased, individual prices, and subtotal.
   - The grand total matches the pricing listed in the grid.
   - I click the close (X) button to go back to the list.

### Scenario C: Processing a Billing Refund request
> **Persona**: "I am a billing manager. Support has filed a refund claim for a client. I need to approve the claim so finance can issue credit."
1. Click **Refunds** in the sidebar.
2. Locate the pending refund request under status "Pending".
3. Check the "Reason" column to verify why they requested a refund (e.g. "Service performance SLA breach").
4. Click the green **Approve (check mark)** button in the actions column.
5. Confirm the request by clicking OK in the popup prompt.
6. **Acceptance Criteria**:
   - The status badge changes to "Approved" with a green theme.
   - The action buttons (Approve/Reject) disappear.
   - In the dashboard, the "Pending Refunds" KPI counter decrements by 1.

---

## 7. Phase 2: AI Workspace Verification

We added a central **🤖 AI Workspace** console to inspect natural language translation to structured Tool JSON payloads.

### Step-by-Step Verification:
1. Navigate to the sidebar and click **AI Workspace**.
2. **Expected Result**: A three-panel layout displays.
   - **Left**: Prompt Input & Sugested Prompts
   - **Center**: JSON payload compiler
   - **Right**: Execution console & metrics
3. Under *Quick Templates*, click **Show customer CUS000001**.
4. **Expected Result**:
   - The prompt text updates.
   - The system compiles the query into the following JSON in the center panel:
     ```json
     {
         "tool": "crm.customer",
         "operation": "read",
         "parameters": {
             "customer_id": "CUS000001"
         }
     }
     ```
   - Validation Status turns green showing **Valid**.
   - The execution flowchart highlights: `1. User Prompt ➔ 2. Groq Parser ➔ 3. JSON Validate ➔ 4. Tool Dispatch`.
5. Click **Execute Tool Call**.
6. **Expected Result**:
   - Right panel displays a status badge of **Success**, execution duration in `ms` and response size in bytes.
   - Response codeblock shows the full profile of Alice Vance (with Aadhaar, PAN, and card numbers).
   - Bottom flowchart highlights **5. CRM Output** as active.

### Scenario D: Natural Language to Tool Execution
> **Persona**: "I am a supervisor. I want to search for wolverine to check his status using the AI Copilot."
1. Open **AI Workspace**.
2. Type `search customer wolverine` in the Prompt box. Click **Generate Tool Call**.
3. **Acceptance Criteria**:
   - Center panel compiles:
     ```json
     {
         "tool": "crm.customer",
         "operation": "search",
         "parameters": {
             "query": "wolverine"
         }
     }
     ```
   - Click **Execute Tool Call**.
   - Right panel shows the matching customer Logan Howlett (CUS000022).

