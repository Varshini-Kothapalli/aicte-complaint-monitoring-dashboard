# AICTE Integrated Institution Complaint Monitoring and Status Dashboard

Smart India Hackathon 2026 prototype: a single-window dashboard where authorised AICTE officials see
institution-related cases across Bureaus/Cells (PGRC, RB, AB), track status and movement, and — in
later phases — get explainable, human-reviewed cross-Bureau overlap alerts.

> **Data notice.** This prototype is not connected to any AICTE system. All cases, institutions and
> officers are **synthetic demonstration data** (IDs start with `SYN-`). Historical ACSS records are
> kept separately as `IMPORTED_UNVERIFIED` and are not used as cases. See `docs/DATA_PROVENANCE.md`.

## Stack

React 18 + Vite · Node.js 20+ / Express 4 · MongoDB 7 / Mongoose 8 (npm workspaces: `frontend/`, `backend/`).

## Quick start

```bash
# 1. Install (from the repository root)
npm install

# 2. Configure the backend
cp backend/.env.example backend/.env      # edit MONGODB_URI if needed

# 3. Start MongoDB (local install, e.g. `net start MongoDB` on Windows / `mongod --dbpath <dir>`)

# 4. Load the synthetic fixtures (safe to re-run; never deletes data)
npm run seed:dry-run    # optional: validate only
npm run seed

# 5. Run
npm run dev:backend     # http://localhost:5000/api/v1/health
npm run dev:frontend    # http://localhost:5173
```

## Scripts (root)

| Script | What it does |
|---|---|
| `npm run seed` / `npm run seed:dry-run` | Import / validate the fixtures in `data/processed/extracted/csv/` |
| `npm run dev:backend` / `npm run start:backend` | API server with / without auto-reload |
| `npm run dev:frontend` | Vite dev server (proxies `/api` to port 5000) |
| `npm run build:frontend` | Production build of the frontend |
| `npm run test:backend` | Backend unit + integration tests (needs MongoDB) |
| `npm run test:health` | Call the health endpoint |

## What works today (phase 2)

- MongoDB models and indexes for all collections in `docs/DATABASE_SCHEMA.md`
- Idempotent, validating fixture importer with an inserted/updated/unchanged/skipped/rejected report
- `GET /api/v1/cases`, `/cases/:caseId`, `/institutions`, `/institutions/:institutionId`
- Live **Cases Explorer**, **Institution Profiles**, case detail (with action timeline) and
  institution detail (cases consolidated across Bureaus)

Dashboard, Overlap Detection, Alerts and Reports pages still show static placeholder content.
See `docs/IMPLEMENTATION_ROADMAP.md` for the next phases.

## Documentation

`docs/DATA_IMPORT.md` (import) · `docs/API_SPECIFICATION.md` · `docs/DATABASE_SCHEMA.md` ·
`docs/DATASET_ASSESSMENT.md` · `docs/DATA_PROVENANCE.md` · `docs/SYSTEM_ARCHITECTURE.md` ·
`docs/SECURITY_AND_ACCESS_CONTROL.md` · `docs/IMPLEMENTATION_ROADMAP.md` · `docs/CLAUDE_HANDOFF.md`
