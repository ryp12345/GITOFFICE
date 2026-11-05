import { useEffect, useRef, useState } from 'react';

// Shows a one-time temporary password (admin reset or new employee account).
// The password lives only in the parent's state while this dialog is open; the server never
// returns it again, so closing the dialog discards it for good.
export default function TemporaryPasswordModal({ open, email, password, title = 'Temporary password created', onClose }) {
  const [copyState, setCopyState] = useState('idle');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setCopyState('idle');
  }, [open, password]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !password) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopyState('copied');
    } catch {
      // Clipboard API unavailable (e.g. plain http): select the text so Ctrl+C works.
      inputRef.current?.select();
      setCopyState('select');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="temp-password-title">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 id="temp-password-title" className="text-lg font-semibold text-slate-900">{title}</h3>
        {email ? <p className="mt-1 text-sm text-slate-600">Account: <span className="font-medium">{email}</span></p> : null}

        <div className="mt-4 flex gap-2">
          <input
            ref={inputRef}
            readOnly
            value={password}
            aria-label="Temporary password"
            onFocus={(event) => event.target.select()}
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-base tracking-wide text-slate-900"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {copyState === 'copied' ? 'Copied' : 'Copy'}
          </button>
        </div>
        {copyState === 'select' && (
          <p className="mt-1 text-xs text-slate-500">Copy is not available here. The password is selected: press Ctrl+C.</p>
        )}

        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">This password is shown only once.</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Share it with the employee securely: in person or by a direct message to them only.</li>
            <li>Do not post it in group chats, email threads or tickets, and do not write it down.</li>
            <li>The employee must set their own password the first time they log in.</li>
          </ul>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
