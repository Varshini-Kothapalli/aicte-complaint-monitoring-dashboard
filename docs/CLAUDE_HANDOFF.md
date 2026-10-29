# AICTE Integrated Institution Complaint Monitoring and Status Dashboard
## Developer Handoff Document for Claude Pro

> **Recipient Agent:** Claude Pro (AI Coding Assistant)  
> **Authoring Agent:** Antigravity (Google DeepMind)  
> **Project Title:** AICTE Integrated Institution Complaint Monitoring and Status Dashboard  
> **Hackathon Track:** Smart India Hackathon (SIH) 2026  
> **Date of Handoff:** October 2026  

---

## 1. Project Purpose & Mission Context

This system is being developed for AICTE to address the fragmentation of institutional grievances across its key administrative bodies:
- **Public Grievance Redressal Cell (PGRC):** Student and faculty complaints (fee refunds, withheld documents, salary non-payment).
- **Regulation Bureau (RB):** Regulatory non-compliance inquiries, unapproved courses, intake violations, ghost faculty.
- **Approval Bureau (AB):** Annual approval renewal, physical facility deficiencies, institutional affidavits.

The system solves two critical problems:
1. **Cross-Bureau Overlap Blindness:** Identifying when an individual student complaint in PGRC and a regulatory inquiry in RB pertain to the *same institutional misconduct* at the same college.
2. **SLA Accountability:** Tracking statutory disposal deadlines with automated hierarchical escalations (>7 days overdue to Bureau Head, >21 days overdue to Regional Officials & Senior Management).

---

## 2. Technology Stack & Design Philosophy

We use a clean, maintainable **modular monolith** without unnecessary container or message-broker overhead:
- **Frontend:** React 18, Vite, JavaScript (ES modules), React Router v6, custom CSS tokens (AICTE government theme).
- **Backend:** Node.js (v22), Express.js (v4), REST APIs (`/api/v1`), CORS, custom error handling envelope.
- **Database:** MongoDB (v7+) running locally on `127.0.0.1:27017` via Mongoose ODM (v8.9+).
- **NLP / Embeddings:** Transformers.js (`all-MiniLM-L6-v2`, 384-d vectors) executed in-process.
- **Task Scheduling:** Agenda.js (MongoDB-backed persistent cron) for hourly SLA monitoring.

---

## 3. Repository Structure

