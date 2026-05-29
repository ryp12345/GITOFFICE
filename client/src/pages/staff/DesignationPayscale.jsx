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
  const [additionalRows, setAdditionalRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Welcome and staff name logic (copied from StaffDashboard)
  const fullNameParts = [user?.fname, user?.mname, user?.lname].filter(Boolean);
  const fallbackName = user?.name || user?.full_name || (fullNameParts.length ? fullNameParts.join(' ') : '') || user?.username || user?.email || '';
  const [resolvedName, setResolvedName] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function resolveName() {
      try {
        if (user?.staff_id) {
          const res = await api.get(`/staff/${user.staff_id}`);
          const s = res?.data?.data || res?.data || null;
          if (!mounted) return;
          if (s) {
            const parts = [s.fname, s.mname, s.lname].filter(Boolean);
            setResolvedName(s.name || (parts.length ? parts.join(' ') : null) || null);
            return;
          }
        }
        if (user?.id) {
          const listRes = await api.get('/staff');
          const rows = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
          const row = rows.find((item) => Number(item?.user_id) === Number(user.id));
          if (!mounted) return;
          if (row) {
            const parts = [row.fname, row.mname, row.lname].filter(Boolean);
            setResolvedName(row.name || (parts.length ? parts.join(' ') : null) || null);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    resolveName();
    return () => { mounted = false; };
  }, [user?.id, user?.staff_id]);

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

  const getRangeStart = (value) => {
    const normalized = normalizeDateValue(value);
    if (!normalized) return Number.NEGATIVE_INFINITY;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
  };

  const getRangeEnd = (value) => {
    if (!value) return Number.POSITIVE_INFINITY;
    const normalized = normalizeDateValue(value);
    if (!normalized) return Number.POSITIVE_INFINITY;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
  };

  const shouldAttachPayscaleToDesignation = (designation, payscale) => {
    if (!designation || !payscale) return false;

    const designationStart = getRangeStart(designation.start_date);
    const designationEnd = getRangeEnd(designation.end_date);
    const payscaleStart = getRangeStart(payscale.start_date);
    const payscaleEnd = getRangeEnd(payscale.end_date);

    if (!Number.isFinite(designationStart) || !Number.isFinite(payscaleStart)) {
      return false;
    }

    if (!designation.end_date) {
      return payscaleStart >= designationStart;
    }

    return payscaleStart >= designationStart && Number.isFinite(payscaleEnd) && payscaleEnd <= designationEnd;
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
          setAdditionalRows([]);
          setLoading(false);
          return;
        }

        const res = await getStaffDesignationPayscale(staffId);
        const designationData = Array.isArray(res?.data?.designations) ? res.data.designations : [];
        const regularDesignations = designationData.filter(
          (row) => Number(row?.isadditional ?? row?.isadditonal) !== 1
        );

        const additionalFromDesignations = designationData.filter(
          (row) => Number(row?.isadditional ?? row?.isadditonal) === 1
        );

        const additionalFromApi =
          (Array.isArray(res?.data?.additionalDesignations) && res.data.additionalDesignations)
          || (Array.isArray(res?.data?.add_designations) && res.data.add_designations)
          || (Array.isArray(res?.data?.additional_designations) && res.data.additional_designations)
          || [];

        const mergedAdditional = additionalFromApi.length ? additionalFromApi : additionalFromDesignations;

        setDesignations(regularDesignations);
        setPayscales(Array.isArray(res?.data?.payscales) ? res.data.payscales : []);
        setAdditionalRows(mergedAdditional);
      } catch (_e) {
        setDesignations([]);
        setPayscales([]);
        setAdditionalRows([]);
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

  const additionalDesignationRows = additionalRows.map((row) => ({
    ...row,
    start_date: normalizeDateValue(row?.start_date),
    end_date: normalizeDateValue(row?.end_date),
  }));

  const payscaleLabel = (row) => {
    if (row.payscale_title) return row.payscale_title;
    if (row.pay != null) return `${row.pay_type || ''} Pay: ${row.pay}`.trim();
    return row.pay_type || '-';
  };

  const designationPayscaleMatrix = designationRows.map((designation) => {
    const relatedPayscales = payscaleRows.filter((payscale) =>
      shouldAttachPayscaleToDesignation(designation, payscale)
    );

    return {
      designation,
      payscales: relatedPayscales.length ? relatedPayscales : [null],
    };
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <StaffSidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="mb-2 text-left">
              <h2 className="text-3xl font-extrabold text-slate-900">Designation &amp; Payscale History</h2>
              <p className="mt-1 text-lg font-medium text-blue-700">Welcome{(resolvedName || fallbackName) ? `, ${resolvedName || fallbackName}` : ''}</p>
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              {loading ? (
                <div className="text-center py-10 text-gray-500">Loading...</div>
              ) : designationPayscaleMatrix.length === 0 ? (
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
                      {designationPayscaleMatrix.map((group, groupIndex) => (
                        group.payscales.map((payscale, payIndex) => {
                          const inactive = String(group.designation?.status || '').toLowerCase() === 'inactive';
                          const rowClassName = inactive ? 'bg-gray-100' : (groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50');
                          const rowKey = `${group.designation?.id || groupIndex}-${payscale?.id || payIndex}`;

                          return (
                            <tr key={rowKey} className={rowClassName}>
                              {payIndex === 0 && (
                                <>
                                  <td rowSpan={group.payscales.length} className="px-3 py-2 border-b text-sm text-gray-600 align-top">{groupIndex + 1}</td>
                                  <td rowSpan={group.payscales.length} className="px-3 py-2 border-b text-sm text-gray-800 font-medium align-top">{group.designation?.designation_name || '-'}</td>
                                  <td rowSpan={group.payscales.length} className="px-3 py-2 border-b text-sm text-gray-600 align-top">{group.designation?.start_date ? formatDateDMY(group.designation.start_date) : '-'}</td>
                                  <td rowSpan={group.payscales.length} className="px-3 py-2 border-b text-sm text-gray-600 align-top">{group.designation?.end_date ? formatDateDMY(group.designation.end_date) : 'Till Date'}</td>
                                  <td rowSpan={group.payscales.length} className="px-3 py-2 border-b text-sm text-gray-600 align-top">{calcDuration(group.designation?.start_date, group.designation?.end_date || null)}</td>
                                </>
                              )}
                              <td className="px-3 py-2 border-b text-sm text-gray-800 font-medium">{payscale ? payscaleLabel(payscale) : '--NA--'}</td>
                              <td className="px-3 py-2 border-b text-sm text-gray-600">{payscale?.start_date ? formatDateDMY(payscale.start_date) : '--NA--'}</td>
                              <td className="px-3 py-2 border-b text-sm text-gray-600">{payscale ? (payscale?.end_date ? formatDateDMY(payscale.end_date) : 'Till Date') : '--NA--'}</td>
                              <td className="px-3 py-2 border-b text-sm text-gray-600">{payscale ? calcDuration(payscale.start_date, payscale.end_date || null) : '--NA--'}</td>
                            </tr>
                          );
                        })
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="overflow-hidden bg-white shadow-xl rounded-xl">
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-2xl font-bold text-slate-900">Additional Designation</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">S.NO</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Additional Designation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">End Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Allowance Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">GCR</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-sm text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : additionalDesignationRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-sm text-center text-gray-500">No additional designation found.</td>
                      </tr>
                    ) : (
                      additionalDesignationRows.map((row, index) => (
                        <tr key={row?.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{index + 1}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-800 font-medium">{row?.designation_name || '-'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{row?.department_name || row?.dept_name || '--NA--'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{row?.start_date ? formatDateDMY(row.start_date) : '--NA--'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{row?.end_date ? formatDateDMY(row.end_date) : '--NA--'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{row?.allowance_status || '--NA--'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{calcDuration(row?.start_date, row?.end_date || null)}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{row?.gcr || '--NA--'}</td>
                          <td className="px-3 py-2 border-b text-sm text-gray-600">{row?.status || '--NA--'}</td>
                        </tr>
                      ))
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
