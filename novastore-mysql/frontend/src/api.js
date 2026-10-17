
/**
 * NovaStore Frontend API
 *
 * Frontend: React + Vite
 * Backend: Node.js + Express
 * Database: MySQL (accessed only by backend)
 */

// Backend API base URL
const API_BASE = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/+$/, '');

// Common API request function
export async function api(path, options = {}) {

  // Prevent double slashes in URLs
  const cleanPath = String(path).replace(/^\/+/, '');

  const url = `${API_BASE}/${cleanPath}`;

  try {
    const response = await fetch(url, {
      ...options,

      // Include login session cookies
      credentials: 'include',

      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Read the response
    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        'Server response was not JSON. Please check your backend.'
      );
    }

    // Handle failed requests
    if (!response.ok) {
      throw new Error(
        data.error || `Request failed: ${response.status}`
      );
    }

    return data;

  } catch (error) {
    console.error('NovaStore API Error:', error);
    throw error;
  }
}

// GET request
export const get = (path) => api(path);

// POST request
export const post = (path, body) =>
  api(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });

// PUT request
export const put = (path, body) =>
  api(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  });

// DELETE request
export const del = (path) =>
  api(path, {
    method: 'DELETE'
  });
