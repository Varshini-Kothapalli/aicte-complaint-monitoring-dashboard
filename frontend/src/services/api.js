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
