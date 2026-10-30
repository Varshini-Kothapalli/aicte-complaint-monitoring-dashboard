/**
 * Central API Service module for frontend.
 * Preconfigured for backend REST API at /api/v1.
 */

function resolveApiBase() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!envUrl) return '/api/v1';
  if (envUrl.endsWith('/api/v1')) return envUrl;
  if (envUrl.endsWith('/api')) return `${envUrl}/v1`;
  return `${envUrl}/api/v1`;
}

const API_BASE = resolveApiBase();

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
    return { ok: false, status: 0, error: 'Cannot reach the backend API. Please verify server status and network connectivity.' };
  }
}

export const fetchCases = (params, opts) => apiGet('/cases', params, opts);
export const fetchCase = (caseId, opts) => apiGet(`/cases/${encodeURIComponent(caseId)}`, {}, opts);
export const fetchInstitutions = (params, opts) => apiGet('/institutions', params, opts);
export const fetchInstitution = (institutionId, opts) => apiGet(`/institutions/${encodeURIComponent(institutionId)}`, {}, opts);

export const fetchDashboardSummary = (opts) => apiGet('/dashboard/summary', {}, opts);
export const fetchAttention = (params, opts) => apiGet('/attention', params, opts);
export const fetchDuplicates = (params, opts) => apiGet('/duplicates', params, opts);
export const fetchDuplicate = (pairKey, opts) => apiGet(`/duplicates/${encodeURIComponent(pairKey)}`, {}, opts);
export const fetchReports = (opts) => apiGet('/reports', {}, opts);
export const fetchReport = (id, params, opts) => apiGet(`/reports/${encodeURIComponent(id)}`, params, opts);
export const fetchUsers = (params, opts) => apiGet('/users', params, opts);

/** URL that downloads a report as CSV (used as a link href). */
export function reportCsvUrl(id, params = {}) {
  const qs = new URLSearchParams({ format: 'csv' });
  Object.entries(params).forEach(([k, v]) => v && qs.set(k, v));
  return `${API_BASE}/reports/${encodeURIComponent(id)}?${qs}`;
}

/** POST a JSON body. Returns the same shape as apiGet. */
export async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.success === false) {
      return { ok: false, status: res.status, error: data?.error?.message || `Request failed (HTTP ${res.status})`, code: data?.error?.code, details: data?.error?.details };
    }
    return { ok: true, status: res.status, data: data.data, meta: data.meta };
  } catch (e) {
    return { ok: false, status: 0, error: 'Cannot reach the backend API. Please verify server status and network connectivity.' };
  }
}

export const recordDuplicateDecision = (pairKey, body) => apiPost(`/duplicates/${encodeURIComponent(pairKey)}/decision`, body);
