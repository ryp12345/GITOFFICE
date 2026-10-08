import { useEffect, useMemo, useState } from 'react';

import { useNotify } from '../../notifications/NotificationProvider';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { getHodActivityReport } from '../../api/hodApi';
import {
  ACTION_TH_CLASS,
  TH_CLASS,
  VALIDATION_ROW_COLORS,
  formatDateDMY,
  iconProps,
  notApplicable,
  rowBackground,
  toInputDate,
} from '../staff/research/researchShared';
import { DEPARTMENT_REPORTS } from './reportConfig';
import { statTone } from '../../components/dashboard/ActivityDashboardWidgets';

const PAGE_SIZES = [10, 25, 50, 100];

const VALIDATION_LEGEND = [
  { status: 'valid', label: 'Valid' },
  { status: 'invalid', label: 'Invalid' },
  { status: 'updated', label: 'Updated after rejection' },
];

function staffName(row) {
  return [row.fname, row.mname, row.lname].filter(Boolean).join(' ') || '-';
}

function resolveDocumentUrl(folder, filename) {
  if (!filename) return null;

  const normalized = filename.startsWith('/') ? filename : `/${filename}`;
  const apiBase = (import.meta.env.VITE_API_URL || '').trim() || api.defaults.baseURL || '';

  if (apiBase) {
    const hostOnly = String(apiBase).replace(/\/$/, '').replace(/\/api$/, '');
    return `${hostOnly}${folder}${normalized}`;
  }

  return `${window.location.origin}${folder}${normalized}`;
}

