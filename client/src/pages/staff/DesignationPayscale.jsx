import { useEffect, useState } from 'react';
import { getStaffDesignationPayscale } from '../../api/staffDesignationPayscaleApi';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/layout/Header';
import StaffSidebar from '../../components/layout/StaffSidebar';
import api from '../../api/axios';

export default function DesignationPayscale() {
  const { user } = useAuth?.() || {};
  const [designations, setDesignations] = useState([]);
  const [payscales, setPayscales] = useState([]);
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
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);

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
      (endDate.year - startDate.year) * 12 + (endDate.month - startDate.month);

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

    async function fetchData() {
      setLoading(true);
      try {
        const staffId = await resolveStaffId();
        if (!staffId) {
          setDesignations([]);
          setPayscales([]);
          setLoading(false);
          return;
        }

        const res = await getStaffDesignationPayscale(staffId);
        setDesignations(Array.isArray(res?.data?.designations) ? res.data.designations : []);
        setPayscales(Array.isArray(res?.data?.payscales) ? res.data.payscales : []);
      } catch (_e) {
        setDesignations([]);
        setPayscales([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id, user?.staff_id]);

  const designationRows = designations.map((row) => ({
    ...row,
    start_date: normalizeDateValue(row?.start_date),
    end_date: normalizeDateValue(row?.end_date),
  }));

  const payscaleRows = payscales.map((row) => ({
    ...row,
    start_date: normalizeDateValue(row?.start_date),
    end_date: normalizeDateValue(row?.end_date),
  }));

  const payscaleLabel = (row) => {
    if (row.payscale_title) return row.payscale_title;
    if (row.pay != null) return `${row.pay_type || ''} Pay: ${row.pay}`.trim();
    return row.pay_type || '-';
  };

  const maxRows = Math.max(designationRows.length, payscaleRows.length);
  const combinedRows = Array.from({ length: maxRows }, (_, idx) => ({
    designation: designationRows[idx] || null,
    payscale: payscaleRows[idx] || null,
  }));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="mb-2 text-center">
              <h2 className="text-3xl font-extrabold text-slate-900">Designation &amp; Payscale History</h2>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              {loading ? (
                <div className="text-center py-10 text-gray-500">Loading...</div>
              ) : combinedRows.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No designation or payscale history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">S.NO</th>
                        <th colSpan="4" className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Designation Details</th>
                        <th colSpan="4" className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Pay Scale Details</th>
                      </tr>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Designation Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Payscale Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {combinedRows.map(({ designation, payscale }, index) => (
                        <tr key={`${designation?.id || 'd'}-${payscale?.id || 'p'}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{index + 1}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-800 font-medium">{designation?.designation_name || '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{designation?.start_date ? formatDateDMY(designation.start_date) : '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{designation?.end_date ? formatDateDMY(designation.end_date) : designation ? 'Till Date' : '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{designation ? calcDuration(designation.start_date, designation.end_date || null) : '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-800 font-medium">{payscale ? payscaleLabel(payscale) : '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{payscale?.start_date ? formatDateDMY(payscale.start_date) : '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{payscale?.end_date ? formatDateDMY(payscale.end_date) : payscale ? 'Till Date' : '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{payscale ? calcDuration(payscale.start_date, payscale.end_date || null) : '-'}</td>
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
