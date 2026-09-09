const BASE_URL = '/api/auth';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // send/receive the session cookie
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const registerUser = (email, password, name) =>
  request('/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });

export const loginUser = (email, password) =>
  request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const logoutUser = () => request('/logout', { method: 'POST' });

export const fetchCurrentUser = () => request('/me', { method: 'GET' });
