import { useEffect, useRef, useState } from 'react';

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};
export const LABELS = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };
const ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' };

export default function Toast({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);

  // A duplicate bumped updatedAt: restart the full timer
  useEffect(() => {
    remaining.current = toast.duration;
  }, [toast.updatedAt, toast.duration]);

  useEffect(() => {
    if (toast.duration == null || paused) return undefined;
    const startedAt = Date.now();
    const id = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current -= Date.now() - startedAt; // resume where we left off
    };
  }, [paused, toast.id, toast.updatedAt, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 rounded border px-4 py-3 shadow-lg motion-safe:animate-toast-in ${STYLES[toast.type]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => e.key === 'Escape' && onDismiss(toast.id)}
    >
      <span aria-hidden="true" className="w-4 text-center font-bold">{ICONS[toast.type]}</span>
      <div className="flex-1">
        <div className="font-medium">
          {toast.title ?? LABELS[toast.type]}
          {toast.count > 1 && <span className="ml-1 text-xs opacity-70">×{toast.count}</span>}
        </div>
        <div className="text-sm">{toast.message}</div>
        {toast.action && (
          <button
            type="button"
            className="mt-1 text-sm font-semibold underline"
            onClick={() => {
              toast.action.onClick();
              onDismiss(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label={`Dismiss ${LABELS[toast.type].toLowerCase()} notification`}
        className="text-slate-500 hover:text-slate-800"
        onClick={() => onDismiss(toast.id)}
      >
        ✕
      </button>
    </div>
  );
}
