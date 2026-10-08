import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import Toaster from './Toaster';
import { bindNotifier } from './notifier';

const NotifyContext = createContext(null);

// null = sticky (user must dismiss). Errors never auto-dismiss.
const DEFAULT_DURATION = { success: 4000, info: 5000, warning: 8000, error: null };
const MAX_VISIBLE = 4;
let nextId = 0;

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      // Same message already showing: bump a counter and restart its timer instead of stacking duplicates
      const dup = state.find((t) => t.dedupeKey === action.toast.dedupeKey);
      if (dup) {
        return state.map((t) => (t === dup ? { ...t, count: t.count + 1, updatedAt: Date.now() } : t));
      }
      return [...state, action.toast];
    }
    case 'dismiss':
      return state.filter((t) => t.id !== action.id);
    case 'clear':
      return [];
    default:
      return state;
  }
}

export function NotificationProvider({ children }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const dismiss = useCallback((id) => dispatch({ type: 'dismiss', id }), []);

  const notify = useCallback((message, { type = 'info', title, duration, action, dedupeKey } = {}) => {
    const kind = type in DEFAULT_DURATION ? type : 'info';
    const id = ++nextId;
    dispatch({
      type: 'add',
      toast: {
        id,
        type: kind,
        title,
        message,
        action,
        // Toasts with an action button stay until handled
        duration: duration !== undefined ? duration : action ? null : DEFAULT_DURATION[kind],
        dedupeKey: dedupeKey ?? `${kind}:${message}`,
        count: 1,
        updatedAt: Date.now()
      }
    });
    return id;
  }, []);

  const api = useMemo(() => ({
    notify,
    dismiss,
    clear: () => dispatch({ type: 'clear' }),
    success: (msg, opts) => notify(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => notify(msg, { ...opts, type: 'error' }),
    warning: (msg, opts) => notify(msg, { ...opts, type: 'warning' }),
    info: (msg, opts) => notify(msg, { ...opts, type: 'info' })
  }), [notify, dismiss]);

  useEffect(() => bindNotifier(api), [api]);

  return (
    <NotifyContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} max={MAX_VISIBLE} />
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used inside <NotificationProvider>');
  return ctx;
}
