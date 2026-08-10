/**
 * Minimal fetch wrapper.
 * - Sends cookies automatically (credentials: 'include')
 * - Parses JSON responses
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(method, path, body) {
  const options = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, options);
  const json = await res.json();
  return { ...json, status: res.status };
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  delete: (path) => request('DELETE', path),

  // Space-scoped text helpers
  spaces: {
    list: () => request('GET', '/spaces'),
    create: (data) => request('POST', '/spaces', data),
    update: (spaceId, data) => request('PATCH', `/spaces/${spaceId}`, data),
    delete: (spaceId, data) => request('DELETE', `/spaces/${spaceId}`, data),
    verifyLock: (spaceId, lockKey) => request('POST', `/spaces/${spaceId}/verify-lock`, { lockKey }),
  },

  texts: {
    list: (spaceId, page = 1) => request('GET', `/spaces/${spaceId}/text?page=${page}&limit=10`),
    create: (spaceId, data) => request('POST', `/spaces/${spaceId}/text`, data),
    unlock: (spaceId, textId, lockKey) => request('POST', `/spaces/${spaceId}/text/${textId}/unlock`, { lockKey }),
    togglePin: (spaceId, textId) => request('PATCH', `/spaces/${spaceId}/text/${textId}/pin`),
    delete: (spaceId, textId) => request('DELETE', `/spaces/${spaceId}/text/${textId}`),
  },
};