// Plain text for search and the Excel export; the table renders links on top of this.
function cellText(row, column) {
  if (column.type === 'staff') return staffName(row);
  if (column.naWhen && column.naWhen(row)) return notApplicable;
  if (column.type === 'date') return formatDateDMY(row[column.key]);

  const value = row[column.key];
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

function matchesDateFilter(row, filter, fromDate, toDate) {
  if (!filter || (!fromDate && !toDate)) return true;

  if (filter.mode === 'span') {
    const start = toInputDate(row[filter.from]);
    const end = toInputDate(row[filter.to]);
    if (fromDate && (!start || start < fromDate)) return false;
    if (toDate && (!end || end > toDate)) return false;
    return true;
  }

  return filter.columns.every((column) => {
    const value = toInputDate(row[column]);
    if (!value) return !fromDate && !toDate;
    if (fromDate && value < fromDate) return false;
    if (toDate && value > toDate) return false;
    return true;
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Same output as the Laravel "Export to Excel" button: an HTML table saved as .xls, without
// the Document column.
function exportToExcel(config, columns, rows) {
  const header = ['S.No', ...columns.map((column) => column.label)];
  const body = rows.map((row, index) => [String(index + 1), ...columns.map((column) => cellText(row, column))]);

  const cell = 'border:1px solid #000;padding:5px;';
  const html = `<table><thead><tr>${header.map((h) => `<th style="${cell}">${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body
    .map((cells) => `<tr>${cells.map((c) => `<td style="${cell}">${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

  const blob = new Blob([`﻿${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${config.exportName}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CountCard({ label, count, tone }) {
  const empty = count === 0;
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tone}`}>
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${empty ? 'text-red-500' : 'text-slate-900'}`}>{count}</p>
    </div>
  );
}

// Institution-wide portals (Dean R&D) list every department, so the Laravel pages added a
// 'Dept Short Name' column right after the staff name.
const DEPARTMENT_COLUMN = { key: 'dept_shortname', label: 'Dept Short Name' };

function withDepartmentColumn(columns, showDepartment) {
  if (!showDepartment) return columns;
  const staffIndex = columns.findIndex((column) => column.type === 'staff');
  const next = [...columns];
  next.splice(staffIndex + 1, 0, DEPARTMENT_COLUMN);
  return next;
}

// Shared page for the HOD (read-only) and e-Governance admin (read + validate) portals.
//   loadReport(token, report)            - fetches { department, rows, counts }
//   validation.submit(token, report, id, { validation_status, reason })
//                                        - when given, each row gets a Validate action
//   showDepartment                       - adds the Dept Short Name column
// Routes mount one instance per report with key={report}, so filters start fresh per page.
export default function DepartmentActivityReport({
  report,
  loadReport = getHodActivityReport,
  validation = null,
  showDepartment = false,
}) {
  const config = DEPARTMENT_REPORTS[report];
  const columns = useMemo(() => withDepartmentColumn(config.columns, showDepartment), [config, showDepartment]);
  const { token } = useAuth() || {};

  const [department, setDepartment] = useState(null);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const notify = useNotify();

  const [search, setSearch] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [validatingRow, setValidatingRow] = useState(null);

  useEffect(() => {
    let active = true;

    // A reload after validating keeps the current table on screen instead of flashing "Loading".
    if (reloadKey === 0) setLoading(true);

    loadReport(token, report)
      .then((response) => {
        if (!active) return;
        const payload = response?.data?.data || {};
        setDepartment(payload.department || null);
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setCounts(Array.isArray(payload.counts) ? payload.counts : []);
      })
      .catch((error) => {
        if (!active) return;
        notify.error(error?.response?.data?.message || `Failed to load ${config.title.toLowerCase()}.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, report, config.title, loadReport, reloadKey, notify]);

  const handleValidated = (message) => {
    setValidatingRow(null);
    notify.success(message);
    setReloadKey((current) => current + 1);
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (!matchesDateFilter(row, config.dateFilter, appliedRange.from, appliedRange.to)) return false;
      if (!query) return true;
      return columns.some((column) => cellText(row, column).toLowerCase().includes(query));
    });
  }, [rows, search, appliedRange, config, columns]);

  useEffect(() => {
    setPage(1);
  }, [search, appliedRange, pageSize, report]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  const applyDateFilter = (event) => {
    event.preventDefault();
    if (fromInput && toInput && fromInput > toInput) {
      notify.error('From date must be on or before To date.');
      return;
    }
    setAppliedRange({ from: fromInput, to: toInput });
  };

  const resetDateFilter = () => {
    setFromInput('');
    setToInput('');
    setAppliedRange({ from: '', to: '' });
  };

  const renderCell = (row, column) => {
    if (column.type === 'egov' && row.egov_id) {
      const href = resolveDocumentUrl(config.documentFolder, row.document);
      return href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          {row.egov_id}
        </a>
      ) : (
        row.egov_id
      );
    }

    if (column.type === 'link' && row[column.key] && !(column.naWhen && column.naWhen(row))) {
      return (
        <a href={row[column.key]} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:underline">
          {row[column.key]}
        </a>
      );
    }

    return cellText(row, column);
  };

  const columnCount = columns.length + 2;
  const heading = department?.dept_name ? `${department.dept_name} — ${config.title}` : config.title;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <p className="text-sm font-medium text-blue-700">{config.group}</p>
              <h1 className="text-3xl font-bold text-slate-900">{heading}</h1>
            </div>

            {counts.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {counts.map((card, index) => (
                  <CountCard key={card.label} label={card.label} count={card.count} tone={statTone(index)} />
                ))}
              </div>
            )}

            <div className="rounded-xl bg-white p-4 shadow">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                {config.dateFilter ? (
                  <form className="flex flex-wrap items-end gap-3" onSubmit={applyDateFilter}>
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      {config.dateFilter.fromLabel}
                      <input
                        type="date"
                        value={fromInput}
                        onChange={(event) => setFromInput(event.target.value)}
                        className="mt-1 rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      {config.dateFilter.toLabel}
                      <input
                        type="date"
                        value={toInput}
                        onChange={(event) => setToInput(event.target.value)}
                        className="mt-1 rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      Search
                    </button>
                    {(appliedRange.from || appliedRange.to) && (
                      <button
                        type="button"
                        onClick={resetDateFilter}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Reset
                      </button>
                    )}
                  </form>
                ) : (
                  <div />
                )}

                <div className="flex flex-wrap items-end gap-3">
                  <div className="relative w-full sm:w-64">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search..."
                      className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportToExcel(config, columns, filteredRows)}
                    disabled={filteredRows.length === 0}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Export to Excel
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                {VALIDATION_LEGEND.map((item) => (
                  <span key={item.status} className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm border border-gray-300" style={{ backgroundColor: VALIDATION_ROW_COLORS[item.status] }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-xl">
              <div className="overflow-auto rounded-xl">
                <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead className="bg-blue-600">
                    <tr>
                      <th className={TH_CLASS}>S.No</th>
                      {columns.map((column) => (
                        <th key={column.key} className={`${TH_CLASS} whitespace-nowrap`}>
                          {column.label}
                        </th>
                      ))}
                      <th className={ACTION_TH_CLASS}>{validation ? 'Action' : 'Document'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={columnCount} className="px-6 py-12 text-center text-slate-500">
                          Loading...
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={columnCount} className="px-6 py-12 text-center text-slate-500">
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row, index) => {
                        const documentUrl = resolveDocumentUrl(config.documentFolder, row.document);
                        return (
                          <tr key={`${row.id}-${row.owner_staff_id}`} style={{ backgroundColor: VALIDATION_ROW_COLORS[row.validation_status] }}>
                            <td className="px-6 py-4 text-sm text-slate-900">{start + index + 1}</td>
                            {columns.map((column) => (
                              <td
                                key={column.key}
                                className={`px-6 py-4 text-sm text-slate-900 ${column.wrap ? 'min-w-[12rem] max-w-xs whitespace-normal' : 'whitespace-nowrap'}`}
                              >
                                {renderCell(row, column)}
                              </td>
                            ))}
                            <td
                              className="sticky right-0 z-10 border-l border-gray-200 px-6 py-4 text-center"
                              style={{ backgroundColor: rowBackground(row) }}
                            >
                              <div className="flex items-center justify-center gap-2">
                              {documentUrl ? (
                                <a
                                  href={documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="View Document"
                                  aria-label="View document"
                                  className="inline-flex items-center justify-center rounded-lg border-2 border-blue-400 bg-white p-2 text-blue-700 hover:bg-blue-100"
                                >
                                  <svg {...iconProps()}>
                                    <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                              {validation && (
                                <button
                                  type="button"
                                  onClick={() => setValidatingRow(row)}
                                  title="Validate"
                                  aria-label="Validate record"
                                  className="inline-flex items-center justify-center rounded-lg bg-blue-700 p-2 text-white hover:bg-blue-800"
                                >
                                  <svg {...iconProps()}>
                                    <path d="M9 12l2 2 4-4" />
                                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    className="rounded border border-gray-300 px-2 py-1"
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span>
                    of {filteredRows.length} {filteredRows.length === rows.length ? 'records' : `filtered (${rows.length} total)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-gray-300 bg-white px-3 py-1 disabled:opacity-50"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="rounded border border-gray-300 bg-white px-3 py-1 disabled:opacity-50"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {validation && validatingRow && (
              <ValidationModal
                title={config.title}
                row={validatingRow}
                onClose={() => setValidatingRow(null)}
                onSubmit={(payload) => validation.submit(token, report, validatingRow.id, payload)}
                onDone={handleValidated}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// The Laravel "Validate the <menu> Details" modal: a Valid / In-Valid choice, with a Reason
// field that only appears for In-Valid. A rejected record turns red on the staff member's page
// with this reason, and returns as "updated" once they edit it.
function ValidationModal({ title, row, onClose, onSubmit, onDone }) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (status !== 'valid' && status !== 'invalid') {
      setError('Please choose a validate type.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await onSubmit({ validation_status: status, reason: status === 'invalid' ? reason.trim() : '' });
      onDone(response?.data?.message || 'Validation status updated successfully');
    } catch (requestError) {
      const fieldErrors = requestError?.response?.data?.errors;
      setError(
        (fieldErrors && Object.values(fieldErrors)[0]) ||
          requestError?.response?.data?.message ||
          'Failed to update the validation status.'
      );
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) onClose();
  };

  const currentStatus = row.validation_status || 'new';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={close} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white text-left shadow-xl">
        <div className="flex items-center justify-between bg-blue-600 px-6 py-4">
          <h3 className="text-lg font-medium text-white">Validate the {title} Details</h3>
          <button type="button" onClick={close} aria-label="Close" className="text-white hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-700">
            <div>
              <span className="font-medium">Staff:</span> {staffName(row)}
              {row.egov_id && (
                <>
                  {' '}
                  · <span className="font-medium">E-Gov ID:</span> {row.egov_id}
                </>
              )}
            </div>
            <div className="mt-1">
              <span className="font-medium">Current status:</span> <span className="capitalize">{currentStatus}</span>
              {currentStatus === 'invalid' && row.reason && <span> — {row.reason}</span>}
            </div>
          </div>

          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Validate Type <span className="text-red-500">*</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setError('');
                }}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose One</option>
                <option value="valid">Valid</option>
                <option value="invalid">In-Valid</option>
              </select>
            </label>

            {status === 'invalid' && (
              <label className="block text-sm font-medium text-gray-700">
                Reason
                <input
                  type="text"
                  value={reason}
                  maxLength={225}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason"
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
