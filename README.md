# SecureScope Gateway: AI Security Proxy & CRM Dashboard

Welcome to the **SecureScope Gateway** repository. This project is a production-grade **AI Tool Permission Proxy** and **Enterprise CRM** backend designed to enforce fine-grained, session-bound access control over autonomous AI agents. 

The application features a FastAPI backend running on a cloud-hosted MongoDB database and a premium React-based frontend dashboard.

---

## 1. Core Platform Features

### 🛡️ Feature A: Dynamic Policy Simulation (High Priority)
* **What-If Sandbox**: Run historical logs through a simulated environment to preview security impacts of changes in permissions (RBAC/ABAC) before updating the live registry.
* **Transition Analysis**: Provides allowed/blocked state changes, access shift calculations, and decision reason resolution (e.g. *"Ownership Violation: Customer cannot access..."*).

### 🎯 Feature B: Attack Replay Center
* **Payload Verification**: Allows security teams to replay batches of historical prompts and tool calls through the gateway proxy to test and verify boundary rules against real incidents.

### 🔑 Feature C: Authentication & Authorization
* **Cryptographic Session Tokens**: Uses JSON Web Tokens (JWT) containing cryptographically signed claims (`session_id`, `role_name`, `user_id`, `region`) verified on every API request.
* **Bcrypt Storage**: Secure salting and hashing is used for credential storage.
* **SMTP Credentials Dispatch**: Generates a secure random 12-character temporary password when a customer account is created and approved, delivering it directly to the customer's inbox.

### 🔒 Feature D: PII Output Redaction Shield
* **Regex Sanitization**: Scans tool execution results and masks sensitive customer data (Credit Cards, Aadhaar IDs, PAN Cards, emails, and phone numbers) in REST responses based on role clearances.

### 🤝 Feature E: Human-in-the-Loop (HITL) Validation
* **Access Buffering**: Critical actions (like account deletion, user creation, or updates) are queued in pending tables.
* **Manual Approvals**: Managers/Admins must review and approve these actions manually. The UI features dynamic badge counters in the sidebar for pending tasks.

### ⚠️ Feature F: Proactive Incident Warnings & Suspension
* **Threat Score Engine**: Tracks violations per active session.
* **Automatic Lockdown**: Reaching **3 blocks** terminates the session, flags the user profile as `Suspended`, and logs them out.
* **Incident Escalation**: Dispatches a warning email notifying the user of suspension due to security violations.

---

## 2. Default Test Credentials

Use these credentials to log into different roles and verify RBAC/ABAC behaviors:

| Email | Password | Role | Region | Scope Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **admin@securescope.ai** | `Admin@123` | **Administrator** | Bangalore | Full global read/write access + Security Sandbox |
| **sarah.connor@securescope.ai** | `Admin@123` | **Manager** | Coimbatore | Coimbatore regional scope approvals |
| **bruce.wayne@securescope.ai** | `Admin@123` | **Manager** | Hyderabad | Hyderabad regional scope approvals |
| **peter.parker@securescope.ai** | `Admin@123` | **Manager** | Kochin | Kochin regional scope approvals |
| **diana.prince@securescope.ai** | `Admin@123` | **Manager** | Kolkata | Kolkata regional scope approvals |
| **wolverine@xmen.org** | `Admin@123` | **Customer** | Westchester | Restricted to own profile (`CUS000022`) & own orders |

---

## 3. Local Installation & Setup Guide

### Prerequisites
* **Python**: 3.9 or higher
* **Node.js**: 16.x or higher
* **npm**: 8.x or higher

### Env Configurations & Online Database Link
The application connects to a **live MongoDB Atlas cloud instance** and has pre-configured SMTP and Groq credentials. You do not need to install or configure a local MongoDB instance. 

* The connection details are already configured in `backend/.env`:
  ```ini
  DATABASE_URL=mongodb+srv://sarmiladevig45_db_user:r2FUOv1qIv6iIhCN@aivar.6nnqwej.mongodb.net/
  GROQ_API_KEY=<your_groq_api_key_from_local_env>
  SECRET_KEY=super-secret-session-secret-key-123456
  ALGORITHM=HS256
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=sarmiladummy@gmail.com
  SMTP_PASSWORD=<your_smtp_app_password_from_local_env>
  SMTP_FROM=sarmiladummy@gmail.com
  ```

---

### Step-by-Step Developer Launch Guide

#### Part 1: Start the Backend API
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and install dependencies:
   ```bash
   # Windows
   ..\venv\Scripts\activate
   pip install -r requirements.txt
   
   # macOS/Linux
   source ../venv/bin/activate
   pip install -r requirements.txt
   ```
3. Run the FastAPI development server:
   ```bash
   python run.py
   ```
4. **Verification**: 
   * Uvicorn should run on `http://0.0.0.0:8000`.
   * Visit `http://localhost:8000/docs` in your browser to inspect the interactive Swagger API documentation.

#### Part 2: Start the Frontend React App
1. Open a new terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```
4. **Verification**: 
   * Open `http://localhost:5173/` in your browser.
   * You will be presented with the newly designed **SecureScope Gateway** login cover page.

---

## 4. Verification and UAT Scenarios

### UAT 1: Verify Policy Simulation (What-If Sandbox)
1. Log in as **admin@securescope.ai**.
2. Navigate to **Policy Simulator** on the sidebar.
3. Click on the **2. Simulated Policy Setup** tab.
4. Modify any permission (e.g. check "Update Customer Records" for Customer).
5. Click **Run Sandbox Replay** and observe the **Impact Analysis Report** showing Allowed/Blocked transition states and specific simulation decision reasons.

### UAT 2: Verify Dynamic Threat Counter and Lockouts
1. Log in as a customer (e.g. `wolverine@xmen.org` / `Admin@123`).
2. Navigate to the **AI Workspace**.
3. Attempt to fetch details of a customer that isn't you (e.g., enter prompt: *"Get details of customer CUS000001"*).
4. Run this **3 times**. On the 3rd attempt, you will be automatically logged out due to session invalidation.
5. Try logging back in with that customer account: you will receive a block message stating your account has been `Suspended`.
6. Log back in as the Admin (`admin@securescope.ai`). Go to **Security Center/Alerts**, locate the alert with 3 violations, and click **Send Warning & Unlock** to restore access and trigger the UAT SMTP warning email.
