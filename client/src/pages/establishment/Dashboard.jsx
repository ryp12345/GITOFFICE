
import { useEffect, useState } from 'react';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../api/axios';
import { getDepartments } from '../../api/departmentApi';
import { getDesignations } from '../../api/designationApi';
import { getInstitutions } from '../../api/institutionApi';


export default function EstablishmentDashboard() {
  const [stats, setStats] = useState({
    staff: null,
    departments: null,
    designations: null,
    institutions: null,
    teaching: null,
    nonTeaching: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Staff
        const staffRes = await api.get('/staff');
        const staffArr = Array.isArray(staffRes?.data?.data) ? staffRes.data.data : [];
        const staffCount = staffArr.length;
        const normalizeType = (val) => {
          if (!val) return '';
          return String(val).toLowerCase().replace(/\s|_/g, '');
        };
        const teachingCount = staffArr.filter((s) => {
          const type = normalizeType(s.employee_type || s.emp_type || s.emp_type_name);
          return (
            type === 'teaching' ||
            type === 'teachingstaff' ||
            type === 'teacher' // add more variants if needed
          );
        }).length;
        const nonTeachingCount = staffArr.filter((s) => {
          const type = normalizeType(s.employee_type || s.emp_type || s.emp_type_name);
          return (
            type === 'nonteaching' ||
            type === 'nonteachingstaff' ||
            type === 'non-teaching' ||
            type === 'non-teachingstaff' // add more variants if needed
          );
        }).length;

        // Departments
        const deptRes = await getDepartments();
        const deptCount = Array.isArray(deptRes?.data?.data) ? deptRes.data.data.length : 0;

        // Designations
        const desigRes = await getDesignations();
        const desigCount = Array.isArray(desigRes?.data?.data) ? desigRes.data.data.length : 0;

        // Institutions
        const instRes = await getInstitutions();
        const instCount = Array.isArray(instRes?.data?.data) ? instRes.data.data.length : 0;

        setStats({
          staff: staffCount,
          departments: deptCount,
          designations: desigCount,
          institutions: instCount,
          teaching: teachingCount,
          nonTeaching: nonTeachingCount,
        });
      } catch (err) {
        setStats({ staff: 0, departments: 0, designations: 0, institutions: 0, teaching: 0, nonTeaching: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Establishment Dashboard</h2>
            {/* Statistics Cards */}
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 shadow flex flex-col items-center border border-blue-200">
                <span className="text-3xl font-bold text-blue-700">{loading || stats.staff === null ? '...' : stats.staff}</span>
                <span className="mt-2 text-blue-900">Total Staff</span>
              </div>
              <div className="rounded-lg bg-green-50 p-4 shadow flex flex-col items-center border border-green-200">
                <span className="text-3xl font-bold text-green-700">{loading || stats.departments === null ? '...' : stats.departments}</span>
                <span className="mt-2 text-green-900">Departments</span>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4 shadow flex flex-col items-center border border-yellow-200">
                <span className="text-3xl font-bold text-yellow-700">{loading || stats.designations === null ? '...' : stats.designations}</span>
                <span className="mt-2 text-yellow-900">Designations</span>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 shadow flex flex-col items-center border border-purple-200">
                <span className="text-3xl font-bold text-purple-700">{loading || stats.institutions === null ? '...' : stats.institutions}</span>
                <span className="mt-2 text-purple-900">Institutions</span>
              </div>
            </div>

            {/* Additional Statistics Cards */}
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 shadow flex flex-col items-center border border-blue-200">
                <span className="text-3xl font-bold text-blue-700">{loading || stats.teaching === null ? '...' : stats.teaching}</span>
                <span className="mt-2 text-blue-900">Teaching Staff</span>
              </div>
              <div className="rounded-lg bg-green-50 p-4 shadow flex flex-col items-center border border-green-200">
                <span className="text-3xl font-bold text-green-700">{loading || stats.nonTeaching === null ? '...' : stats.nonTeaching}</span>
                <span className="mt-2 text-green-900">Non-Teaching Staff</span>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4 shadow flex flex-col items-center border border-yellow-200 min-h-[92px]">
                <span className="text-3xl font-bold text-yellow-700">-</span>
                <span className="mt-2 text-yellow-900">(Empty)</span>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 shadow flex flex-col items-center border border-purple-200 min-h-[92px]">
                <span className="text-3xl font-bold text-purple-700">-</span>
                <span className="mt-2 text-purple-900">(Empty)</span>
              </div>
            </div>

            {/* Quick Access Section */}
            <div className="mt-10">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Quick Access</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                <a href="/staff" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Manage Staff
                </a>
                <a href="/departments" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Departments
                </a>
                <a href="/designations" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Designations
                </a>
                <a href="/institutions" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Institutions
                </a>
                <a href="/establishment/remuneration-heads" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Remuneration Heads
                </a>
                <a href="/qualifications" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Qualifications
                </a>
                <a href="/leave-management/leaves" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Leaves
                </a>
                <a href="/leave-management/holiday-rh" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center shadow transition">
                  Holiday RH
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
