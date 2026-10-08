import { toast } from '../notifications/notifier';
import { DEFAULT_ERROR_MESSAGE, getHttpErrorMessage, isCancelledRequest, reportError } from './errors';

// Last line of defence for errors no try/catch or Error Boundary handled: promise rejections
// nobody awaited, and exceptions thrown in event handlers or timers. Logs them and tells the
// user something failed instead of leaving a button that silently does nothing.

// Browser noise that is harmless and not actionable by the user.
const IGNORED_MESSAGES = [/ResizeObserver loop/i, /^Script error\.?$/i];

const isIgnored = (message) => IGNORED_MESSAGES.some((re) => re.test(message || ''));

function notifyUnexpected(error) {
  const isHttp = error?.isAxiosError || error?.response || error?.request;
  // A 401 is already handled by the axios interceptor (token refresh or redirect to login).
  if (isHttp && error?.response?.status === 401) return;
  toast.error((isHttp && getHttpErrorMessage(error)) || DEFAULT_ERROR_MESSAGE, {
    dedupeKey: 'global-unexpected-error',
    action: { label: 'Reload page', onClick: () => window.location.reload() }
  });
}

let installed = false;

export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (isCancelledRequest(error)) {
      event.preventDefault();
      return;
    }
    reportError(error, { source: 'unhandledrejection' });
    notifyUnexpected(error);
  });

  window.addEventListener('error', (event) => {
    // Failed <img>/<script> loads also fire 'error' but carry no error object; ignore those.
    if (!event.error && !event.message) return;
    if (isIgnored(event.message)) return;
    reportError(event.error || event.message, { source: 'window.error', file: event.filename, line: event.lineno });
    notifyUnexpected(event.error);
  });
}