```
SIH complaints/
├── .gitignore                          # Configured to protect secrets, raw PII, and large archives
├── package.json                        # Root workspace scripts (start:backend, dev:frontend, etc.)
├── backend/
│   ├── .env                            # Local development configuration (PORT=5000, MONGODB_URI)
│   ├── .env.example                    # Template environment variables
│   ├── package.json                    # Backend dependencies (express, mongoose, cors, dotenv)
│   ├── scripts/                        # Database seed and maintenance scripts
│   └── src/
│       ├── app.js                      # Express application setup, middlewares, routes
│       ├── server.js                   # Server bootstrap, MongoDB connection, graceful shutdown
│       ├── config/
│       │   ├── database.js             # Mongoose connection with status tracker & error logging
│       │   └── env.js                  # Environment variable loader
│       ├── controllers/
│       │   └── health.controller.js    # Controller for GET /api/v1/health
│       ├── middleware/
│       │   ├── errorHandler.js         # Standard JSON error response envelope
│       │   └── notFound.js             # 404 handler
│       ├── models/                     # [TO IMPLEMENT] Mongoose model schemas
│       ├── repositories/               # Data access abstraction
│       ├── routes/
│       │   ├── index.js                # API v1 route mounting root
│       │   └── health.routes.js        # Health check router
│       ├── services/                   # Business logic layer
│       ├── jobs/                       # Agenda.js background job definitions
│       ├── validators/                 # Zod validation schemas
│       └── utils/                      # Helper functions
├── frontend/
│   ├── index.html                      # HTML template with AICTE favicon & fonts
│   ├── package.json                    # Frontend dependencies (react, react-router-dom, lucide-react)
│   ├── vite.config.js                  # Vite configuration with backend proxy (/api -> :5000)
│   └── src/
│       ├── main.jsx                    # React entrypoint
│       ├── App.jsx                     # Root router container
│       ├── components/
│       │   ├── Badge.jsx               # Status & band badges
│       │   ├── Header.jsx              # Administrative header with live health indicator
│       │   ├── MetricCard.jsx          # KPI metric cards with watermarking
│       │   ├── ProvenanceTag.jsx       # Watermark pills (SYNTHETIC, VERIFIED, etc.)
│       │   └── Sidebar.jsx             # Collapsible navigation sidebar
│       ├── layouts/
│       │   └── AppLayout.jsx           # Master shell layout with system watermark banner
│       ├── pages/
│       │   ├── DashboardPage.jsx       # Executive dashboard with KPI tiles & demo walkthrough
│       │   ├── CasesExplorerPage.jsx   # Searchable cases explorer with multi-filter bar
│       │   ├── InstitutionsPage.jsx    # Institution profiles & D1 identity explanation
│       │   ├── OverlapDetectionPage.jsx# Engine D2 advisory overlap candidate cards
│       │   ├── AlertsPage.jsx          # Two-tier SLA overdue escalation table
│       │   ├── ReportsPage.jsx         # 6 standard administrative report families
│       │   └── NotFoundPage.jsx        # 404 fallback page
│       ├── routes/
│       │   └── AppRoutes.jsx           # Route definitions
│       ├── services/
│       │   └── api.js                  # Fetch API wrapper
│       └── styles/
│           ├── index.css               # Design tokens, variables, typography
│           ├── layout.css              # App shell, sidebar, and header styling
│           └── components.css          # Tables, badges, metric cards, empty states
├── data/
│   ├── README.md                       # Data provenance and directory layout
│   ├── raw/                            # [Quarantined] Original Dataverse zip (PII protected)
│   └── processed/
│       ├── SIH2026_AICTE_prototype_dataset.xlsx # 14-sheet master workbook
│       ├── SIH2026_dataset_csv_and_scripts.zip # Processed CSV archive
│       └── extracted/                  # Uncompressed fixtures ready for seeding
│           ├── csv/                    # 11 CSV files (cases, institutions, users, etc.)
│           └── scripts/                # Verification and packaging scripts
└── docs/
    ├── architecture.png                # System Architecture reference diagram
    ├── DATASET_ASSESSMENT.md           # Exhaustive data assessment & column profiles
    ├── PROJECT_OVERVIEW.md             # Mission charter & problem statement
    ├── SYSTEM_ARCHITECTURE.md          # Multi-layer architectural specification
    ├── DATABASE_SCHEMA.md              # Proposed Mongoose models & compound indexes
    ├── API_SPECIFICATION.md            # REST API endpoint definitions & contracts
    ├── DATA_PROVENANCE.md              # Four-tier provenance rules & DPDP Act compliance
    ├── SECURITY_AND_ACCESS_CONTROL.md  # RBAC scopes & audit logging specification
    ├── IMPLEMENTATION_ROADMAP.md       # 7-phase delivery milestones
    └── CLAUDE_HANDOFF.md               # This document
```

---

## 4. Key Dataset Findings & Limitations

Read `docs/DATASET_ASSESSMENT.md` thoroughly before modifying data. Key takeaways:
1. **Raw Historical ACSS Dataset (`14,272` raw &rarr; `11,095` cleaned):**
   - **82.3% of records are IT technical support queries** submitted *by* institutions (DSC token errors, portal login issues, payment receipt drops).
   - Only **28 rows (10 distinct matters)** are complaints *against* institutions.
   - It contains NO institution IDs, NO bureau routing, NO assigned officers, and NO resolution statuses.
   - **Do not use raw ACSS as primary case tracking data.**
2. **Synthetic Operational Layer (809 cases, 61 institutions, 27 users, 214 pairs):**
   - Mathematically calibrated to satisfy all SIH problem statement requirements.
   - Every synthetic record carries `provenance = "SYNTHETIC"` and starts with `SYN-`.
   - Verified via `verify.py` with **0 integrity errors**.

---

## 5. Known Issues & Anomalies to Address

### 1. `users.csv` Duplicate User ID Collision (CRITICAL)
- In `data/processed/extracted/csv/users.csv`:
  - Row 17: `user_id = "SYN-USR-REG-NORTHE"`, `display_name = "Regional Official (North-East)"`, `region = "North-East"`
  - Row 19: `user_id = "SYN-USR-REG-NORTHE"`, `display_name = "Regional Official (Northern)"`, `region = "Northern"`
