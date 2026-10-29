# AICTE Integrated Institution Complaint Monitoring and Status Dashboard
## Security Architecture, RBAC & Access Control

> **Standard:** Principle of Least Privilege (PoLP) &bull; Zero Trust Internal Boundary  
> **Status:** Security Framework Specified &bull; Basic CORS & Sanitization Active  

---

## 1. Role-Based Access Control (RBAC) Matrix

The system enforces strict role-based and geographic data scoping across 5 administrative roles:

| Operational Capability | `bureau_officer` | `bureau_head` | `regional_official` | `senior_management` | `admin` |
|---|:---:|:---:|:---:|:---:|:---:|
| **View Own Assigned Cases** | Full | Full | Scoped to Region | Full | Full |
| **View All Bureau Cases** | Read-Only | Full | Scoped to Region | Full | Full |
| **Transition Case Status** | Own Cases | All in Bureau | No | No | Override |
| **Assign / Reassign Officer** | No | Full in Bureau | No | No | Override |
| **Initiate Bureau Transfer** | Request Only | Authorize | No | No | Override |
| **View Cross-Bureau Overlaps** | Advisory Only | Coordination Action | Regional View | Full Oversight | Full |
| **Resolve Identity Queue (D1)**| No | No | No | No | Full |
| **Receive Stage 1 Escalations**| Target | Recipient | No | No | Monitor |
| **Receive Stage 2 Escalations**| Target | Target | Recipient | Recipient | Monitor |
| **User & Master Data Mgmt** | No | No | No | No | Full |

---

## 2. Data Scoping & Multi-Tenancy Architecture

Queries in the backend application are automatically scoped using Mongoose query middleware based on the authenticated official's JWT claims:

```javascript
// Example scope injection middleware [PROPOSED]
function applyDataScope(req, filter = {}) {
  const { role, bureau, region } = req.user;

  switch (role) {
    case 'bureau_officer':
      // Officers are scoped to cases within their Bureau (own cases prioritized)
      return { ...filter, bureau };
    case 'bureau_head':
      // Bureau Heads see all cases assigned to their Bureau
      return { ...filter, bureau };
    case 'regional_official':
      // Regional Officials see cases where the institution belongs to their region
      return { ...filter, region };
    case 'senior_management':
    case 'admin':
      // Unrestricted national oversight
      return filter;
    default:
      throw new Error('Unauthorized role scope');
  }
}
```

---

## 3. Authentication & Session Security

- **JWT Tokens:** Issued upon successful verification of credentials. Short-lived access tokens (15-minute expiry) paired with HTTP-only, secure, SameSite refresh tokens stored in database sessions.
- **Password Storage:** Salted and hashed using `bcrypt` (work factor 12). Demo fixtures use mocked hashes; production systems must never store plaintext passwords.
- **Brute Force Defense:** Express rate limiter configured to restrict login attempts to a maximum of 5 requests per 15 minutes per IP address.

---

## 4. Statutory Audit Trail (`audit_logs`)

To prevent tampering with administrative decisions or regulatory records:
- The `audit_logs` collection is **append-only**. No `UPDATE` or `DELETE` operations are permitted at the API layer.
- Every state change (status update, assignment, transfer, overlap link decision) writes an audit record capturing:
  - `actor`: User ID of the logged-in official.
  - `action`: Specific operation performed.
  - `entity_type`: Target collection (e.g. `case`, `institution`).
  - `entity_id`: Primary identifier of the affected record.
  - `before_state` and `after_state`: Document snapshot diff.
  - `timestamp`: UTC server timestamp (immutable).
  - `ip`: Client IP address.
