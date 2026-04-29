import { useEffect, useState } from 'react';
import { getStaffDepartments } from '../../api/staffDepartmentApi';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import api from '../../api/axios';

export default function DepartmentHistory() {
  const { user } = useAuth?.() || {};
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getDateParts = (value) => {
    if (!value) return null;

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return { year, month, day };
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    if (!year || !month || !day) return null;

    return { year, month, day };
  };

  const normalizeDateValue = (value) => {
    const parts = getDateParts(value);
    if (!parts) return '';

    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  };

  const calcDuration = (start, end) => {
    if (!start) return '-';
    const startDate = getDateParts(start);
    const endDate = end
      ? getDateParts(end)
      : {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          day: new Date().getDate(),
        };
    if (!startDate || !endDate) return '-';

    const totalMonths =
      (endDate.year - startDate.year) * 12 +
      (endDate.month - startDate.month);

    const years = Math.floor(Math.max(totalMonths, 0) / 12);
    const months = Math.max(totalMonths, 0) % 12;

    return `${years} Year ${months} Month`;
  };

  const formatDateDMY = (value) => {
    const parts = getDateParts(value);
    if (!parts) return '-';

    const monthIndex = parts.month - 1;
    if (monthIndex < 0 || monthIndex > 11) return '-';

    return `${String(parts.day).padStart(2, '0')}-${monthNames[monthIndex]}-${parts.year}`;
  };

  const departmentRows = Array.isArray(departments)
    ? departments.map((row) => ({
        ...row,
        start_date: normalizeDateValue(row?.start_date),
        end_date: normalizeDateValue(row?.end_date),
        duration:
          calcDuration(normalizeDateValue(row?.start_date), normalizeDateValue(row?.end_date)) !== '-'
            ? calcDuration(normalizeDateValue(row?.start_date), normalizeDateValue(row?.end_date))
            : row?.duration || '-',
      }))
    : [];

  useEffect(() => {
    async function resolveStaffId() {
      if (user?.staff_id) return user.staff_id;
      if (!user?.id) return null;

      try {
        const staffRes = await api.get('/staff');
        const staffRows = Array.isArray(staffRes?.data?.data) ? staffRes.data.data : [];
        const row = staffRows.find((item) => Number(item?.user_id) === Number(user.id));
        return row?.id || null;
      } catch (_e) {
        return null;
      }
    }

    async function fetchDepartments() {
      setLoading(true);
      try {
        const staffId = await resolveStaffId();
        if (!staffId) {
          setDepartments([]);
          setLoading(false);
          return;
        }

        const res = await getStaffDepartments(staffId);
        setDepartments(res.data || []);
      } catch (e) {
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDepartments();
  }, [user?.id, user?.staff_id]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-extrabold text-slate-900">Department History</h2>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              {loading ? (
                <div className="text-center py-10 text-gray-500">Loading...</div>
              ) : departmentRows.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No department history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">S.NO</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">End Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departmentRows.map((row, idx) => (
                        <tr key={row.id || idx} className="even:bg-gray-50">
                          <td className="px-3 py-2 border-b text-sm">{idx + 1}</td>
                          <td className="px-3 py-2 border-b text-sm">{row.department_name || '-'}</td>
                          <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.start_date)}</td>
                          <td className="px-3 py-2 border-b text-sm">{formatDateDMY(row.end_date)}</td>
                          <td className="px-3 py-2 border-b text-sm">{row.duration || '-'}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
