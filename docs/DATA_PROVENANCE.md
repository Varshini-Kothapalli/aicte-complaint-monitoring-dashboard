# AICTE Integrated Institution Complaint Monitoring and Status Dashboard
## Data Provenance, Governance & Privacy Framework

> **Reference Policy:** Indian Digital Personal Data Protection (DPDP) Act 2023  
> **Source Attribution:** Harvard Dataverse ACSS Dataset (DOI: `10.7910/DVN/EITGBB`)  
> **Audit Status:** Rigorous Provenance Tracking Enforced Across All Data Layers  

---

## 1. Four-Tier Provenance Taxonomy

Every data record stored in the MongoDB database or surfaced through the application user interface is watermarked with an immutable provenance tier:

| Provenance Label | Scope & Origin | Trust Level | Visual Marker in UI | Permitted System Actions |
|---|---|---|---|---|
| **`VERIFIED`** | Authoritative institutional master data confirmed against cited AICTE registries. | Authoritative | Green Pill (`VERIFIED`) | Eligible for primary entity profiling and identity resolution target matching. |
| **`IMPORTED_UNVERIFIED`** | Genuine historical tickets sourced from AICTE's legacy support portal (2022 Dataverse dump). | Unverified Historical | Amber Pill (`IMPORTED UNVERIFIED`) | Permitted for vocabulary analysis and background analytics; **never assigned fictional Bureaus**. |
| **`SYNTHETIC`** | Artificially generated fixtures engineered to simulate AICTE complaint workflows. | Demonstration | Purple Pill (`SYNTHETIC`) | Fully operational across all prototype features; watermarked in every view. |
| **`DERIVED`** | Computed dynamically by internal algorithms (similarity scores, vector embeddings, overdue tags). | Algorithmic Output | Blue Pill (`DERIVED`) | Advisory only; never initiates automatic legal or regulatory actions. |

---

## 2. Historical Dataverse Dataset & Provenance Integrity

### 2.1 Academic Citation
When publishing research, project presentations, or external reports referencing the historical data, cite the source as follows:
> *Manoj Singh, Subhash Panwar, Sanju Choudhary (2024), "ACSS (AICTE Centralized Support System) Data Set", Harvard Dataverse, https://doi.org/10.7910/DVN/EITGBB.*

### 2.2 Historical Record Boundaries (What We Must NOT Do)
1. **No Invented Fields:** The raw ACSS dataset contains no institution IDs, Bureau routing, assigned officers, or resolution timestamps. **We do not invent or backfill these fields into historical records.**
2. **No Fictional Bureau Assignments:** We do not falsely label historical ACSS tickets as "PGRC" or "Regulation Bureau" cases unless explicit administrative evidence exists in the source text.
3. **No Retitling of Portal Support:** 82.3% of ACSS rows are technical support requests (DSC errors, portal login issues, payment verification). They are truthfully classified as `portal_technical_support` rather than disguised as institutional malpractice.

---

## 3. Privacy Compliance & Indian DPDP Act 2023

### 3.1 PII Sanitization
The original raw Dataverse file (`ACSSv1.xlsx`) contained live citizen and officer names, personal cell numbers, faculty bank account details, and PAN cards. In compliance with Section 8 of the Indian DPDP Act 2023:
- The raw archive is quarantined in `data/raw/` and excluded from Git.
- The cleaning script `clean_acss.py` executes regular expression and spaCy NER redactions, substituting all personal data with standard tokens:
  - `[PERSON]` &mdash; Citizen, student, or faculty names.
  - `[INSTITUTION]` &mdash; Commercial or unverified college titles.
  - `[EMAIL]` &mdash; Email addresses.
  - `[PHONE]` &mdash; 10-digit Indian mobile numbers.
  - `[PAN]` &mdash; Permanent Account Number format.
  - `[IFSC]` &mdash; Bank IFSC codes.
  - `[BANK_AC]` &mdash; Bank account numbers.
  - `[AICTE_ID]` &mdash; AICTE institution or application identifiers.

### 3.2 Synthetic Data Safeguards
- All synthetic institutions use fictional 3-letter combinations (e.g. `ABC Engineering College`, `PQR Institute of Technology`).
- All synthetic entity IDs are prefixed with `SYN-` (e.g., `SYN-INST-0001`, `SYN-PGRC-2026-0001`).
- All synthetic emails use the RFC 2606 reserved top-level domain `.invalid` (e.g., `pgrc-01@demo.invalid`), ensuring emails can never route to real mailboxes.
- Complainant identities are stored as salted SHA-256 hashes (`complainant_hash`) rather than plaintext.
