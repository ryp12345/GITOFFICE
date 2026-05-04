import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import { useAuth } from '../../context/AuthContext';
import { getMyStaff } from '../../api/hodApi';

const getStaffName = (row) => {
  const parts = [row?.fname, row?.mname, row?.lname].filter(Boolean);
  return parts.length ? parts.join(' ') : 'N/A';
};

function StaffTable({ title, rows, loading }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
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
                rows.map((row, index) => (
                  <tr key={`${row.staff_id || index}-${row.user_id || ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{index + 1}</td>
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
        <SidebarHOD />
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

            <StaffTable title="Teaching Staff" rows={teachingStaff} loading={loading} />
            <StaffTable title="Non-Teaching Staff" rows={nonTeachingStaff} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  );
}
