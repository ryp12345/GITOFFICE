import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../components/layout/Header';
import SidebarHOD from '../../components/layout/SidebarHOD';
import Notification from '../../components/common/Notification';
import { useAuth } from '../../context/AuthContext';
import { getMyStaff } from '../../api/hodApi';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const { token } = useAuth() || {};
  const [department, setDepartment] = useState(null);
  const [teachingStaff, setTeachingStaff] = useState([]);
  const [nonTeachingStaff, setNonTeachingStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    const load = async () => {
      if (!token) return setLoading(false);
      setLoading(true);
      try {
        const res = await getMyStaff(token);
        const payload = res?.data?.data || {};
        setDepartment(payload.department || null);
        setTeachingStaff(Array.isArray(payload.teachingStaff) ? payload.teachingStaff : []);
        setNonTeachingStaff(Array.isArray(payload.nonTeachingStaff) ? payload.nonTeachingStaff : []);
      } catch (err) {
        setNotification({ show: true, message: err?.response?.data?.message || 'Failed to load staff counts', type: 'error' });
        setDepartment(null);
        setTeachingStaff([]);
        setNonTeachingStaff([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const stats = useMemo(() => {
    const teaching = teachingStaff.length;
    const nonTeaching = nonTeachingStaff.length;
    const total = teaching + nonTeaching;
    return { total, teaching, nonTeaching };
  }, [teachingStaff, nonTeachingStaff]);

  const title = department?.dept_name ? `${department.dept_name} Dashboard` : 'Head of Department Dashboard';
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    // build doughnut chart showing Assistant / Associate / Professor counts
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');

    const combined = [...teachingStaff, ...nonTeachingStaff];
    let assistant = 0;
    let associate = 0;
    let professor = 0;
    let other = 0;

    combined.forEach((s) => {
      const name = (s.designation_name || '').toLowerCase();
      if (!name) {
        other += 1;
        return;
      }
      if (name.includes('assistant')) {
        assistant += 1;
      } else if (name.includes('associate')) {
        associate += 1;
      } else if (name.includes('professor') || name.includes('prof ' ) || name.includes('prof.')) {
        professor += 1;
      } else {
        other += 1;
      }
    });

    const labels = ['Assistant Professors', 'Associate Professors', 'Professors', 'Other'];
    const data = [assistant, associate, professor, other];

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: ['#10b981', '#60a5fa', '#f97316', '#9ca3af'],
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#374151' } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [teachingStaff, nonTeachingStaff]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SidebarHOD />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Notification show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-slate-600">Overview of staff in your department.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded border border-blue-200 bg-blue-50"><div className="text-sm text-blue-700">Total Employees</div><div className="text-2xl font-bold text-blue-700">{loading ? '—' : stats.total}</div></div>
              <div className="p-4 rounded border border-green-200 bg-green-50"><div className="text-sm text-green-700">Teaching Employees</div><div className="text-2xl font-bold text-green-700">{loading ? '—' : stats.teaching}</div></div>
              <div className="p-4 rounded border border-indigo-200 bg-indigo-50"><div className="text-sm text-indigo-700">Non-Teaching Employees</div><div className="text-2xl font-bold text-indigo-700">{loading ? '—' : stats.nonTeaching}</div></div>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Staff Overview</h3>
                </div>
                <div className="h-72">
                  <canvas ref={chartRef} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
