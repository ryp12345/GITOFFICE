// Shared building blocks for every Research page. Keeping the table, modal, action icons and
// document handling in one place means the seven menus differ only by their field config.

export const VALIDATION_ROW_COLORS = {
  invalid: '#ffcccc',
  updated: '#fff2cc',
  valid: '#ccffcc',
};

export const notApplicable = '--NA--';

export const FIELD_CLASS =
  'block w-full px-6 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
export const READONLY_FIELD_CLASS = `${FIELD_CLASS} bg-gray-100 cursor-not-allowed`;
export const LABEL_CLASS = 'block mb-2 text-sm font-medium text-gray-700';

export const TH_CLASS =
  'px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider';

// Firefox ignores position:sticky on th/td while border-collapse is collapse, and it anchors
// sticky cells to the nearest ancestor with overflow != visible. The table wrappers below
// therefore scroll, and the card around them must stay overflow-visible.
export const ACTION_TH_CLASS =
  'sticky right-0 z-20 bg-blue-600 px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider border-l border-blue-500';

export const ACTION_BUTTON_BASE =
  'inline-flex items-center justify-center p-2.5 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';

export function iconProps() {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'w-5 h-5 shrink-0',
    'aria-hidden': 'true',
    focusable: 'false',
  };
}

export function toInputDate(value) {
  if (!value) return '';
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

export function formatDateDMY(value) {
  const iso = toInputDate(value);
  if (!iso) return '-';

  const [year, month, day] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[Number(month) - 1];
  return monthName ? `${day}-${monthName}-${year}` : iso;
}

// Inclusive day count, identical to the Laravel blade helper and to the server guard.
export function calculateNoOfDays(fromDate, toDate) {
  if (!fromDate || !toDate || fromDate > toDate) return 0;
  return Math.round((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
}

export function rowBackground(row) {
  return VALIDATION_ROW_COLORS[row.validation_status] || '#ffffff';
}