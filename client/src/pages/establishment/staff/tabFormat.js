// Formatting helpers shared by the staff view payroll/leave tabs.

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

export function toInputDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// d-M-Y as in the Laravel views, e.g. 05-Oct-2026.
export function formatDateDMY(value) {
  const iso = toInputDate(value);
  if (!iso) return '-';
  const [year, month, day] = iso.split('-');
  return `${day}-${SHORT_MONTHS[Number(month) - 1]}-${year}`;
}

// 'YYYY-MM' → 'October'
export function monthNameOf(yearMonth) {
  const month = Number(String(yearMonth || '').split('-')[1]);
  return MONTH_NAMES[month - 1] || '-';
}

// Laravel's @indianCurrency / number_format(…, 2).
export function formatINR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Current year and the nine before it, as in the Laravel salary/TDS year pickers.
export function lastTenYears() {
  const now = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => now - i);
}
