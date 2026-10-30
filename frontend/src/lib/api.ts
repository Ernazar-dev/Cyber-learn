// Backend manzili. Render (render.yaml, fromService) uni sxemasiz beradi —
// "cyberai-backend.onrender.com" — shuning uchun kerak bo'lsa https:// qo'shiladi.
function resolveApiUrl(raw: string | undefined): string {
  const url = (raw ?? "").trim().replace(/\/+$/, "");
  if (!url) return "http://localhost:8080";
  return url.includes("://") ? url : `https://${url}`;
}

export const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL);

export const AUTH_EXPIRED_EVENT = "auth:unauthorized";

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(res: Response, token?: string | null) {
  if (res.status === 401 && token) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

async function get<T>(path: string, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(token) });
  if (!res.ok) {
    handleUnauthorized(res, token);
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `So'rov muvaffaqiyatsiz tugadi: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, payload: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleUnauthorized(res, token);
    throw new Error(body.error || `So'rov muvaffaqiyatsiz tugadi: ${res.status}`);
  }
  return body as T;
}

async function put<T>(path: string, payload: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleUnauthorized(res, token);
    throw new Error(body.error || `So'rov muvaffaqiyatsiz tugadi: ${res.status}`);
  }
  return body as T;
}

async function del<T>(path: string, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleUnauthorized(res, token);
    throw new Error(body.error || `So'rov muvaffaqiyatsiz tugadi: ${res.status}`);
  }
  return body as T;
}

async function downloadFile(path: string, token?: string | null): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(token) });
  if (!res.ok) {
    handleUnauthorized(res, token);
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `So'rov muvaffaqiyatsiz tugadi: ${res.status}`);
  }
  return res.blob();
}

const api = { get, post, put, del, downloadFile };

export default api;
