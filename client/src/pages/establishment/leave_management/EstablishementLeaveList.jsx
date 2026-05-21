import { useEffect, useMemo, useState } from 'react';
// SVGs for edit and cancel (from Blade)
const EditSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M16.7574 2.99666L14.7574 4.99666H5V18.9967H19V9.2393L21 7.2393V19.9967C21 20.5489 20.5523 20.9967 20 20.9967H4C3.44772 20.9967 3 20.5489 3 19.9967V3.99666C3 3.44438 3.44772 2.99666 4 2.99666H16.7574ZM20.4853 2.09717L21.8995 3.51138L12.7071 12.7038L11.2954 12.7062L11.2929 11.2896L20.4853 2.09717Z"></path></svg>
);
const CancelSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M7 4V2H17V4H22V6H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V6H2V4H7ZM6 6V20H18V6H6ZM9 9H11V17H9V9ZM13 9H15V17H13V9Z"></path></svg>
);
// Simple modal component
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
import Notification from '../../../components/common/Notification';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import { useAuth } from '../../../context/AuthContext';
import axios from '../../../api/axios';

function normalizeLeaveStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function getStatusClass(status) {
  const normalized = normalizeLeaveStatus(status);
  if (normalized === 'pending') return 'bg-gray-500 text-white';
  if (normalized === 'recommended') return 'bg-yellow-500 text-white';
  if (normalized === 'approved') return 'bg-green-500 text-white';
  if (normalized === 'rejected') return 'bg-red-500 text-white';
  if (normalized === 'cancelled') return 'bg-red-500 text-white';
  return 'bg-gray-400 text-white';
}

function formatDateDMY(value) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return '-';
    return `${day}-${monthNames[monthIndex]}-${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getStaffLabel(row) {
  if (row?.staff_name) return row.staff_name;
  if (row?.staffName) return row.staffName;
  if (row?.staff_id) return `Staff #${row.staff_id}`;
  return 'N/A';
}

