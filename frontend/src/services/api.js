/**
 * Central API Service module for frontend.
 * Preconfigured for backend REST API at /api/v1.
 */

const API_BASE = '/api/v1';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        data: errData,
      };
    }
    const data = await res.json();
    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

/**
 * GET a JSON endpoint from the backend API.
 * Returns { ok, status, data, meta, error } and never throws, so pages can render error states.
 * `params` values that are empty / undefined / 'ALL' are left out of the query string.
 */
export async function apiGet(path, params = {}, { signal } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'ALL') return;
    qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  const url = `${API_BASE}${path}${qs.toString() ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.success === false) {
      return {
        ok: false,
        status: res.status,
        error: body?.error?.message || `Request failed (HTTP ${res.status})`,
        code: body?.error?.code || null,
        details: body?.error?.details || null,
      };
    }
    return { ok: true, status: res.status, data: body.data, meta: body.meta };
  } catch (error) {
    if (error.name === 'AbortError') return { ok: false, aborted: true };
    return { ok: false, status: 0, error: 'Cannot reach the backend API. Is the server running on port 5000?' };
  }
}

export const fetchCases = (params, opts) => apiGet('/cases', params, opts);
export const fetchCase = (caseId, opts) => apiGet(`/cases/${encodeURIComponent(caseId)}`, {}, opts);
export const fetchInstitutions = (params, opts) => apiGet('/institutions', params, opts);
export const fetchInstitution = (institutionId, opts) => apiGet(`/institutions/${encodeURIComponent(institutionId)}`, {}, opts);
