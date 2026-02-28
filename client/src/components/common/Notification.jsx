import React from 'react';

export default function Notification({ show, message, type = 'success', onClose }) {
  if (!show) return null;

  const base = 'fixed top-6 right-6 z-50 max-w-sm px-4 py-3 rounded shadow-lg flex items-start space-x-3';
  const styles = {
    success: `${base} bg-green-50 border border-green-200 text-green-800`,
    error: `${base} bg-red-50 border border-red-200 text-red-800`,
    info: `${base} bg-blue-50 border border-blue-200 text-blue-800`,
  };

  return (
    <div className={styles[type] || styles.info} role="status">
      <div className="flex-1">
        <div className="font-medium">{type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'}</div>
        <div className="text-sm">{message}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-sm font-semibold ml-3 text-slate-600 hover:text-slate-800">Close</button>
      )}
    </div>
  );
}