- **Required Action in Seed Script:** During database seeding, row 17 (North-East) must be patched to:
  - `user_id`: `"SYN-USR-REG-NE"`
  - `email`: `"reg-ne@demo.invalid"`
  This preserves the unique index on `user_id` and `email`.

### 2. Deliberate Duplicate Institution Name
- Rows `SYN-INST-0016` and `SYN-INST-0061` both share the name `"PQR Institute of Technology"`. One is in Pune (Maharashtra) and one is in Belagavi (Karnataka).
- **Design Intent:** This tests Engine D1's ability to disambiguate names using location and route unlocalized queries to `VERIFICATION_QUEUE`. Do not alter these records.

### 3. Gated Unverified Cases
- 4 cases (`SYN-PGRC-2026-0806` through `0809`) have null `institution_id` and `identity_status` in `VERIFICATION_QUEUE` or `UNRESOLVED`.
- **Design Intent:** These must be held by the D1 gate and excluded from Engine D2 overlap candidate evaluation until verified by an administrator.

---

## 6. How to Run the Application Locally

### Prerequisites
- Node.js v20+ (tested on v22.18.0)
- MongoDB running locally on `127.0.0.1:27017`

### Commands
```bash
# 1. Start the Backend API (runs on http://localhost:5000)
npm run start:backend
# Or with auto-reload:
npm run dev:backend

# 2. Test Backend Health Endpoint
npm run test:health
# Returns: { status: "ok", database: { status: "connected", healthy: true } }

# 3. Start the Frontend Development Server (runs on http://localhost:5173)
npm run start:frontend
```

---

## 7. Current Implementation vs. Unimplemented Features

### Implemented & Verified
- [x] Git repository initialized with safe `.gitignore`.
- [x] Node.js backend server with CORS, JSON body parser, centralized error handler.
- [x] MongoDB Mongoose connection manager with state tracking and error handling.
- [x] Health check endpoint at `GET /api/v1/health` (verified 200 OK with live MongoDB).
- [x] React 18 SPA built with Vite, styled with custom AICTE design tokens.
- [x] Responsive layout with Sidebar, Header (live health polling), and ProvenanceTag watermarking.
- [x] 6 placeholder pages: Dashboard, All Cases, Institutions, Overlap Detection, Alerts, Reports.
- [x] Full documentation suite in `docs/`.

### Unimplemented (To Be Built in Subsequent Phases)
- [ ] Mongoose model files in `backend/src/models/`.
- [ ] Database seeding script in `backend/scripts/seed_database.js`.
- [ ] REST API endpoints for `/api/v1/cases`, `/api/v1/institutions`, `/api/v1/transfers`.
- [ ] Engine D1: Institution Identity Resolution fuzzy matcher and verification queue.
- [ ] Engine D2: Case Relationship & Overlap Detection using in-process Transformers.js vectors.
- [ ] Agenda.js background job runner for hourly SLA overdue monitoring and escalations.
- [ ] JWT authentication controller and RBAC scope middleware.

---

## 8. Exact Next Task for Claude Pro

Your immediate next task is:
> **"Implement the database foundation and a repeatable synthetic-data import process, based on the actual files and schemas."**

### Action Steps:
1. **Create Mongoose Models (`backend/src/models/`):**
   - Follow the schemas specified in `docs/DATABASE_SCHEMA.md`:
     - `Institution.js`
     - `InstAlias.js`
     - `Bureau.js`
     - `User.js`
     - `CategoryMatrix.js`
     - `Case.js`
     - `CaseAction.js`
     - `Transfer.js`
     - `OverlapGroundTruth.js` (and `OverlapCandidate.js`)
2. **Create the Seeding Script (`backend/scripts/seed_database.js`):**
   - Use `csv-parse` or a simple CSV reader to stream records from `data/processed/extracted/csv/`.
   - Implement the `users.csv` collision patch (`SYN-USR-REG-NORTHE` &rarr; `SYN-USR-REG-NE`).
   - Populate MongoDB collections idempotently (e.g. using `bulkWrite` or `upsert`).
3. **Verify Seeded Data:**
   - Confirm counts: 61 institutions, 130 aliases, 3 bureaus, 27 users, 13 category rules, 809 cases, 4,099 case actions, 25 transfers, 214 ground truth pairs.
   - Ensure `is_overdue` cases equal 162.
4. **Wire Initial Endpoints:**
   - Wire `GET /api/v1/cases` and `GET /api/v1/institutions` to return live records from MongoDB to the frontend.
