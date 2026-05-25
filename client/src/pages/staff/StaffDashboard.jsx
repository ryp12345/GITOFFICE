import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_NON_TEACHING, isRoleMatch } from '../../utils/role';
import api from '../../api/axios';
import { getLeaveEntitlements } from '../../api/leaveEntitlementApi';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import React from 'react';

export default function StaffDashboard() {
  const { user, token } = useAuth() || {};
  const isNonTeaching = isRoleMatch(user?.role, ROLE_NON_TEACHING);
  const panelLabel = isNonTeaching ? 'Non-Teaching' : 'Teaching';

  const fullNameParts = [user?.fname, user?.mname, user?.lname].filter(Boolean);
  const fallbackName = user?.name || user?.full_name || (fullNameParts.length ? fullNameParts.join(' ') : '') || user?.username || user?.email || '';

  const [resolvedName, setResolvedName] = React.useState(null);

  React.useEffect(() => {
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

  // Dynamic state
  const [staffId, setStaffId] = React.useState(null);
  const [department, setDepartment] = React.useState('');
  const [designation, setDesignation] = React.useState('');
  const [payscale, setPayscale] = React.useState('');
  const [association, setAssociation] = React.useState('');
  const [leaveBalance, setLeaveBalance] = React.useState({ CL: '--', EL: '--', RH: '--' });
  const [leavePieData, setLeavePieData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        // resolve staff record
        let staff = null;
        if (user?.staff_id) {
          const res = await api.get(`/staff/${user.staff_id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          staff = res?.data?.data || res?.data || null;
        }

        if (!staff && user?.id) {
          const listRes = await api.get('/staff', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const rows = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
          staff = rows.find((item) => Number(item?.user_id) === Number(user.id)) || null;
        }

        if (!mounted) return;

        if (staff) {
          setStaffId(staff.id || user.staff_id || null);
          setDepartment(staff.department_name || staff.dept_shortname || staff.department || '');
          setDesignation(staff.designation_name || staff.designation || '');
          setPayscale(staff.payscale_title || staff.payscale || '');
          const assoc = Array.isArray(staff.latestassociation) ? staff.latestassociation[0]?.asso_name : staff.latestassociation?.asso_name || '';
          setAssociation(assoc || '');
        }

        // fetch leave entitlements for current year
        try {
          const year = new Date().getFullYear();
          const entRes = await getLeaveEntitlements({ year }, token);
          const payload = entRes?.data?.data || {};
          const rows = payload.data || [];

          const staffRow = rows.find((r) => (staff && Number(r.id) === Number(staff.id)) || (user && Number(r.user_id) === Number(user.id)));
          if (staffRow) {
            const leaves = staffRow.leaves || {};
            const compute = (short) => {
              const key = String(short || '').toUpperCase();
              const v = leaves[key];
              if (!v) return 0;
              if (v.balance !== undefined && v.balance !== null) return Number(v.balance) || 0;
              const entitled = Number(v.entitled_accumulated ?? v.entitled_curr_year ?? 0) || 0;
              const availed = Number(v.availed ?? v.consumed ?? v.consumed_curr_year ?? 0) || 0;
              const encashed = Number(v.encashed_curr_year ?? v.encashed ?? 0) || 0;
              const val = entitled - availed - encashed;
              return Number.isFinite(val) ? val : 0;
            };

            const CL = compute('CL');
            const EL = compute('EL');
            const RH = compute('RH');
            if (mounted) setLeaveBalance({ CL, EL, RH });

            // Mirror server-side Blade `allLeaveTypes` so the pie shows the same categories
            const allLeaveTypes = ['CL', 'DL-Other', 'EL', 'RH', 'DL-GIT', 'DL-VTU'];
            const colors = {
              CL: '#3b82f6',
              EL: '#10b981',
              RH: '#f59e42',
              'DL-Other': '#8b5cf6',
              'DL-GIT': '#ef4444',
              'DL-VTU': '#06b6d4',
            };

            const pieData = allLeaveTypes.map((t) => ({
              label: t,
              value: Number(compute(t) || 0),
              color: colors[t] || '#9ca3af',
            }));

            if (mounted) setLeavePieData(pieData);
          }
        } catch (e) {
          // ignore leave fetch error
        }
      } catch (e) {
        if (!mounted) return;
        setError('Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => { mounted = false; };
  }, [user?.id, user?.staff_id, token]);

  // Chart.js setup for pie chart
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    Chart.register(ArcElement, Tooltip, Legend);
    const ctx = chartRef.current?.getContext?.('2d');
    if (!ctx) return;

    const data = {
      labels: leavePieData.map((d) => d.label),
      datasets: [
        {
          data: leavePieData.map((d) => d.value),
          backgroundColor: leavePieData.map((d) => d.color),
        },
      ],
    };

    const chart = new Chart(ctx, {
      type: 'pie',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [leavePieData]);


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Staff Dashboard</h2>
            <p className="mt-1 text-lg font-medium text-blue-700">Welcome{(resolvedName || fallbackName) ? `, ${resolvedName || fallbackName}` : ''}</p>

            {/* Statistic Cards - Blade-style layout */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {/* Department Card */}
              <div className="rounded-xl bg-blue-50 p-5 shadow flex flex-col border border-blue-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-primary p-2.5 bg-blue-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M12 2L2 6V10L12 14L22 10V6L12 2ZM12 15L2 10V14L12 19L22 14V10L12 15ZM12 18L4 13L12 17L20 13L12 18Z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Department</p>
                    <h5 className="mb-0 text-2xl font-semibold text-gray-800">{department}</h5>
                    <a href="/teaching/department-history" className="text-blue-600 text-sm hover:underline">view</a>
                  </div>
                </div>
              </div>
              {/* Designation & Payscale Card */}
              <div className="rounded-xl bg-yellow-50 p-5 shadow flex flex-col border border-yellow-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-yellow-600 p-2.5 bg-yellow-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M12 2C13.1 2 14 2.9 14 4V6H20C21.1 6 22 6.9 22 8V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V8C2 6.9 2.9 6 4 6H10V4C10 2.9 10.9 2 12 2ZM12 4H10V6H14V4H12ZM4 8V20H20V8H4Z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Designation & Payscale</p>
                    <h5 className="mb-0 text-2xl font-semibold text-gray-800">{designation}</h5>
                    <div className="text-sm text-gray-600">{payscale}</div>
                    <a href="/teaching/designation-payscale" className="text-yellow-700 text-sm hover:underline">view</a>
                  </div>
                </div>
              </div>
              {/* Association Card */}
              <div className="rounded-xl bg-pink-50 p-5 shadow flex flex-col border border-pink-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-pink-600 p-2.5 bg-pink-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5h-1v-2h1V8c0-.55.45-1 1-1h2v2h-1v1.5h1v2h-1v5h-2zm6 0h-2v-2h2v2zm-6-9c-.83 0-1.5-.67-1.5-1.5S10.17 5.5 11 5.5 12.5 6.17 12.5 7 11.83 7.5 11 7.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Association</p>
                    <h5 className="mb-0 text-2xl font-semibold text-gray-800">{association}</h5>
                    <a href="/teaching/association" className="text-pink-700 text-sm hover:underline">view</a>
                  </div>
                </div>
              </div>
              {/* Leave Statistics Card */}
              <div className="rounded-xl bg-green-50 p-5 shadow flex flex-col border border-green-200">
                <div className="flex items-center mb-2">
                  <div className="avatar rounded-sm text-green-600 p-2.5 bg-green-100 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M16.5 3a6.5 6.5 0 1 0-9 9H3v9h18v-9h-4.5a6.5 6.5 0 0 0-9-9zM9 6a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm9 9H6v6h12v-6z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Leaves</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-sm mr-2">CL: <span className="font-semibold">{leaveBalance.CL}</span></span>
                      <span className="text-sm mr-2">EL: <span className="font-semibold">{leaveBalance.EL}</span></span>
                      <span className="text-sm mr-2">RH: <span className="font-semibold">{leaveBalance.RH}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview of Leave Balance (Pie Chart) */}
            <div className="mt-8">
              <div className="rounded-xl bg-white p-6 shadow border border-blue-100 max-w-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h5 className="text-lg font-bold text-blue-700">Overview of Leave Balance</h5>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-72 h-56">
                    <canvas ref={chartRef} />
                  </div>
                  <div className="flex-1 text-sm text-blue-700">
                    {leavePieData.length ? leavePieData.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 mb-2">
                        <span style={{ background: item.color }} className="inline-block w-3 h-3 rounded-full"></span>
                        <span className="font-medium">{item.label}:</span>
                        <span className="ml-1">{item.value}</span>
                      </div>
                    )) : (
                      <div>No leave data available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
