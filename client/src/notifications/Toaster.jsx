import Toast, { LABELS } from './Toast';

export default function Toaster({ toasts, onDismiss, max }) {
  const visible = toasts.slice(0, max); // FIFO: extras wait in the queue
  const latest = visible[visible.length - 1];
  const urgent = latest && (latest.type === 'error' || latest.type === 'warning');
  const text = latest
    ? `${latest.title ?? LABELS[latest.type]}: ${latest.message}${latest.count > 1 ? ` (${latest.count})` : ''}`
    : '';

  return (
    <>
      {/* Live regions stay mounted; only their text changes, which is what makes announcements reliable */}
      <div className="sr-only" role="status" aria-live="polite">{latest && !urgent ? text : ''}</div>
      <div className="sr-only" role="alert" aria-live="assertive">{urgent ? text : ''}</div>

      <section
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 [&>*]:pointer-events-auto"
      >
        {visible.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </section>
    </>
  );
}
