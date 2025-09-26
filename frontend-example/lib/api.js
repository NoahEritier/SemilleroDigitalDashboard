// Simple API client with consistent error handling
// Always sends credentials and parses backend error shapes { error, code, status }

export class ApiError extends Error {
  constructor(message, { code = 'UNKNOWN', status = 500, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function fetchJson(path, { method = 'GET', body = undefined } = {}) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await res.json(); } catch (_) { /* ignore */ }

  if (!res.ok) {
    const message = payload?.error || `Request failed with ${res.status}`;
    const err = new ApiError(message, {
      code: payload?.code || 'UNKNOWN',
      status: res.status,
      details: payload,
    });
    throw err;
  }

  return payload;
}

export function userFriendlyMessage(err) {
  if (!(err instanceof ApiError)) return err?.message || 'Unexpected error';
  switch (err.code) {
    case 'AUTH_REAUTH':
      return 'Tu sesión expiró. Por favor, inicia sesión nuevamente.';
    case 'INSUFFICIENT_PERMISSIONS':
      return 'No tienes permisos suficientes para esta acción. Revisa los alcances (scopes) o tu rol.';
    case 'ROLE_REQUIRED_TEACHER':
      return 'Solo los profesores pueden ver la lista de estudiantes. Solicita ser agregado como profesor del curso.';
    case 'NOT_FOUND_OR_FORBIDDEN':
      return 'El recurso no existe o no es accesible con tu rol actual.';
    default:
      return err.message || 'Ocurrió un error.';
  }
}
