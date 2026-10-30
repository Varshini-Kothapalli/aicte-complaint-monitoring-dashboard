# AICTE Integrated Institution Complaint Monitoring and Status Dashboard
## RESTful API Specification (v1)

> **Base URL:** `http://localhost:5000/api/v1`  
> **Status:** Version 1.0.0 &bull; Health, Cases (read) and Institutions (read) Implemented &bull; Other Routes Proposed  
> **Protocol:** JSON over HTTP / HTTPS  

---

## 1. Global Request & Response Conventions

### 1.1 Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-29T17:21:43.025Z",
    "path": "/api/v1/cases",
    "page": 1,
    "limit": 20,
    "total": 809
  }
}
```

### 1.2 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "message": "Resource not found at GET /api/v1/unknown",
    "code": "NOT_FOUND",
    "details": null
  },
  "meta": {
    "timestamp": "2026-10-29T17:21:43.025Z",
    "path": "/api/v1/unknown",
    "method": "GET"
  }
}
```

---

## 2. API Endpoints Directory

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/health` | Live service uptime & database health check | **`IMPLEMENTED`** |
| `GET` | `/` | API version metadata & index | **`IMPLEMENTED`** |
| `POST`| `/auth/login` | Authenticate official; return JWT token & user scope | *`PROPOSED`* |
| `GET` | `/auth/me` | Fetch active user profile and bureau permissions | *`PROPOSED`* |
| `GET` | `/cases` | Query cases with pagination, search, & 8 filters | **`IMPLEMENTED`** |
| `GET` | `/cases/:id` | Get single case details & full chronological actions | **`IMPLEMENTED`** |
| `POST`| `/cases` | Ingest new institutional complaint | *`PROPOSED`* |
| `PATCH`| `/cases/:id/status` | Transition case lifecycle status | *`PROPOSED`* |
| `POST`| `/cases/:id/actions` | Append new manual action/remark to case | *`PROPOSED`* |
| `GET` | `/institutions` | List AICTE institutions with region/stream facets | **`IMPLEMENTED`** |
| `GET` | `/institutions/:id` | 360° institutional view with multi-Bureau complaint history | **`IMPLEMENTED`** |
| `POST`| `/institutions/resolve-identity` | Test or execute Engine D1 identity matching | *`PROPOSED`* |
| `GET` | `/overlap/candidates` | List scored candidate overlap pairs | *`PROPOSED`* |
| `POST`| `/overlap/coordination-decision` | Record official coordination decision (Confirm / Dismiss / Link) | *`PROPOSED`* |
| `GET` | `/transfers` | List inter-Bureau transfer history | *`PROPOSED`* |
| `POST`| `/transfers/request` | Initiate inter-Bureau case handoff | *`PROPOSED`* |
| `PATCH`| `/transfers/:id/accept` | Accept formal transfer into receiving Bureau | *`PROPOSED`* |
| `GET` | `/reports/bureau-workload` | Generate aggregate bureau workload statistics | *`PROPOSED`* |
| `GET` | `/reports/sla-compliance` | Generate SLA resolution time and overdue analytics | *`PROPOSED`* |

---

## 3. Implemented Endpoints

### 3.1 `GET /api/v1/health`
Checks server operational readiness, process memory footprint, and MongoDB connection status.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "AICTE Integrated Institution Complaint Monitoring and Status Dashboard API",
  "version": "1.0.0",
  "environment": "development",
  "uptimeSeconds": 42,
  "timestamp": "2026-10-29T17:21:43.025Z",
  "database": {
    "status": "connected",
    "healthy": true,
    "databaseName": "aicte_complaints",
    "connectedAt": "2026-10-29T17:21:42.945Z",
    "error": null
  },
  "system": {
    "nodeVersion": "v22.18.0",
    "platform": "win32",
    "memory": {
      "rssMb": 69.27,
      "heapUsedMb": 21.79,
      "heapTotalMb": 34.93
    }
  }
}
```

---

## 4. Implemented Domain Endpoints (phase 2)

