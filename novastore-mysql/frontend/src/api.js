// Frontend API calls only.
// Database operations remain in the backend.

const API_BASE =
  import.meta.env.VITE_API_URL || '/api';

export async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('Server response was not JSON.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const post = (path, body) =>
  api(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });

export const put = (path, body) =>
  api(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  });

export const del = path =>
  api(path, { method: 'DELETE' });