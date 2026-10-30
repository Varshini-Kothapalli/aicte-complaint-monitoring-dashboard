# AICTE Integrated Institution Complaint Monitoring and Status Dashboard
## Multi-Phase Implementation Roadmap

> **Target Hackathon:** Smart India Hackathon (SIH) 2026  
> **Current Progress:** Phases 1–2 Completed &bull; Phase 3 partially started (read APIs + Cases Explorer live)  

---

## 1. Roadmap Milestones & Phase Breakdown

```
[Phase 1: Foundation Scaffolding] ─── COMPLETED
        │
        ▼
[Phase 2: Database Schema & Ingestion] ─── COMPLETED
        │
        ▼
[Phase 3: Core Complaint Management & Transfers] ◄── NEXT (read side done)
        │
        ▼
[Phase 4: Engine D1 - Identity Resolution]
        │
        ▼
[Phase 5: Engine D2 - Overlap & Coordination]
        │
        ▼
[Phase 6: SLA Cron & Two-Tier Escalations]
        │
        ▼
[Phase 7: Analytics, Reports & Demo Polish]
```

---

### Phase 1: Repository & Architecture Foundation [COMPLETED]
- [x] Inspect raw Dataverse archives and synthetic CSV datasets (`docs/DATASET_ASSESSMENT.md`).
- [x] Initialize Git repository with safe `.gitignore` (quarantine raw PII and large archives).
- [x] Build working backend Express server with environment config, CORS, error envelope, and `GET /api/v1/health` (verified 200 OK).
- [x] Build working frontend Vite/React application shell with AICTE styling, responsive Sidebar, Header with health indicator, and 6 core views.
- [x] Author comprehensive architectural, database, API, and provenance specifications.

---

### Phase 2: Database Modeling & Synthetic Data Seeding [COMPLETED — see docs/DATA_IMPORT.md]
**Assignee:** Claude Pro  
**Objective:** Establish live MongoDB collections and execute a repeatable seeding pipeline from `data/processed/extracted/csv/`.

**Deliverables:**
1. **Mongoose Models:** Create schemas in `backend/src/models/` matching `docs/DATABASE_SCHEMA.md` (`Institution`, `InstAlias`, `Bureau`, `User`, `CategoryMatrix`, `Case`, `CaseAction`, `Transfer`, `OverlapCandidate`, `CaseEmbedding`, `AuditLog`).
2. **Seed Script (`backend/scripts/seed_database.js`):**
   - Read CSV files from `data/processed/extracted/csv/`.
   - **Patch Known Bug:** Change row 17 in `users.csv` from `SYN-USR-REG-NORTHE` to `SYN-USR-REG-NE` with email `reg-ne@demo.invalid` to prevent index collision with row 19.
   - Insert records: 61 institutions, 130 aliases, 3 bureaus, 27 users, 13 category rules, 809 cases, 4,094 actions (4,099 rows incl. 5 exact duplicates), 25 transfers, 214 ground truth pairs. ✅ Verified 2026-10-29.
3. **Verification Command:** Add npm script `"seed": "node scripts/seed_database.js"` and confirm record counts match `docs/DATASET_ASSESSMENT.md`.

---

### Phase 3: Core Complaint Management & State Machine
- [x] Implement read endpoints for `/api/v1/cases` and `/api/v1/institutions` (pagination, filtering, search).
- [ ] Implement case lifecycle transitions: `Received` &rarr; `Assigned` &rarr; `Under Process` &rarr; `Action Initiated` &rarr; `Disposed`.
- [ ] Implement append-only audit logging in `case_actions` on every state transition.
- [ ] Implement two-stage inter-Bureau transfer workflow (`/api/v1/transfers/request` and `/accept`).
- [x] Connect Frontend `CasesExplorerPage` and `InstitutionsPage` to live backend API (+ case and institution detail pages).

---

### Phase 4: Engine D1 — Institution Identity Resolution
- [ ] Build normalization utility for college names (contractions, punctuation, city splitting).
- [ ] Implement token-set / Jaro-Winkler fuzzy matching against `institutions` collection.
- [ ] Build the Gating policy:
  - $\ge 0.92$: Automatic `VERIFIED`.
  - $0.75 - 0.91$: Route to `VERIFICATION_QUEUE`.
  - $< 0.75$: Mark `UNRESOLVED`.
- [ ] Build administrative UI for resolving ambiguous institution cases.
- [ ] Validate accuracy against the 130 test cases in `institution_alias_tests.csv`.

---

### Phase 5: Engine D2 — Case Relationship & Overlap Detection
- [ ] Integrate Transformers.js in a Node worker thread using `all-MiniLM-L6-v2`.
- [ ] Pre-compute and store 384-dimensional dense vectors in `case_embeddings`.
- [ ] Implement candidate retrieval pipeline (same verified `institution_id`, opposite Bureau, active, within 180 days).
- [ ] Implement hybrid classifier score: $0.45 \times \text{RuleScore} + 0.40 \times \text{SemanticCosine} + 0.15 \times \text{MetaBonus}$.
- [ ] Wire Coordination Centre UI for official decisions: Confirm & Link vs Dismiss.
- [ ] Evaluate precision and recall against the 214 ground truth pairs in `overlap_ground_truth.csv`.

---

### Phase 6: SLA Monitoring & Background Escalations
- [ ] Configure Agenda.js with MongoDB connection.
- [ ] Schedule hourly SLA monitor job:
  - Check active cases where `Date.now() > expected_disposal_date`.
  - Calculate delay in days.
  - Delay > 7 days: Append Stage 1 escalation remark and notify Bureau Head.
  - Delay > 21 days: Append Stage 2 escalation remark and notify Regional Official + Senior Management.
- [ ] Build in-app notification center on top header.

---

### Phase 7: Analytics, Reports & Final Hackathon Polish
- [ ] Implement aggregation pipelines for the 6 standard report families.
- [ ] Enable CSV export for all generated reports.
- [ ] Rehearse the scripted demo walkthrough (ABC Engineering College: `SYN-PGRC-2026-0001` vs `SYN-RB-2026-0002`).
- [ ] Finalize production README and presentation deck citations.
