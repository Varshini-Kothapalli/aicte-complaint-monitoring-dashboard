/** Display labels for duplicate-review records. */
export const REVIEW_STATUS = {
  pending: { label: 'Awaiting review', cls: 'pending-review' },
  confirmed_linked: { label: 'Confirmed related', cls: 'confirmed-related' },
  dismissed_unrelated: { label: 'Marked unrelated', cls: 'marked-unrelated' },
};
export const MATCH_STRENGTH = {
  HIGH: { label: 'Strong match', cls: 'strong' },
  MEDIUM: { label: 'Possible match', cls: 'possible' },
};
export const pairPath = (pairKey) => `/overlap/${encodeURIComponent(pairKey)}`;
