import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getMyStaff } from '../../api/hodApi';

const getStaffName = (row) => {
  const parts = [row?.fname, row?.mname, row?.lname].filter(Boolean);
  return parts.length ? parts.join(' ') : 'N/A';
};

function StaffTable({ title, rows, loading, page, setPage, pageSize }) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize || 1));
  const start = (page - 1) * pageSize;
  const paginated = rows.slice(start, start + pageSize);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900 text-center w-full">{title}</h2>
      <div className="overflow-hidden bg-white shadow-xl rounded-xl">

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider rounded-tl-xl">S.NO</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Designation</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Association</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider rounded-tr-xl">Contact No</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading staff details...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No records found.</td>
                </tr>
              ) : (
                paginated.map((row, index) => (
                  <tr key={`${row.staff_id || index}-${row.user_id || ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{start + index + 1}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{getStaffName(row)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.employee_type || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.designation_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.association_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.contactno || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {rows.length > pageSize && (
          <div className="flex justify-end items-center gap-2 px-6 pb-6">
            <button
              className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HODMyStaffPage() {
  const { token } = useAuth() || {};
  const [department, setDepartment] = useState(null);
  const [teachingStaff, setTeachingStaff] = useState([]);
  const [nonTeachingStaff, setNonTeachingStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [searchTeaching, setSearchTeaching] = useState('');
  const [searchNonTeaching, setSearchNonTeaching] = useState('');
  const [pageTeaching, setPageTeaching] = useState(1);
  const [pageNonTeaching, setPageNonTeaching] = useState(1);
  const PAGE_SIZE = 10;

  const filteredTeaching = useMemo(() => {
    const q = searchTeaching.trim().toLowerCase();
    if (!q) return teachingStaff;
    return teachingStaff.filter(r => (
      getStaffName(r).toLowerCase().includes(q) ||
      (r.employee_type || '').toLowerCase().includes(q) ||
      (r.designation_name || '').toLowerCase().includes(q) ||
      (r.association_name || '').toLowerCase().includes(q) ||
      (r.contactno || '').toLowerCase().includes(q)
    ));
  }, [teachingStaff, searchTeaching]);

  const filteredNonTeaching = useMemo(() => {
    const q = searchNonTeaching.trim().toLowerCase();
    if (!q) return nonTeachingStaff;
    return nonTeachingStaff.filter(r => (
      getStaffName(r).toLowerCase().includes(q) ||
      (r.employee_type || '').toLowerCase().includes(q) ||
      (r.designation_name || '').toLowerCase().includes(q) ||
      (r.association_name || '').toLowerCase().includes(q) ||
      (r.contactno || '').toLowerCase().includes(q)
    ));
  }, [nonTeachingStaff, searchNonTeaching]);

  useEffect(() => { setPageTeaching(1); }, [searchTeaching, teachingStaff]);
  useEffect(() => { setPageNonTeaching(1); }, [searchNonTeaching, nonTeachingStaff]);

  useEffect(() => {
    const loadStaff = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await getMyStaff(token);
        const payload = response?.data?.data || {};
        setDepartment(payload.department || null);
        setTeachingStaff(Array.isArray(payload.teachingStaff) ? payload.teachingStaff : []);
        setNonTeachingStaff(Array.isArray(payload.nonTeachingStaff) ? payload.nonTeachingStaff : []);
      } catch (error) {
        setDepartment(null);
        setTeachingStaff([]);
        setNonTeachingStaff([]);
        setNotification({
          show: true,
          message: error?.response?.data?.message || 'Failed to load my staff details.',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, [token]);

  const pageTitle = useMemo(() => {
    if (!department?.dept_name) {
      return 'My Staff';
    }
    return `${department.dept_name} My Staff`;
  }, [department]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-8">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: 'info' })}
            />

            <div>
              <h1 className="text-3xl font-bold text-slate-900">{pageTitle}</h1>
              <p className="mt-2 text-slate-600">
                Staff grouped into separate Teaching and Non-Teaching tables.
              </p>
            </div>

            {/* Per-table search inputs are rendered above each table */}

            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-full sm:w-72">
                  <input value={searchTeaching} onChange={(e) => setSearchTeaching(e.target.value)} placeholder="Search teaching staff..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex-1 text-center">
                  <h2 className="text-lg font-semibold text-slate-900">Teaching Staff</h2>
                </div>
                <div className="hidden sm:block w-72" />
              </div>
              <StaffTable title="" rows={filteredTeaching} loading={loading} page={pageTeaching} setPage={setPageTeaching} pageSize={PAGE_SIZE} />
            </div>

            <div>
              <div className="flex items-center gap-4 mt-6 mb-3">
                <div className="relative w-full sm:w-72">
                  <input value={searchNonTeaching} onChange={(e) => setSearchNonTeaching(e.target.value)} placeholder="Search non-teaching staff..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex-1 text-center">
                  <h2 className="text-lg font-semibold text-slate-900">Non-Teaching Staff</h2>
                </div>
                <div className="hidden sm:block w-72" />
              </div>
              <StaffTable title="" rows={filteredNonTeaching} loading={loading} page={pageNonTeaching} setPage={setPageNonTeaching} pageSize={PAGE_SIZE} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
