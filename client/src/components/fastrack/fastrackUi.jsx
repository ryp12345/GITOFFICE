import api from '../../api/axios';

// Shared helpers for the FASTRACK pages so they behave like the Laravel screens.

export const PAGE_SIZE = 10;
export const LOCKED_STATUSES = ['Approved', 'Verified'];

// Laravel builds this list as current year back to 2020, formatted "YYYY-YYYY"
export function buildAcademicYears() {
  const years = [];
  for (let y = new Date().getFullYear(); y >= 2020; y -= 1) years.push(`${y}-${y + 1}`);
  return years;
}

export function staffName(staff, { withMiddle = false } = {}) {
  if (!staff || !staff.fname) return '';
  return [staff.fname, withMiddle ? staff.mname : null, staff.lname].filter(Boolean).join(' ');
}

export function normalizeCourseType(courseType) {
  return String(courseType || '').trim().toUpperCase();
}

// Which counters a faculty member fills in, per Laravel's fastrack_courses view
export function courseTypeAllowsClasses(courseType) {
  return ['THEORY', 'INTEGRATED', 'PROJECT BASED LEARNING'].includes(normalizeCourseType(courseType));
}

export function courseTypeAllowsLabs(courseType) {
  return ['LABORATORY', 'INTEGRATED', 'PROJECT BASED LEARNING'].includes(normalizeCourseType(courseType));
}

export function fastrackDocumentUrl(filename) {
  if (!filename) return '#';
  const apiBase = (import.meta.env.VITE_API_URL || '').trim() || api.defaults.baseURL || '';
  const host = String(apiBase).replace(/\/$/, '').replace(/\/api$/, '');
  return `${host}/uploads/staff/fastrack_staff/${encodeURIComponent(filename)}`;
}

// Postgres DATE values arrive as UTC ISO strings of local midnight ("2026-07-05T18:30:00.000Z"
// for 6 Jul in IST), so slicing the string gives the previous day. Read them in local time instead.
export function toLocalDateInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatLocalDate(value) {
  return toLocalDateInput(value) || '--NA--';
}

// Laravel's academic year rolls over in July
export function currentAcademicYear(date = new Date()) {
  const start = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export function shiftAcademicYear(academicYear, delta) {
  const start = Number(String(academicYear).split('-')[0]) + delta;
  return `${start}-${start + 1}`;
}

export function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// With responseType 'blob', axios hands back JSON error bodies as a Blob too
export { getBlobErrorMessage as blobErrorMessage } from '../../utils/errors';

export function StatusBadge({ status }) {
  const label = status || '--NA--';
  const badgeClass = {
    Pending: 'bg-red-500',
    Approved: 'bg-green-500',
    Verified: 'bg-blue-500',
  }[label] || 'bg-gray-300';
  return <span className={`${badgeClass} text-white px-2 py-1 rounded text-xs font-medium`}>{label}</span>;
}

export function usePagedRows(rows, page) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  return {
    totalPages,
    page: safePage,
    offset: (safePage - 1) * PAGE_SIZE,
    pageRows: rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
  };
}

export function Pagination({ page, totalPages, total, onChange }) {
  if (total === 0) return null;
  return (
    <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap gap-2 items-center justify-between text-sm text-gray-700">
      <div>
        Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} entries
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="px-3 py-1 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
      </div>
    </div>
  );
}

export function WelcomeHeader({ user, crumbs = [] }) {
  const name = [user?.fname, user?.mname, user?.lname].filter(Boolean).join(' ');
  return (
    <div className="mb-6 sm:flex justify-between items-center">
      <h1 className="text-2xl font-medium text-gray-700">
        Welcome <span className="text-blue-600">{name}</span>
      </h1>
      {crumbs.length > 0 && (
        <ol className="flex items-center text-sm font-semibold text-blue-600 mt-2 sm:mt-0">
          {crumbs.map((c, i) => (
            <li key={c} className="flex items-center">
              {i > 0 && <span className="mx-2 text-gray-400">›</span>}
              {c}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
