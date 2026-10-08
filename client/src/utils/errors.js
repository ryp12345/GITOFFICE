// Shared helpers for turning any thrown value into something safe to show a user, and for
// logging failures in one place so a monitoring service can be plugged in later.

const STATUS_MESSAGES = {
  400: 'The request was invalid. Please check the details and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to do this.',
  404: 'The requested record was not found.',
  408: 'The request timed out. Please try again.',
  409: 'This conflicts with an existing record.',
  413: 'The file is too large to upload.',
  422: 'Some of the details are invalid. Please check and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The server ran into a problem. Please try again shortly.',
  502: 'The server is unavailable right now. Please try again shortly.',
  503: 'The server is unavailable right now. Please try again shortly.',
  504: 'The server took too long to respond. Please try again.'
};

export const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Check your connection and try again.';
export const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function isCancelledRequest(error) {
  return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError';
}

// Friendly message for an axios error, based only on the server response or the failure type.
export function getHttpErrorMessage(error) {
  const data = error?.response?.data;
  const serverMessage = data && typeof data === 'object' ? data.message || data.error : null;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return STATUS_MESSAGES[408];
  if (error?.response) return STATUS_MESSAGES[error.response.status] || DEFAULT_ERROR_MESSAGE;
  if (error?.request) return NETWORK_ERROR_MESSAGE;
  return null;
}

// Best message to show for any error: the server's own message, then a connection or timeout
// problem (the user can act on those), then the caller's fallback, then a generic status message.
export function getErrorMessage(error, fallback) {
  if (!error) return fallback || DEFAULT_ERROR_MESSAGE;
  if (typeof error === 'string') return error || fallback || DEFAULT_ERROR_MESSAGE;
  if (error.isAxiosError || error.response || error.request) {
    const data = error.response?.data;
    const serverMessage = data && typeof data === 'object' ? data.message || data.error : null;
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
    if (!error.response || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return getHttpErrorMessage(error) || fallback || DEFAULT_ERROR_MESSAGE;
    }
    return fallback || getHttpErrorMessage(error) || DEFAULT_ERROR_MESSAGE;
  }
  return error.message || fallback || DEFAULT_ERROR_MESSAGE;
}

// With responseType 'blob', axios hands back JSON error bodies as a Blob too.
export async function getBlobErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.message || getErrorMessage(error, fallback);
    } catch {
      return getErrorMessage(error, fallback);
    }
  }
  return getErrorMessage(error, fallback);
}

// Single place errors are logged. Swap the body for Sentry or similar to collect them centrally.
export function reportError(error, context = {}) {
  if (isCancelledRequest(error)) return;
  // eslint-disable-next-line no-console
  console.error('[GITOFFICE]', context.source || 'error', error, context);
}
