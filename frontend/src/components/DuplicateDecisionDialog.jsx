import React, { useEffect, useRef, useState } from 'react';
import useDirectory from '../hooks/useDirectory';
import { recordDuplicateDecision } from '../services/api';
import { displayCaseId } from '../utils/format';

const PERMITTED_ROLES = ['bureau_head', 'bureau_officer', 'senior_management'];

/**
 * Records "Confirm Related" or "Mark as Unrelated" for a pair. The decision, the official and the
 * note are stored in the audit log and added to both complaints' history. Nothing else changes.
 * Login is not built yet, so the recording official is chosen from the list (and saved as such).
 */
export default function DuplicateDecisionDialog({ pair, decision, onClose, onDone }) {
  const { users } = useDirectory();
  const bureaus = [pair.complaint_a?.bureau, pair.complaint_b?.bureau];
  const eligible = users.filter((u) => PERMITTED_ROLES.includes(u.role) && (!u.bureau || bureaus.includes(u.bureau)));
  const [reviewer, setReviewer] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const firstField = useRef(null);
  const confirm = decision === 'confirmed_linked';

  useEffect(() => {
    firstField.current?.focus();
    const esc = (e) => e.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [saving, onClose]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await recordDuplicateDecision(pair.pair_key, { decision, reviewer_id: reviewer, note });
    setSaving(false);
    if (res.ok) onDone(res.data);
    else setError(res.details?.length ? `${res.error}: ${res.details.join('; ')}` : res.error);
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="dup-dialog-title" onSubmit={submit}>
        <div className="card-header"><h3 id="dup-dialog-title">{confirm ? 'Confirm related complaints' : 'Mark complaints as unrelated'}</h3></div>
        <div className="dialog-body">
          <p>
            {displayCaseId(pair.case_a)} and {displayCaseId(pair.case_b)} at {pair.institution?.name}.{' '}
            {confirm
              ? 'Both complaints stay open with their own Bureau and officer. The link is recorded so the Bureaus can coordinate.'
              : 'The pair will no longer appear as a possible duplicate.'}
          </p>
          <label className="form-field">
            Decision recorded by
            <select ref={firstField} required value={reviewer} onChange={(e) => setReviewer(e.target.value)}>
              <option value="">Select official…</option>
              {eligible.map((u) => <option key={u.user_id} value={u.user_id}>{u.name}{u.designation ? ` – ${u.designation}` : ''}</option>)}
            </select>
            <span className="form-hint">Officials of the two Bureaus involved, or senior management. Login is not yet enabled in this prototype.</span>
          </label>
          <label className="form-field">
            Reason / note (required)
            <textarea required minLength={5} maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={confirm ? 'e.g. Same fee refund matter; Regulation Bureau to lead, PGRC to update the complainant.' : 'e.g. Different courses and different periods.'} />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <div className="dialog-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !reviewer || note.trim().length < 5}>
            {saving ? 'Saving…' : confirm ? 'Confirm related' : 'Mark as unrelated'}
          </button>
        </div>
      </form>
    </div>
  );
}
