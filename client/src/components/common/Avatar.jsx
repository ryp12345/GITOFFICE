import { useEffect, useState } from 'react';

// Round photo with an initials fallback when there is no photo or it fails to load
// (Laravel showed a default image when the stored file was missing).
export default function Avatar({ src, name, className = 'h-8 w-8 text-sm', ringClassName = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  const initials = String(name || '?')
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name ? `${name} photo` : 'Profile photo'}
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover bg-slate-100 ${className} ${ringClassName}`}
      />
    );
  }
  return (
    <div className={`shrink-0 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold ${className} ${ringClassName}`}>
      {initials}
    </div>
  );
}
