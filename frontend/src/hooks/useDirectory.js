import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

/**
 * Officials directory (display names and designations), loaded once per page load and shared.
 * Used to show names instead of user IDs in free text such as case-history remarks.
 */
let cache = null;

function load() {
  if (!cache) {
    cache = apiGet('/users').then((res) => (res.ok ? res.data : [])).catch(() => []);
  }
  return cache;
}

export default function useDirectory() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    let alive = true;
    load().then((u) => alive && setUsers(u));
    return () => { alive = false; };
  }, []);
  const byId = new Map(users.map((u) => [u.user_id, u]));
  return {
    users,
    nameOf: (id) => byId.get(id)?.name || null,
    personOf: (id) => byId.get(id) || null,
  };
}
