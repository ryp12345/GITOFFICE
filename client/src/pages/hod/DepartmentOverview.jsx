import { useEffect, useMemo, useState } from 'react';
import Notification from '../../components/common/Notification';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getDepartmentOverview } from '../../api/hodApi';

const formatDate = (value) => {
  if (!value) return '--till Date--';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return value;
    return `${day}-${monthNames[monthIndex]}-${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const getDurationLabel = (startDate, endDate) => {
  if (!startDate) return '--';

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return '--';
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += previousMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `${years} years ${months} months ${days} days`;
};

const getHodName = (row) => {
  const parts = [row?.fname, row?.mname, row?.lname].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'N/A';
};

export default function HODDepartmentOverviewPage() {
  const { token } = useAuth() || {};
  const [department, setDepartment] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    const loadDepartmentOverview = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await getDepartmentOverview(token);
        const payload = response?.data?.data || {};
        setDepartment(payload.department || null);
        setRows(Array.isArray(payload.hodHistory) ? payload.hodHistory : []);
      } catch (error) {
        setDepartment(null);
        setRows([]);
        setNotification({
          show: true,
          message: error?.response?.data?.message || 'Failed to load department overview.',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDepartmentOverview();
  }, [token]);

  const title = useMemo(() => {
    if (!department?.dept_name) {
      return 'Department Overview';
    }

    return `${department.dept_name} Department Overview`;
  }, [department]);

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

            <div className="mb-10">
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              <p className="mt-2 text-slate-600">
                Review current and previous Head of Department assignments for this department.
              </p>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider rounded-tl-xl">S.NO</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Head of Department</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider rounded-tr-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading department overview...</td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No HOD details found for this department.</td>
                      </tr>
                    ) : (
                      rows.map((row, index) => {
                        const isActive = String(row?.status || '').toLowerCase() === 'active';
                        return (
                          <tr key={`${row.staff_id || row.user_id || index}-${row.start_date || index}`} className={isActive ? 'bg-white' : 'bg-slate-100'}>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{index + 1}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{getHodName(row)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{formatDate(row.start_date)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{formatDate(row.end_date)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{getDurationLabel(row.start_date, row.end_date)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                                {row.status || 'unknown'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
