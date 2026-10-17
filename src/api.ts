import type { Cuisine, Food, MemberDetail, MemberSummary, Stats, Targets } from './types';

/** Backend base URL. Accepts it with or without the trailing /api (e.g. a bare Render URL). */
export const API_URL = (() => {
  const raw = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
})();
const TOKEN_KEY = 'ai-fitness-admin.token';

export const session = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* private mode: stays signed in for this tab only */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Called on 401 so the app can send the admin back to the sign-in page. */
let onSignedOut: () => void = () => {};
export const setSignedOutHandler = (fn: () => void) => { onSignedOut = fn; };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = session.get();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_URL}. Is the backend running?`);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { session.clear(); onSignedOut(); }
    const field = data?.fields?.[0];
    throw new ApiError(res.status, field ? `${field.path ? field.path + ': ' : ''}${field.message}` : data?.error || 'Request failed.');
  }
  return data as T;
}

export interface DietMealInput {
  name: string; time: string; slot: string; portion: number;
  foodId?: string; custom?: { n: string; q: string; k: number; p: number };
}

export const api = {
  login: (email: string, password: string) => request<{ token: string; email: string }>('POST', '/admin/login', { email, password }),
  /** True when the server has no admin yet, so the portal offers to create one. */
  setupStatus: () => request<{ needsSetup: boolean }>('GET', '/admin/setup'),
  setup: (email: string, password: string) => request<{ token: string; email: string }>('POST', '/admin/setup', { email, password }),
  stats: () => request<Stats>('GET', '/admin/stats'),
  members: (q = '') => request<{ users: MemberSummary[] }>('GET', `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  member: (id: number) => request<MemberDetail>('GET', `/admin/users/${id}`),
  foods: () => request<{ foods: Food[]; cuisines: Cuisine[] }>('GET', '/admin/foods'),
  saveDiet: (id: number, days: DietMealInput[][], targets: Targets | undefined, note: string) =>
    request<{ plan: MemberDetail['plan'] }>('PUT', `/admin/users/${id}/diet`, { days, targets, note }),
  resetDiet: (id: number) => request<{ plan: MemberDetail['plan'] }>('DELETE', `/admin/users/${id}/diet`),
};
