import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import Notification from '../../../components/common/Notification';
import { useAuth } from '../../../context/AuthContext';
import {
  getLeaveEntitlementMeta,
  getLeaveEntitlements,
  updateLeaveEntitlement,
} from '../../../api/leaveEntitlementApi';

const startYear = 2024;

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dedupeLeaveTypes = (types) => {
  if (!Array.isArray(types)) return [];

  const seen = new Set();
  const unique = [];

  for (const item of types) {
    const shortname = String(item?.shortname || '').trim().toUpperCase();
    if (!shortname || seen.has(shortname)) continue;
    seen.add(shortname);
    unique.push({ ...item, shortname });
  }

  return unique;
};

const makeInitialForm = () => ({
  entitled: {},
  availed: {},
  this_year_encashed_el: 0,
  accumulated_el: 0,
});

export default function LeaveEntitlementPage() {
  const { token } = useAuth?.() || {};
  const hasLoadedDefaultViewRef = useRef(false);

  const [year, setYear] = useState(new Date().getFullYear());
  const [departmentId, setDepartmentId] = useState('');

  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypesTaken, setLeaveTypesTaken] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(makeInitialForm());
  const [formError, setFormError] = useState('');

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = startYear; y <= currentYear + 1; y += 1) {
      list.push(y);
    }
    return list;
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const searchable = [
        String(row.id ?? ''),
        String(row.name ?? ''),
        String(row.dept_shortname ?? ''),
        String(year)
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [rows, searchTerm, year]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const loadMeta = async () => {
    try {
      const res = await getLeaveEntitlementMeta(token);
      const data = res.data?.data || {};

      setDepartments(data.departments || []);
      setLeaveTypes(dedupeLeaveTypes(data.leave_types));
      setLeaveTypesTaken(dedupeLeaveTypes(data.leave_types_taken));
      if (data.default_year) {
        setYear(Number(data.default_year));
      }
    } catch (error) {
      showNotification(error.response?.data?.message || error.message || 'Failed to load entitlement metadata', 'error');
    }
  };

  const loadRows = async (targetYear, targetDepartmentId, mode = 'yearwise') => {
    setLoading(true);
    try {
      const res = await getLeaveEntitlements(
        { year: targetYear, departmentId: targetDepartmentId, mode },
        token
      );
      const payload = res.data?.data || {};

      setRows(payload.data || []);

      if (Array.isArray(payload.leave_types)) {
        setLeaveTypes(dedupeLeaveTypes(payload.leave_types));
      }

      if (Array.isArray(payload.leave_types_taken)) {
        setLeaveTypesTaken(dedupeLeaveTypes(payload.leave_types_taken));
      }

      if (Array.isArray(payload.departments)) {
        setDepartments(payload.departments);
      }
    } catch (error) {
      setRows([]);
      showNotification(error.response?.data?.message || error.message || 'Failed to load leave entitlements', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!token) return;
      await loadMeta();
      if (cancelled) return;

      await loadRows(undefined, '', 'default');
      if (!cancelled) {
        hasLoadedDefaultViewRef.current = true;
      }
    };

    initialize();

    return () => {
      cancelled = true;
      hasLoadedDefaultViewRef.current = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !hasLoadedDefaultViewRef.current) return;
    loadRows(year, departmentId, 'yearwise');
  }, [token, year, departmentId]);

  useEffect(() => {
    // Reset to first page only when filters change, not when rows update
    setPage(1);
  }, [year, departmentId, searchTerm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingRow(null);
    setForm(makeInitialForm());
    setFormError('');
  };

  const openEdit = (row) => {
    const entitled = {};
    const availed = {};

    leaveTypes.forEach((leaveType) => {
      const shortname = leaveType.shortname;
      entitled[shortname] = row.leaves?.[shortname]?.entitled_curr_year ?? 0;
    });

    leaveTypesTaken.forEach((leaveType) => {
      const shortname = leaveType.shortname;
      availed[shortname] = row.leaves?.[shortname]?.availed ?? 0;
    });

    setForm({
      entitled,
      availed,
      this_year_encashed_el: row.leaves?.EL?.encashed_curr_year ?? 0,
      accumulated_el: row.leaves?.EL?.accumulated ?? 0,
    });

    setEditingRow(row);
    setFormError('');
    setModalOpen(true);
  };

  const computeBalance = (shortname) => {
    const entitledValue = asNumber(form.entitled?.[shortname]);
    const availedValue = asNumber(form.availed?.[shortname]);
    return entitledValue - availedValue;
  };

  const submitUpdate = async (event) => {
    event.preventDefault();

    if (!editingRow?.id) {
      setFormError('Unable to update record: staff ID missing.');
      return;
    }

    try {
      await updateLeaveEntitlement(
        {
          staff_id: editingRow.id,
          year,
          entitled: form.entitled,
          availed: form.availed,
          this_year_encashed_el: form.this_year_encashed_el,
          accumulated_el: form.accumulated_el,
        },
        token
      );

      showNotification('Leave staff entitlements updated successfully.', 'success');
      closeModal();
      loadRows(year, departmentId, 'yearwise');
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update leave entitlement';
      setFormError(message);
      showNotification(message, 'error');
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
              onClose={() => setNotification({ show: false, message: '', type: '' })}
            />

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-medium text-gray-900">Establishment Section</h3>
                <p className="mt-2 text-lg text-gray-700">Leave Entitlement for - <span className="text-blue-600 font-semibold">{year}</span></p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Department</label>
                <select
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.dept_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Calender Year</label>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {yearOptions.map((optionYear) => (
                    <option key={optionYear} value={optionYear}>{optionYear}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 mb-4 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-72">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search entitlement..."
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Sl. No</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Department</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Emp. ID</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Employee Name</th>
                      <th className="px-4 py-3 border text-left text-xs font-semibold uppercase" rowSpan="2">Year</th>
                      <th className="px-4 py-3 border text-center text-xs font-semibold uppercase" colSpan={leaveTypes.length}>Entitled + Accumulated-Encashed</th>
                      <th className="px-4 py-3 border text-center text-xs font-semibold uppercase" colSpan={leaveTypesTaken.length}>Taken</th>
                      <th className="px-4 py-3 border text-center text-xs font-semibold uppercase" colSpan={leaveTypes.length}>Balance</th>
                      <th className="px-4 py-3 border text-center text-xs font-semibold uppercase" rowSpan="2">Actions</th>
                    </tr>
                    <tr>
                      {leaveTypes.map((leaveType) => (
                        <th key={`entitled-${leaveType.shortname}`} className="px-3 py-2 border text-xs font-semibold uppercase">{leaveType.shortname}</th>
                      ))}
                      {leaveTypesTaken.map((leaveType) => (
                        <th key={`taken-${leaveType.shortname}`} className="px-3 py-2 border text-xs font-semibold uppercase">{leaveType.shortname}</th>
                      ))}
                      {leaveTypes.map((leaveType) => (
                        <th key={`balance-${leaveType.shortname}`} className="px-3 py-2 border text-xs font-semibold uppercase">{leaveType.shortname}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9 + leaveTypes.length * 2 + leaveTypesTaken.length} className="px-4 py-12 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9 + leaveTypes.length * 2 + leaveTypesTaken.length} className="px-4 py-12 text-center text-gray-500">No records found</td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, index) => (
                        <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 border text-sm text-gray-700">{(page - 1) * PAGE_SIZE + index + 1}</td>
                          <td className="px-4 py-3 border text-sm text-gray-700">{row.dept_shortname || 'N/A'}</td>
                          <td className="px-4 py-3 border text-sm font-semibold text-gray-900">{row.id}</td>
                          <td className="px-4 py-3 border text-sm text-gray-700">{row.name}</td>
                          <td className="px-4 py-3 border text-sm text-gray-700">{year}</td>

                          {leaveTypes.map((leaveType) => {
                            const leaveData = row.leaves?.[leaveType.shortname];
                            return (
                              <td key={`entitled-value-${row.id}-${leaveType.shortname}`} className="px-4 py-3 border text-sm text-center text-gray-700">
                                {leaveData ? leaveData.entitled_accumulated : 0}
                              </td>
                            );
                          })}

                          {leaveTypesTaken.map((leaveType) => {
                            const leaveData = row.leaves?.[leaveType.shortname];
                            return (
                              <td key={`taken-value-${row.id}-${leaveType.shortname}`} className="px-4 py-3 border text-sm text-center text-gray-700">
                                {leaveData ? leaveData.availed : 0}
                              </td>
                            );
                          })}

                          {leaveTypes.map((leaveType) => {
                            const leaveData = row.leaves?.[leaveType.shortname];
                            return (
                              <td key={`balance-value-${row.id}-${leaveType.shortname}`} className="px-4 py-3 border text-sm text-center text-gray-700">
                                {leaveData ? leaveData.balance : 0}
                              </td>
                            );
                          })}

                          <td className="px-4 py-3 border text-center">
                            <button
                              onClick={() => openEdit(row)}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                              title="Edit leave entitlement"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && filteredRows.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6 pt-4 border-t border-gray-200 bg-gray-50">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {Math.ceil(filteredRows.length / PAGE_SIZE)}
                  </span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((prev) => Math.min(Math.ceil(filteredRows.length / PAGE_SIZE), prev + 1))}
                    disabled={page === Math.ceil(filteredRows.length / PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            {modalOpen && editingRow && (
              <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeModal} />
                  <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
                    <div className="px-6 py-4 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium leading-6 text-white">Edit Leave Entitlement</h3>
                        <button className="text-white hover:text-gray-200" onClick={closeModal}>Close</button>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-white">
                      {formError && (
                        <div className="mb-4 p-3 rounded border border-red-200 text-red-700 bg-red-50 text-sm">{formError}</div>
                      )}
                      <form onSubmit={submitUpdate} className="space-y-6">
                        <div>
                          <h4 className="mb-3 text-md font-semibold text-gray-800">Entitled Leaves</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {leaveTypes.map((leaveType) => (
                              <div key={`entitled-input-${leaveType.shortname}`}>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Entitled ({leaveType.shortname})</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={form.entitled?.[leaveType.shortname] ?? 0}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setForm((prev) => ({
                                      ...prev,
                                      entitled: {
                                        ...prev.entitled,
                                        [leaveType.shortname]: value,
                                      },
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-3 text-md font-semibold text-gray-800">Taken Leaves</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {leaveTypesTaken.map((leaveType) => (
                              <div key={`taken-input-${leaveType.shortname}`}>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Taken ({leaveType.shortname})</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={form.availed?.[leaveType.shortname] ?? 0}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setForm((prev) => ({
                                      ...prev,
                                      availed: {
                                        ...prev.availed,
                                        [leaveType.shortname]: value,
                                      },
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-3 text-md font-semibold text-gray-800">Balance Leaves</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {leaveTypes.map((leaveType) => (
                              <div key={`balance-input-${leaveType.shortname}`}>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Balance ({leaveType.shortname})</label>
                                <input
                                  type="number"
                                  readOnly
                                  value={computeBalance(leaveType.shortname)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="mb-3 text-md font-semibold text-gray-800">Leave Encashed</h4>
                            <label className="block mb-2 text-sm font-medium text-gray-700">This Year (EL)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={form.this_year_encashed_el}
                              onChange={(event) => setForm((prev) => ({ ...prev, this_year_encashed_el: event.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <h4 className="mb-3 text-md font-semibold text-gray-800">Leave Carry Forwarded</h4>
                            <label className="block mb-2 text-sm font-medium text-gray-700">(EL)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={form.accumulated_el}
                              onChange={(event) => setForm((prev) => ({ ...prev, accumulated_el: event.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Close
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                          >
                            Update
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
