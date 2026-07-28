/**
 * Pull a user-facing message from an Angular HttpClient error response.
 */
export function extractHttpErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const err = error as { status?: number; message?: string; error?: unknown };
  const status = err.status;
  const body = err.error;

  if (status === 0) {
    return (
      extractBodyMessage(body) ||
      'Cannot reach the server. Check your internet connection, or log in again if your session expired.'
    );
  }

  if (status === 401 || status === 403) {
    return (
      extractBodyMessage(body) ||
      'Your session may have expired. Please log out and log in again, then retry.'
    );
  }

  const bodyMessage = extractBodyMessage(body);
  if (bodyMessage) {
    return bodyMessage;
  }

  if (err.message && status != null) {
    return `${err.message} (${status})`;
  }

  return fallback;
}

function extractBodyMessage(body: unknown): string | null {
  if (!body) {
    return null;
  }
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  if (typeof body !== 'object') {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (typeof record['message'] === 'string' && record['message'].trim()) {
    return record['message'].trim();
  }

  const nestedError = record['error'];
  if (typeof nestedError === 'string' && nestedError.trim()) {
    return nestedError.trim();
  }
  if (Array.isArray(nestedError)) {
    const parts = nestedError.map((item) => String(item)).filter(Boolean);
    if (parts.length) {
      return parts.join(', ');
    }
  }

  const details = record['details'];
  if (Array.isArray(details)) {
    const parts = details
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          const field = row['path'] ?? row['field'] ?? row['param'];
          const msg = row['message'] ?? row['msg'] ?? row['error'];
          if (field && msg) {
            return `${String(field)}: ${String(msg)}`;
          }
          return msg ? String(msg) : '';
        }
        return '';
      })
      .filter(Boolean);
    if (parts.length) {
      return parts.join('; ');
    }
  }

  const errors = record['errors'];
  if (Array.isArray(errors)) {
    const parts = errors
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          return String(row['message'] ?? row['msg'] ?? row['error'] ?? '');
        }
        return '';
      })
      .filter(Boolean);
    if (parts.length) {
      return parts.join(', ');
    }
  }
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const parts = Object.entries(errors as Record<string, unknown>).map(
      ([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
    );
    if (parts.length) {
      return parts.join('; ');
    }
  }

  return null;
}
