# Data Import — Synthetic Monitoring Fixtures

> **Status:** Implemented (roadmap phase 2) · Script: `backend/scripts/seed_database.js` · Code: `backend/src/import/`

The importer loads the synthetic monitoring fixtures from `data/processed/extracted/csv/` into MongoDB.
It is safe to run repeatedly: it validates every row, never deletes anything, never modifies the
source files, and only writes records that are new or whose source row changed.

## Commands

```bash
# from the repository root (MongoDB must be running; see backend/.env.example)
npm run seed:dry-run      # validate everything, write nothing
npm run seed              # validate + import (idempotent)

# from backend/, with options
node scripts/seed_database.js --data-dir <dir> --report import-report.json --strict
```

| Option | Effect |
|---|---|
| `--dry-run` | Validate and report; no writes (reads the DB only to resolve references) |
| `--strict` | Exit code `2` if any row was rejected (useful in CI) |
| `--report <file>` | Write the full JSON report (all rejections, skips, transformations, warnings) |
| `--data-dir <dir>` | Read CSVs from another directory (default `DATA_DIR` env or `data/processed/extracted/csv`) |
| `--quiet` | Print only the summary table |

Exit codes: `0` success · `1` fatal (DB unreachable, missing file, missing column) · `2` rejections with `--strict`.

## What is imported

Files are processed in dependency order. Natural keys make re-imports idempotent.

| Order | File | Collection | Natural key | Rows in file | Records stored |
|---|---|---|---|---|---|
| 1 | `bureaus.csv` | `bureaus` | `code` | 3 | 3 |
| 2 | `institutions.csv` | `institutions` | `institution_id` | 61 | 61 |
| 3 | `users.csv` | `users` | `user_id` | 27 | 27 |
| 4 | `category_matrix.csv` | `category_matrix` | `category_a` + `category_b` | 13 | 13 |
| 5 | `institution_alias_tests.csv` | `inst_aliases` | `alias_test_id` | 130 | 130 |
| 6 | `cases.csv` | `cases` | `case_id` | 809 | 809 |
| 7 | `case_actions.csv` | `case_actions` | `action_key` (SHA-256 of the row) | 4,099 | **4,094** |
| 8 | `transfers.csv` | `transfers` | `transfer_key` = `case_id@requested_at` | 25 | 25 |
| 9 | `overlap_ground_truth.csv` | `overlap_ground_truth` | `pair_id` | 214 | 214 |

Counts were verified against the actual files on 2026-10-29. `case_actions.csv` holds **5 exact
duplicate rows** (same case, timestamp, actor, type and remarks — a generator artefact where two
steps were clamped to the same time). Each is stored once and reported as *skipped*.

**Not imported:** `acss_clean.csv` and `acss_grievances.csv` (historical ACSS records). They have no
institution, Bureau, officer or status fields and must not be turned into cases
(see `DATASET_ASSESSMENT.md` and `DATA_PROVENANCE.md`). A separate, clearly labelled
`IMPORTED_UNVERIFIED` collection can be added later for analytics.

## Validation (a row is rejected if any check fails)

- **Header:** every expected column must be present, otherwise the whole run stops before writing.
- **Types:** strict parsing — integers, numbers, `True`/`False`, dates `YYYY-MM-DD[ HH:MM:SS]`
  (impossible dates such as `2026-02-31` are rejected).
- **Schema:** each row is validated against its Mongoose model (required fields, enums, cross-field
  rules: a `VERIFIED` case needs an `institution_id`; an unverified case must *not* have one; a case
  past `Received` needs an officer; a transfer must change Bureau).
- **Provenance:** fixtures must be `SYNTHETIC`, IDs must start with `SYN-`, user e-mails must end in
  `@demo.invalid`.
- **Duplicates in a file:** an exact duplicate row is kept once (*skipped*); a duplicate key with
  different content is *rejected* (first occurrence kept); duplicate secondary unique values
  (e-mail, AICTE permanent ID, case pair) are *rejected*.
- **References:** case → institution, Bureau, officer (and officer's Bureau = case Bureau, case
  region = institution region); action → case and actor; transfer → case, Bureaus and users;
  labelled pair → both cases, matching institution/Bureau/category; alias test → institution.
  A row whose parent was rejected is rejected too.
- **Database constraints:** unique-index violations caused by records created outside the import
  are caught per row and reported as rejections.

Rejection reports contain file, row number, key and reasons only — never record content.

## Documented transformation T1 — `users.csv` ID / e-mail collision

| | Source row (data row 18) | Imported as |
|---|---|---|
| `user_id` | `SYN-USR-REG-NORTHE` | `SYN-USR-REG-NE` |
| `email` | `reg-northe@demo.invalid` | `reg-ne@demo.invalid` |
| `region` | North-East | North-East |

Data row 20 (Northern) has the same `user_id` and `email` and is imported unchanged. The collision
came from the synthetic generator truncating region names to six characters. No case, action or
transfer references either user. The transformation is matched on `user_id` + `region` + `role`
(not on a row number), declared in `backend/src/import/transformations.js`, and recorded on the
record (`source_user_id`, `import_meta.transformations`) and in the batch report.
*(Earlier docs called these "rows 17 and 19"; those were zero-based pandas indices.)*

## Idempotency and safety

- Each imported record stores `import_meta` (hidden from API responses): source file, row, SHA-256 of
  the normalised row, the batch that created it and the batch that last changed it.
- Re-running compares hashes: unchanged rows are counted *unchanged* and not written; changed rows
  are *updated* (only fields that come from the CSV are set — other fields are never reset).
- Records that exist but were **not** created by an import (no `import_meta`) are never overwritten;
  their rows are reported as *skipped*.
- Nothing is ever deleted, and the server never resets or seeds the database on start-up.
- Indexes are created with `createIndexes()` (missing ones are added; existing ones are never dropped).
- Every non-dry run is recorded in `import_batches` with file hashes, counts, transformations,
  rejections and warnings.

## Dates and the dataset snapshot

- Fixture timestamps have no timezone; they are stored as **UTC**, and the UI shows date-only fields
  in UTC so they never shift by a day.
- The synthetic data is a snapshot generated "as of" **2026-10-31**. `cases.is_overdue` was computed
  for that date and is imported unchanged; the API reports this in `meta.overdue`. About 210 action
  timestamps fall after the import date — they are synthetic, not real future events. Live overdue
  recalculation belongs to the SLA monitor (roadmap phase 6).

## Tests

```bash
npm run test:backend        # unit + integration (needs MongoDB)
npm --prefix backend run test:unit
```

Integration tests use databases named `aicte_complaints_test_*` (override the base with
`MONGODB_URI_TEST`). The helper refuses to reset any database whose name does not contain `_test`.