All four are read-only, return the standard envelope, and respond `503 DATABASE_UNAVAILABLE` when
MongoDB is not connected. Invalid parameters return `400 VALIDATION_ERROR` with a list in
`error.details`. Every record carries `provenance`; derived summaries are marked `DERIVED`.
`meta.overdue` states that `is_overdue` is a dataset snapshot (as of 2026-10-31), not a live value.
Internal fields (`complainant_ref`, `complainant_hash`, `matter_id`, `design_note`, `import_meta`) are never returned.

### 4.A `GET /api/v1/cases`

| Parameter | Values |
|---|---|
| `page`, `limit` | default 1 / 20; `limit` max 100 |
| `sort` | `receipt_date` (default `-receipt_date`), `expected_disposal_date`, `case_id`, `status`, `bureau`, `last_action_at`; prefix `-` for descending |
| `bureau`, `status`, `region`, `category`, `identity_status` | one value or comma-separated list (validated against the enums) |
| `is_overdue` | `true` / `false` |
| `institution_id` | e.g. `SYN-INST-0001` |
| `aicte_permanent_id` | resolved to the institution; unknown ID returns an empty list |
| `from`, `to` | receipt date range `YYYY-MM-DD`, inclusive |
| `q` | case-insensitive text (max 100 chars) over case ID, subject, description, references, raw institution name, and institution name / AICTE ID / institution ID |

Each item includes `institution` (ID, AICTE ID, name, district, state, region, provenance) or `null` when the
identity is not verified. `meta` contains `page, limit, total, totalPages, sort, filters, provenance, overdue`.

### 4.B `GET /api/v1/cases/:caseId`

Case fields plus `institution`, `bureau_info`, `assigned_officer_info`, `actions` (chronological, with
`actor_name`) and `transfers`. `404 CASE_NOT_FOUND` if absent.

### 4.C `GET /api/v1/institutions`

Parameters: `page`, `limit`, `sort` (`name` default, `institution_id`, `state`, `district`, `region`, `established`),
`region`, `stream`, `ownership` (enum lists), `state`, `q` (name, district, state, AICTE ID, institution ID).
Each item adds `case_summary` (`total_cases, active_cases, overdue_cases, active_bureaus,
multiple_bureaus_active`, provenance `DERIVED`) and `shares_name_with` (number of other institutions with the same name).

### 4.D `GET /api/v1/institutions/:institutionId`

Institution fields plus `case_summary` (as above, with `by_bureau[]` counts per status),
`same_name_institutions[]` and `cases[]` (all cases at the institution, newest first). `multiple_bureaus_active`
is a coordination signal only — it does not mean the cases overlap. `404 INSTITUTION_NOT_FOUND` if absent.

## 5. Proposed Core Domain Endpoints

### 5.1 `GET /api/v1/cases` (original proposal — superseded by 4.A)
Queries the core `cases` collection with compound filters matching the All Cases Explorer UI.

**Query Parameters:**
- `bureau` (optional): `PGRC`, `RB`, `AB`
- `status` (optional): `Received`, `Assigned`, `Under Process`, `Action Initiated`, `Disposed`
- `is_overdue` (optional): `true`, `false`
- `region` (optional): `West`, `South`, etc.
- `institution_id` (optional): `SYN-INST-0001`
- `q` (optional): Full-text search over subject and description
- `page` (optional): default `1`
- `limit` (optional): default `20`

### 5.2 `POST /api/v1/overlap/coordination-decision`
Records an audited human coordination decision made by a Bureau Head or Officer.

**Request Body:**
```json
{
  "pair_key": "SYN-PGRC-2026-0001:SYN-RB-2026-0002",
  "decision": "confirmed_linked",
  "lead_bureau": "RB",
  "joint_action_summary": "PGRC individual refund will be addressed in coordination with RB compliance notice.",
  "audited_officer_id": "SYN-USR-PGRC-H"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pair_key": "SYN-PGRC-2026-0001:SYN-RB-2026-0002",
    "status": "linked",
    "coordination_active": true,
    "recorded_at": "2026-10-29T17:35:00.000Z"
  }
}
```
