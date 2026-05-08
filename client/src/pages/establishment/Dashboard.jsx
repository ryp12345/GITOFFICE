
import { useEffect, useState, useMemo } from 'react';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import api from '../../api/axios';
import { getDepartments } from '../../api/departmentApi';
import { getDesignations } from '../../api/designationApi';
import { getInstitutions } from '../../api/institutionApi';
import { getAssociations } from '../../api/associationApi';
import { getQualifications } from '../../api/qualificationApi';

export default function EstablishmentDashboard() {
  const [stats, setStats] = useState({
    staff: null,
    departments: null,
    designations: null,
    institutions: null,
    teaching: null,
    nonTeaching: null,
    associations: null,
    qualifications: null,
  });
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [selectedPunches, setSelectedPunches] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    async function fetchStats() {
      try {
        // Staff
        const staffRes = await api.get('/staff');
        const staffArr = Array.isArray(staffRes?.data?.data) ? staffRes.data.data : [];
        setStaffList(staffArr);
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

        // Associations
        let associationCount = 0;
        try {
          const assocRes = await getAssociations();
          associationCount = Array.isArray(assocRes?.data?.data) ? assocRes.data.data.length : 0;
        } catch (e) {
          associationCount = 0;
        }

        // Qualifications
        let qualificationCount = 0;
        try {
          const qualRes = await getQualifications();
          qualificationCount = Array.isArray(qualRes?.data?.data) ? qualRes.data.data.length : 0;
        } catch (e) {
          qualificationCount = 0;
        }

        setStats({
          staff: staffCount,
          departments: deptCount,
          designations: desigCount,
          institutions: instCount,
          teaching: teachingCount,
          nonTeaching: nonTeachingCount,
          associations: associationCount,
          qualifications: qualificationCount,
        });
      } catch (err) {
        setStats({ staff: 0, departments: 0, designations: 0, institutions: 0, teaching: 0, nonTeaching: 0, associations: 0, qualifications: 0 });
      } finally {
        setLoading(false);
      }
    }
    // fetch attendance (separate request)
    async function fetchAttendance() {
      try {
        setAttendanceLoading(true);
        const res = await api.get('/biometric/daily');

        // Normalize backend shapes: either an array, or an object with combinedData + entry_exit
        const payload = res?.data || {};

        if (payload.combinedData && payload.entry_exit) {
          const combined = Array.isArray(payload.combinedData) ? payload.combinedData : [];
          const entryExit = payload.entry_exit || {};
          const rows = combined.map((d) => {
            const code = d.EmployeeCode || d.employeeCode || (d.EmployeeCode ? String(d.EmployeeCode) : null);
            const base = {
              ...d,
              EmployeeCode: code,
              entryLogs: entryExit.entryLogs && code ? entryExit.entryLogs[code] ?? null : null,
              exitLogs: entryExit.exitLogs && code ? entryExit.exitLogs[code] ?? null : null,
              employeePunchLogs: entryExit.employeePunchLogs && code ? (entryExit.employeePunchLogs[code] ?? []) : (d.employeePunchLogs || []),
              punchCounts: entryExit.punchCounts && code ? (entryExit.punchCounts[code] ?? (d.punchCounts || d.punchCount || null)) : (d.punchCounts || d.punchCount || null),
              durations: entryExit.durations && code ? (entryExit.durations[code] ?? d.durations ?? d.duration ?? null) : (d.durations || d.duration || null),
            };

            // Enrich with staff data (department, id) when available
            if (Array.isArray(staffList) && staffList.length > 0) {
              const matched = staffList.find(s => String(s.EmployeeCode || s.employeecode || s.employeecode) === String(code) || String(s.employeecode || s.EmployeeCode || s.employeecode) === String(code));
              if (matched) {
                // Prefer department from pivot `departments` if present
                if (!base.DepartmentName && Array.isArray(matched.departments) && matched.departments.length > 0) {
                  const dept = matched.departments[0];
                  base.DepartmentName = dept.dept_shortname || dept.dept_name || base.DepartmentName;
                } else {
                  base.DepartmentName = base.DepartmentName || matched.department_name || matched.dept_shortname || matched.department || base.DepartmentName;
                }
                base.id = base.id || matched.id || null;
                base.EmployeeName = base.EmployeeName || `${matched.fname || ''} ${matched.mname || ''} ${matched.lname || ''}`.trim() || matched.full_name || matched.name || base.EmployeeName;
              }
            }

            return base;
          });
          setAttendance(rows);
        } else {
          const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
          setAttendance(rows);
        }
      } catch (e) {
        setAttendance([]);
      } finally {
        setAttendanceLoading(false);
      }
    }

    // Ensure stats (staffList) load before fetching attendance so we can enrich department
    (async () => {
      await fetchStats();
      await fetchAttendance();
    })();
  }, []);

  const filteredAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendance;
    return attendance.filter(r => (
      (r.EmployeeName || r.full_name || r.employeeName || r.EmployeeCode || '').toString().toLowerCase().includes(q) ||
      (r.DepartmentName || r.department || '').toString().toLowerCase().includes(q) ||
      (r.EmployeeCode || '').toString().toLowerCase().includes(q)
    ));
  }, [attendance, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAttendance.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedAttendance = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAttendance.slice(start, start + PAGE_SIZE);
  }, [filteredAttendance, page]);

  const formatDateTime = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 -> 12
    return `${hours}:${minutes} ${ampm}`;
  };

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
                <span className="text-3xl font-bold text-yellow-700">{loading || stats.associations === null ? '...' : stats.associations}</span>
                <span className="mt-2 text-yellow-900">Associations</span>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 shadow flex flex-col items-center border border-purple-200 min-h-[92px]">
                <span className="text-3xl font-bold text-purple-700">{loading || stats.qualifications === null ? '...' : stats.qualifications}</span>
                <span className="mt-2 text-purple-900">Qualifications</span>
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
                {/* Remuneration Heads link removed */}
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
            {/* DO HERE Daily Employee Attendance CONTENT */}
            <div className="mt-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 mb-4">
                  <div className="col-span-1">
                    <div className="relative w-full sm:w-72">
                      <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search attendance..." className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <h3 className="text-xl font-semibold text-slate-800">Daily Employee Attendance</h3>
                  </div>
                  <div className="col-span-1" />
                </div>
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                        <tr className="text-left text-xs font-semibold text-slate-600 border-b">
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Sl.No</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PunchIn</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">DeviceIn</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">PunchOut</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">DeviceOut</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">No.of.Punches</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                    {attendanceLoading ? (
                        <tr>
                        <td colSpan={10} className="p-6 text-center">Loading...</td>
                        </tr>
                    ) : attendance.length === 0 ? (
                        <tr>
                        <td colSpan={10} className="p-6 text-center">No attendance data available</td>
                        </tr>
                    ) : (
                      paginatedAttendance.map((row, idx) => {
                        const entry = row.entryLogs || row.entryLog || row.entry || row.entryLogs?.[row.EmployeeCode] || null;
                        const exit = row.exitLogs || row.exitLog || row.exit || null;
                        const punches = row.employeePunchLogs || row.punches || row.punches_list || [];
                        return (
                            <tr key={idx} className="border-b last:border-0">
                            <td className="px-3 py-2 align-middle">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="px-3 py-2 align-middle">
                                <div className="flex items-center gap-3">
                                {/* <div className="w-8 h-8 bg-slate-100 rounded" /> */}
                                <span>{row.EmployeeName || row.employeeName || row.name || row.full_name || row.EmployeeCode}</span>
                                </div>
                            </td>
                            <td className="px-3 py-2 align-middle">{row.DepartmentName || row.department || ''}</td>
                            <td className="px-3 py-2 align-middle text-green-600">{formatDateTime(entry?.LogDate_Time || entry?.LogDate || entry?.logDate || '')}</td>
                            <td className="px-3 py-2 align-middle">{entry?.DeviceFName || entry?.DeviceName || ''}</td>
                            <td className="px-3 py-2 align-middle text-red-600">{formatDateTime(exit?.LogDate_Time || exit?.LogDate || '')}</td>
                            <td className="px-3 py-2 align-middle">{exit?.DeviceFName || exit?.DeviceName || ''}</td>
                            <td className="px-3 py-2 align-middle">{row.punchCounts || row.punchCount || row.punch_count || (Array.isArray(punches) ? punches.length : '')}</td>
                            <td className="px-3 py-2 align-middle">{row.durations || row.duration || ''}</td>
                            <td className="px-3 py-2 align-middle">
                                <button
                                onClick={() => setSelectedPunches({ punches, employee: row.EmployeeName || row.full_name || row.employeeName || row.EmployeeCode })}
                                className="p-2 text-blue-600 transition-colors duration-200 bg-white rounded-lg hover:bg-blue-100 border border-blue-300"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                </button>
                            </td>
                            </tr>
                        );
                        })
                    )}
                    </tbody>
                </table>
                </div>

                {/* Pagination Controls */}
                {filteredAttendance.length > PAGE_SIZE && (
                  <div className="flex justify-end items-center gap-2 mt-4">
                    <button
                      className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                    <button
                      className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Modal for punches */}
                {selectedPunches && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Log Details - <span className="text-blue-600 font-semibold">{selectedPunches.employee}</span></h4>
                      <button onClick={() => setSelectedPunches(null)} className="text-slate-600">Close</button>
                    </div>
                    <div className="overflow-auto max-h-80">
                       <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-600">
                            <tr className="text-left text-xs font-semibold text-slate-600 border-b">
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Time</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Log Device</th>
                            </tr>
                        </thead>
                        <tbody>
                      {Array.isArray(selectedPunches.punches) && selectedPunches.punches.length > 0 ? (
                      selectedPunches.punches.map((p, i) => (
                        <tr key={i} className="border-b">
                        <td className="px-3 py-2">{formatDateTime(p.LogDate || p.LogDate_Time || p.LogDateTime || p.logDate || p.LogDate_String)}</td>
                        <td className="px-3 py-2">{p.DeviceFName || p.DeviceName || p.DeviceF || ''}</td>
                        </tr>
                      ))
                      ) : (
                      <tr>
                        <td colSpan={2} className="p-4 text-center">No punch records available</td>
                      </tr>
                      )}
                    </tbody>
                        </table>
                    </div>
                    </div>
                </div>
                )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
