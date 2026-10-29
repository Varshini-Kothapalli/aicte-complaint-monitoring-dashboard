/**
 * Documented, explicit import-time transformations.
 *
 * Source files are never modified. When a source row must be changed to satisfy a database
 * constraint, the change is declared here, applied by the importer, recorded on the imported
 * record (`import_meta.transformations`, and `source_user_id` for users) and listed in the
 * import batch report. See docs/DATA_IMPORT.md.
 */

const TRANSFORMATIONS = [
  {
    id: 'T1-users-regional-id-collision',
    file: 'users.csv',
    description:
      'users.csv contains two regional officials with user_id "SYN-USR-REG-NORTHE" and email ' +
      '"reg-northe@demo.invalid" (North-East and Northern): the synthetic generator truncated region ' +
      'names to six characters. The North-East row is renamed so user_id and email stay unique; the ' +
      'Northern row keeps the original values. No case, action or transfer references either user.',
    // Match on the full identity of the row, not on a row number, so a re-ordered file still works.
    match: (row) =>
      row.user_id === 'SYN-USR-REG-NORTHE' &&
      row.region === 'North-East' &&
      row.role === 'regional_official',
    apply: (row) => ({ ...row, user_id: 'SYN-USR-REG-NE', email: 'reg-ne@demo.invalid' }),
    sourceIdField: 'user_id',
  },
];

/** Apply every matching transformation for `file` to `row`. Returns { row, applied: [ids], sourceIds }. */
function applyTransformations(file, row) {
  let out = row;
  const applied = [];
  const sourceIds = {};
  for (const t of TRANSFORMATIONS) {
    if (t.file === file && t.match(out)) {
      if (t.sourceIdField) sourceIds[t.sourceIdField] = out[t.sourceIdField];
      out = t.apply(out);
      applied.push(t.id);
    }
  }
  return { row: out, applied, sourceIds };
}

module.exports = { TRANSFORMATIONS, applyTransformations };
