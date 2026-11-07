# AGENT.md — Developer & AI Agent Context Guide

This document is the single source of truth for AI agents and developers working on the **Spark ERP (School Portal)** codebase. Read this file first before making changes or exploring code.

---

## 1. Project Overview

Spark ERP is a full-featured, multi-school management and learning management portal. It supports student admissions, fees, attendance, classes, courses, exams, schedules, parent communication, and payment processing.

### Tech Stack
| Tier | Technology | Key Libraries |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Tailwind CSS, React Router v6, Chart.js, Recharts, Lucide Icons, Socket.io-client, Firebase Web SDK |
| **Backend** | Node.js + Express.js | Mongoose (MongoDB ODM), Socket.IO, Firebase Admin SDK, Cloudinary, Razorpay SDK, JWT, Bcrypt |
| **Database** | MongoDB | MongoDB Atlas (Cloud) / Local Community Server |
| **Auth** | Firebase Auth + JWT | Dual auth (Firebase tokens on client + JWT tokens on backend) |
| **Storage** | Cloudinary | Image and file uploads via Multer + Cloudinary Storage |
| **Payments**| Razorpay | Course, product, and school fee transactions (Test/Live modes) |

---

## 2. Quick Run Guide

### Run with One Command
From the root repository directory:

- **Windows Batch (Command Prompt or Double-Click):**
  ```cmd
  start.bat       # Starts backend & frontend
  stop.bat        # Cleanly stops both services
  seed.bat        # Seeds comprehensive demo data across all modules
  ```
- **PowerShell:**
  ```powershell
  .\start.ps1     # Starts backend & frontend
  ```

Both scripts automatically spawn two dedicated terminal windows:
1. **Backend API:** `http://localhost:5000` (API base: `http://localhost:5000/api`)
2. **Frontend UI:** `http://localhost:5173`

### Manual Run
```powershell
# Backend
cd backend
npm start       # or npm run dev

# Frontend (in a separate terminal)
cd "school portal"
npm run dev
```

---

## 3. Directory Structure

```text
SPARK CODE BASE/
├── AGENT.md                       # This document (AI Agent guide)
├── start.bat                      # One-click Windows runner
├── start.ps1                      # One-click PowerShell runner
├── backend/                       # Express.js REST API & WebSocket server
│   ├── config/
│   │   ├── firebase-admin.js      # Initializes Firebase Admin SDK
│   │   └── serviceAccountKey.json # Firebase Admin private key (gitignored)
│   ├── controllers/               # Business logic (auth, courses, payments, etc.)
│   ├── middleware/                # Auth verification, role checks, upload handlers
│   ├── models/                    # Mongoose schemas (50+ models: Student, User, Course, etc.)
│   ├── routes/                    # Express route definitions (/api/*)
│   ├── scripts/                   # Database migrations, seeders, reset scripts
│   ├── services/                  # Auxiliary services (notifications, push tokens)
│   ├── socket/                    # Socket.IO handlers for real-time chat & events
│   ├── utils/                     # Razorpay, Cloudinary, and helper utilities
│   ├── config.env / .env          # Backend environment variables
│   ├── index.js                   # Main server entrypoint (port 5000)
│   └── package.json
│
└── school portal/                 # React 18 frontend dashboard
    ├── src/
    │   ├── components/            # UI components (Navbar, Sidebar, Modals, Tables)
    │   ├── config/
    │   │   └── firebase.ts        # Frontend Firebase client initialization
    │   ├── context/               # React Contexts (AuthContext, etc.)
    │   ├── pages/                 # Route views (Dashboard, Students, Fees, Courses, etc.)
    │   ├── services/              # Axios / Fetch client API wrappers
    │   ├── utils/                 # Formatters, date helpers, constants
    │   ├── App.tsx                # Main router and layout wrapper
    │   └── index.tsx              # React DOM render entry
    ├── .env                       # Frontend environment variables (VITE_API_URL)
    ├── package.json
    └── vite.config.ts
```

---

## 4. Configuration & Secrets

### Backend (`backend/config.env` and `backend/.env`)
- `PORT`: `5000`
- `NODE_ENV`: `development`
- `MONGODB_URI`: Use an environment secret; never place a connection string in documentation.
- `JWT_SECRET`: Random 32+ character secret for JWT signing
- `FRONTEND_URL`: `http://localhost:5173`
- `ALLOWED_ORIGINS`: Allowed origins for CORS (`http://localhost:5173,http://localhost:4000`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

### Backend Firebase Admin
- File location: `backend/config/serviceAccountKey.json`
- Required by `backend/config/firebase-admin.js` for verifying Firebase auth tokens.

### Frontend (`school portal/.env`)
```env
VITE_API_URL=/api
```

### Frontend Firebase (`school portal/src/config/firebase.ts`)
Contains the web client `firebaseConfig` object (`apiKey`, `authDomain`, `projectId`, etc.).

---

## 5. Default Accounts & Access

On backend startup, `index.js` bootstraps a school admin only when both bootstrap environment variables are provided. Remove them after initial setup:

- **Email:** Set `BOOTSTRAP_ADMIN_EMAIL` in a local secret store.
- **Password:** Set a unique `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters) in a local secret store.
- **Role:** `school_admin`

---

## 6. Key APIs & Route Endpoints

All backend routes are prefixed with `/api`:

| Route Prefix | File | Purpose |
| :--- | :--- | :--- |
| `/api/auth` | `routes/auth.js` | Login, register, token verification, password reset |
| `/api/users` | `routes/users.js` | User management & permissions |
| `/api/schools` | `routes/schools.js` | School branch / tenant management |
| `/api/students` | `routes/students.js` | Student records, roll numbers, admissions |
| `/api/teachers` | `routes/teachers.js` | Teacher profiles & subjects |
| `/api/courses` | `routes/courses.js` | Online courses, modules, lessons |
| `/api/classes` | `routes/classes.js` | Class sections, grades, streams |
| `/api/attendance`| `routes/attendance.js`| Daily student attendance tracking |
| `/api/billing` | `routes/billing.js` | Invoices, fee structures, collections |
| `/api/payments` | `routes/payments.js` | Razorpay order creation & signature verification |
| `/api/inventory`| `routes/inventory.js`| School inventory and supplies |
| `/api/messages` | `routes/messages.js` | Internal communication & notifications |

---

## 7. Common Pitfalls & Agent Rules

1. **`serviceAccountKey.json` requirement:**
   - `backend/config/firebase-admin.js` uses `require('./serviceAccountKey.json')`. If the file is missing, the server will crash at boot with `MODULE_NOT_FOUND`. Always ensure this file exists or is mocked safely.
2. **Dual `.env` loading in backend:**
   - Some utility scripts look for `backend/.env` while `index.js` explicitly loads `backend/config.env`. Keep both in sync whenever environment variables are updated.
3. **MongoDB Atlas SRV resolution (`querySrv ENOTFOUND`):**
   - Free Atlas clusters (M0) auto-pause after inactivity. Resume them in the MongoDB Atlas console if connection fails with `ENOTFOUND`.
4. **CORS & Port Configuration:**
   - Frontend runs strictly on `5173`. Backend on `5000`. If ports change, update `FRONTEND_URL` in `backend/config.env` and `VITE_API_URL` in `school portal/.env`.
5. **No manual DB index dropping without checks:**
   - The student collection enforces unique indexes across `rollNumber` and school ID. Use the utility scripts in `backend/` (`check-indexes-mongodb.js`, `fix-indexes.js`) when modifying schema keys.
