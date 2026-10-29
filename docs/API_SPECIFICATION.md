# AICTE Integrated Institution Complaint Monitoring and Status Dashboard
## RESTful API Specification (v1)

> **Base URL:** `http://localhost:5000/api/v1`  
> **Status:** Version 1.0.0 &bull; Health Check Implemented &bull; Domain Routes Proposed  
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
| `GET` | `/cases` | Query cases with pagination, search, & 8 filters | *`PROPOSED`* |
| `GET` | `/cases/:id` | Get single case details & full chronological actions | *`PROPOSED`* |
| `POST`| `/cases` | Ingest new institutional complaint | *`PROPOSED`* |
| `PATCH`| `/cases/:id/status` | Transition case lifecycle status | *`PROPOSED`* |
| `POST`| `/cases/:id/actions` | Append new manual action/remark to case | *`PROPOSED`* |
| `GET` | `/institutions` | List AICTE institutions with region/stream facets | *`PROPOSED`* |
| `GET` | `/institutions/:id` | 360° institutional view with multi-Bureau complaint history | *`PROPOSED`* |
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

## 4. Proposed Core Domain Endpoints

### 4.1 `GET /api/v1/cases`
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

### 4.2 `POST /api/v1/overlap/coordination-decision`
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
