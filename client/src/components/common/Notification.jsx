import { useEffect, useRef } from 'react';
import { useNotify } from '../../notifications/NotificationProvider';

// Deprecated compatibility shim: forwards to the global notification system.
// New code should call useNotify() directly; migrate pages and delete this file.
export default function Notification({ show, message, type = 'info', onClose }) {
  const { notify } = useNotify();
  const firedFor = useRef(null); // guards against StrictMode's double effect run

  useEffect(() => {
    if (!show || !message) {
      firedFor.current = null;
      return;
    }
    const key = `${type}:${message}`;
    if (firedFor.current === key) return;
    firedFor.current = key;
    notify(message, { type: type || 'info' });
    // Reset the page's local state so its next setNotification fires again
    if (typeof onClose === 'function') onClose();
  }, [show, message, type]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
