// Inline message for data that failed to load, with an optional retry. Use it instead of
// silently rendering an empty table, which reads as "there is no data".
export default function LoadError({ message, onRetry, className = '' }) {
  if (!message) return null;
  return (
    <div role="alert" className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${className}`}>
      <span>{message}</span>
      {typeof onRetry === 'function' && (
        <button type="button" onClick={onRetry} className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}