export default function EstablishementLeaveList() {
  // Fetch staff list and alternate options (must be inside component)
  const [staffList, setStaffList] = useState([]);
  const [alternateOptions, setAlternateOptions] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const { token } = useAuth() || {};
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const entriesPerPage = 10;

  const notify = (message, type = 'success') => {
    setNotification({ show: true, message, type });
  };

  const loadRows = async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get('/leave-calendar/events', {
        params: { month, year },
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = response?.data?.data;
      setRows(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setRows([]);
      notify(error?.response?.data?.message || 'Failed to load leave list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month, year]);

  const filteredRows = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        String(row.id || ''),
        String(row.staff_name || row.staffName || row.staff_id || ''),
        String(row.shortname || row.dept_name || ''),
        String(row.leave_shortname || row.title || ''),
        String(row.start_date || ''),
        String(row.end_date || ''),
        String(row.appl_status || row.status || ''),
        String(row.alternate_staff || ''),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchQuery]);

  const totalEntries = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredRows.slice(start, start + entriesPerPage);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, month, year]);

  const exportToCsv = () => {
    if (filteredRows.length === 0) {
      notify('No data to export.', 'error');
      return;
    }
    const headers = ['#', 'Application Date', 'Name', 'Department', 'Leave Type', 'Leave From', 'Leave To', 'No Of Days', 'Alternate', 'Status'];
    const csvRows = [headers.join(',')];
    filteredRows.forEach((row) => {
      const cols = [
        row.id,
        formatDateDMY(row.application_date || row.created_at),
        `"${String(getStaffLabel(row)).replace(/"/g, '""')}"`,
        `"${String(row.shortname || row.dept_name || '').replace(/"/g, '""')}"`,
        `"${String(row.leave_shortname || row.title || '').replace(/"/g, '""')}"`,
        formatDateDMY(row.start_date),
        formatDateDMY(row.end_date),
        Number(row.no_of_days || 0),
        `"${String(row.alternate_staff || '').replace(/"/g, '""')}"`,
        String(row.appl_status || row.status || ''),
      ];
      csvRows.push(cols.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Establishment_Leaves_List_${year}_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= 2022; y -= 1) yearOptions.push(String(y));


  // Edit/Cancel modal state
  const [editModal, setEditModal] = useState({ open: false, row: null, saving: false });
  const [cancelModal, setCancelModal] = useState({ open: false, row: null, saving: false });
  // Editable fields for modal
  const [editFields, setEditFields] = useState({
    staff_id: '',
    staff_name: '', // for display only
    shortname: '',
    leave_id: '',
    leave_shortname: '',
    cl_type: 'Full',
    start_date: '',
    end_date: '',
    no_of_days: null,
    alternate_staff: '',
    additional_alternate: '',
    appl_status: '',
    reason: '',
  });

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    axios.get('/staff', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!mounted) return;
        setStaffList(response.data?.data || []);
      })
      .catch(() => {
        if (!mounted) return;
        setStaffList([]);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    axios.get('/leaves', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!mounted) return;
        setLeaveTypes(response.data?.data || []);
      })
      .catch(() => {
        if (!mounted) return;
        setLeaveTypes([]);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !editFields.staff_id) {
      setAlternateOptions([]);
      return;
    }
    axios.get('/leave-calendar/alternate-staff', {
      params: { staff_id: editFields.staff_id, employee_type: '' },
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => setAlternateOptions(response.data?.data || []))
      .catch(() => setAlternateOptions([]));
  }, [editFields.staff_id, staffList, token]);

  useEffect(() => {
    if (!editModal.open || editFields.leave_id || !editFields.leave_shortname || leaveTypes.length === 0) return;
    const matchedLeave = leaveTypes.find((leave) => {
      const shortname = String(leave.shortname || leave.short_name || '').trim();
      const longname = String(leave.longname || leave.title || '').trim();
      return shortname === editFields.leave_shortname || longname === editFields.leave_shortname;
    });
    if (!matchedLeave) return;
    setEditFields((current) => ({ ...current, leave_id: String(matchedLeave.id) }));
  }, [editFields.leave_id, editFields.leave_shortname, editModal.open, leaveTypes]);

  // Open edit modal and populate fields
  const handleEdit = (row) => {
    setEditFields({
      staff_id: row.staff_id || '',
      staff_name: row.staff_name || '',
      shortname: row.shortname || '',
      leave_id: row.leave_id ? String(row.leave_id) : '',
      leave_shortname: row.leave_shortname || '',
      cl_type: row.cl_type || 'Full',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      no_of_days: row.no_of_days || null,
      alternate_staff: row.alternate_staff || '',
      additional_alternate: row.additional_alternate || '',
      appl_status: row.appl_status || row.status || '',
      reason: row.reason || '',
    });
    setEditModal({ open: true, row, saving: false });
  };

  // Auto-calculate no_of_days in edit modal
  useEffect(() => {
    if (!editModal.open) return;
    if (!editFields.start_date || !editFields.end_date) {
      setEditFields(f => ({ ...f, no_of_days: null }));
      return;
    }
    const s = new Date(editFields.start_date);
    const e = new Date(editFields.end_date);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
      setEditFields(f => ({ ...f, no_of_days: null }));
      return;
    }
    let days = Math.floor((e - s) / 86400000) + 1;
    if (editFields.leave_shortname === 'CL' && days === 1 && editFields.cl_type !== 'Full') days = 0.5;
    setEditFields(f => ({ ...f, no_of_days: days }));
  }, [editModal.open, editFields.start_date, editFields.end_date, editFields.cl_type, editFields.leave_shortname]);
  const handleCancel = (row) => {
    setCancelModal({ open: true, row, saving: false });
  };

  // Edit modal submit
  const submitEdit = async () => {
    if (!editModal.row) return;
    setEditModal((m) => ({ ...m, saving: true }));
    try {
      await axios.patch(`/leave-calendar/applications/${editModal.row.id}`, {
        staff_id: editFields.staff_id,
        leave_id: editFields.leave_id ? Number(editFields.leave_id) : null,
        status: editFields.appl_status,
        cl_type: editFields.cl_type,
        start_date: editFields.start_date,
        end_date: editFields.end_date,
        no_of_days: editFields.no_of_days,
        alternate: editFields.alternate_staff,
        additional_alternate: editFields.additional_alternate,
        reason: editFields.reason,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Leave application updated.', 'success');
      setEditModal({ open: false, row: null, saving: false });
      loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || 'Failed to update leave.', 'error');
      setEditModal((m) => ({ ...m, saving: false }));
    }
  };

  // Cancel modal submit
  const submitCancel = async () => {
    if (!cancelModal.row) return;
    setCancelModal((m) => ({ ...m, saving: true }));
    try {
      await axios.post(`/leave-calendar/applications/${cancelModal.row.id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify('Leave application cancelled.', 'success');
      setCancelModal({ open: false, row: null, saving: false });
      loadRows();
    } catch (error) {
      notify(error?.response?.data?.message || 'Failed to cancel leave.', 'error');
      setCancelModal((m) => ({ ...m, saving: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: 'info' })}
            />
            <div className="mb-12 text-center">
              <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Establishment Leaves List</h1>
              <p className="text-lg text-gray-600">Manage establishment leave list with quick actions</p>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leave list..."
                    className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="monthSelect" className="text-sm font-semibold text-slate-700">Select Month:</label>
                <select
                  id="monthSelect"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 12 }).map((_, index) => {
                    const monthValue = String(index + 1);
                    const monthLabel = new Date(2024, index, 1).toLocaleString('en', { month: 'long' });
                    return <option key={monthValue} value={monthValue}>{monthLabel}</option>;
                  })}
                </select>
                <label htmlFor="yearSelect" className="text-sm font-semibold text-slate-700">Select Year:</label>
                <select
                  id="yearSelect"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {yearOptions.map((yearValue) => (
                    <option key={yearValue} value={yearValue}>{yearValue}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={exportToCsv}
                  className="flex items-center justify-center px-4 py-2 font-medium text-white transition-all duration-300 transform rounded-lg shadow bg-green-600 hover:bg-green-700"
                >
                  Export to CSV
                </button>
              </div>
            </div>
            <div className="mb-10 overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Application Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave From</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Leave To</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">No Of Days</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Alternate</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-gray-500">Loading leave list...</td>
                      </tr>
                    ) : paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-gray-500">No leave applications found</td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, idx) => {
                        const status = normalizeLeaveStatus(row.appl_status || row.status);
                        return (
                          <tr key={row.id} className="hover:bg-blue-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(currentPage - 1) * entriesPerPage + idx + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(row.application_date || row.created_at)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getStaffLabel(row)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.shortname || row.dept_name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.leave_shortname || row.title || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(row.start_date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(row.end_date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.no_of_days || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.alternate_staff || '-'}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-center`}>
                              <span className={`px-2 py-1 rounded ${getStatusClass(status)}`}>{row.appl_status || row.status}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {status !== 'cancelled' && (
                                <>
                                  <button
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-slate-700 hover:bg-gray-200 mr-2"
                                    onClick={() => handleEdit(row)}
                                    disabled={loading}
                                    title="Edit"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                                    onClick={() => handleCancel(row)}
                                    disabled={loading}
                                    title="Cancel"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50">
                <span className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, totalEntries)} of {totalEntries} entries
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1">Page {currentPage} of {totalPages}</span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* Edit Modal */}

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, row: null, saving: false })} title="Edit Leave Application">
        {editModal.row && (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); submitEdit(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Apply Leave for : (staff)<span className="text-red-500">*</span></label>
                <select className="mt-1 block w-full border rounded p-2" value={editFields.staff_id || ''} onChange={e => {
                  const staff = staffList.find(s => String(s.id) === e.target.value);
                  setEditFields(f => ({ ...f, staff_id: e.target.value, staff_name: staff ? [staff.fname, staff.mname, staff.lname].filter(Boolean).join(' ') : '' }));
                }} required>
                  <option value="">Choose a staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{[s.fname, s.mname, s.lname].filter(Boolean).join(' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Leave Type:<span className="text-red-500">*</span></label>
                <select className="mt-1 block w-full border rounded p-2" value={editFields.leave_id || ''} onChange={e => {
                  const selectedLeave = leaveTypes.find((leave) => String(leave.id) === e.target.value);
                  setEditFields((current) => ({
                    ...current,
                    leave_id: e.target.value,
                    leave_shortname: selectedLeave?.shortname || selectedLeave?.short_name || selectedLeave?.longname || selectedLeave?.title || '',
                  }));
                }} required>
                  <option value="">Choose Leave Type</option>
                  {leaveTypes.map((l) => (
                    <option key={l.id} value={l.id}>{l.longname || l.shortname}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">From Date:<span className="text-red-500">*</span></label>
                <input type="date" className="mt-1 block w-full border rounded p-2" value={editFields.start_date || ''} onChange={e => setEditFields(f => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium">TO Date:<span className="text-red-500">*</span></label>
                <input type="date" className="mt-1 block w-full border rounded p-2" value={editFields.end_date || ''} onChange={e => setEditFields(f => ({ ...f, end_date: e.target.value }))} required />
              </div>
              {/* Show CL type only if leave type is CL and single day */}
              {editFields.leave_shortname === 'CL' && editFields.start_date === editFields.end_date && (
                <div>
                  <label className="block text-sm font-medium">Day Type</label>
                  <select className="mt-1 block w-full border rounded p-2" value={editFields.cl_type || 'Full'} onChange={e => setEditFields(f => ({ ...f, cl_type: e.target.value }))}>
                    <option value="Full">Full Day</option>
                    <option value="Morning">First Half</option>
                    <option value="Afternoon">Second Half</option>
                  </select>
                </div>
              )}
              {editFields.no_of_days !== null && editFields.no_of_days !== undefined && (
                <div className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  Duration: <span className="font-semibold text-blue-700">{editFields.no_of_days} day{editFields.no_of_days !== 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Leave Reason:<span className="text-red-500">*</span></label>
                <textarea className="mt-1 block w-full border rounded p-2" rows={3} value={editFields.reason || ''} onChange={e => setEditFields(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium">Alternate:</label>
                <select className="mt-1 block w-full border rounded p-2" value={editFields.alternate_staff || ''} onChange={e => setEditFields(f => ({ ...f, alternate_staff: e.target.value }))}>
                  <option value="">Choose Alternate</option>
                  {(Array.isArray(alternateOptions) ? alternateOptions : (alternateOptions.alternate_staff || [])).map((s) => (
                    <option key={s.id} value={s.id}>{[s.fname, s.mname, s.lname].filter(Boolean).join(' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Additional Alternate:</label>
                <select className="mt-1 block w-full border rounded p-2" value={editFields.additional_alternate || ''} onChange={e => setEditFields(f => ({ ...f, additional_alternate: e.target.value }))}>
                  <option value="">Choose an Alternate</option>
                  {staffList.filter((s) => String(s.id) !== String(editFields.staff_id)).map((s) => (
                    <option key={s.id} value={s.id}>{[s.fname, s.mname, s.lname].filter(Boolean).join(' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditModal({ open: false, row: null, saving: false })} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button
                type="submit"
                disabled={editModal.saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded"
              >
                {editModal.saving ? (
                  'Saving...'
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" />
                    </svg>
                    <span>Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal open={cancelModal.open} onClose={() => setCancelModal({ open: false, row: null, saving: false })} title="Cancel Leave Application">
        {cancelModal.row && (
          <div className="space-y-4">
            <div className="text-gray-700">Are you sure you want to cancel the leave application for <b>{getStaffLabel(cancelModal.row)}</b> ({cancelModal.row.leave_shortname || cancelModal.row.title})?</div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setCancelModal({ open: false, row: null, saving: false })}
                disabled={cancelModal.saving}
              >No</button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={submitCancel}
                disabled={cancelModal.saving}
              >{cancelModal.saving ? 'Cancelling...' : 'Yes, Cancel'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
