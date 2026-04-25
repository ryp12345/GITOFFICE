import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { getUsers } from '../../api/userApi';

const PAGE_SIZE = 10;
const USER_TABS = [
  { key: 'allUsers', label: 'All USER' },
  { key: 'hodDean', label: 'HoD / DEAN' },
  { key: 'teaching', label: 'Teaching' },
  { key: 'nonTeaching', label: 'Non-Teaching' },
];

const normalizeRole = (value) => String(value || '').trim().toLowerCase();

const isDeanOrHod = (role) => {
  const normalized = normalizeRole(role);
  return normalized.includes('dean') || normalized.includes('head of department') || normalized === 'hod';
};

const isTeaching = (role) => {
  const normalized = normalizeRole(role).replace(/[-_\s]+/g, '');
  return normalized === 'teaching';
};

const isNonTeaching = (role) => {
  const normalized = normalizeRole(role).replace(/[-_\s]+/g, '');
  return normalized === 'nonteaching';
};

const getStaffName = (user) => {
  const name = [user?.fname, user?.mname, user?.lname].filter(Boolean).join(' ').trim();
  return name || 'N/A';
};

const getDepartments = (user) => {
  if (Array.isArray(user?.departments) && user.departments.length > 0) {
    return user.departments
      .map((department) => department?.dept_name || department?.department_name || department)
      .filter(Boolean);
  }

  if (Array.isArray(user?.activedepartments) && user.activedepartments.length > 0) {
    return user.activedepartments
      .map((department) => department?.dept_name || department?.department_name || department)
      .filter(Boolean);
  }

  if (user?.department_name && String(user.department_name).trim()) {
    return [user.department_name.trim()];
  }

  if (user?.dept_name && String(user.dept_name).trim()) {
    return [user.dept_name.trim()];
  }

  return [];
};


export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(USER_TABS[0].key);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await getUsers();
        const data = response?.data?.data || response?.data || [];
        setUsers(Array.isArray(data) ? data : []);
      } catch (_error) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);


  // Filter users by tab
  const tabFilteredUsers = useMemo(() => {
    if (tab === 'allUsers') {
      return users;
    }

    if (tab === 'hodDean') {
      return users.filter((user) => isDeanOrHod(user.role));
    }

    if (tab === 'teaching') {
      return users.filter((user) => isTeaching(user.role));
    }

    if (tab === 'nonTeaching') {
      return users.filter((user) => isNonTeaching(user.role));
    }

    return [];
  }, [users, tab]);

  // Search filter within tab
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFilteredUsers;
    return tabFilteredUsers.filter((user) => {
      const email = String(user.email || '').toLowerCase();
      const role = String(user.role || '').toLowerCase();
      const staffName = getStaffName(user).toLowerCase();
      const departments = getDepartments(user).join(' ').toLowerCase();
      return email.includes(q) || role.includes(q) || staffName.includes(q) || departments.includes(q);
    });
  }, [tabFilteredUsers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-center justify-center">
              <h1 className="text-3xl font-bold text-slate-900">Users</h1>
              <p className="mt-1 text-slate-600">Browse users by HoD / DEAN, Teaching, and Non-Teaching</p>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {USER_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                    tab === item.key
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : item.key === 'teaching'
                        ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        : item.key === 'nonTeaching'
                          ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-blue-300 bg-white text-blue-700 hover:bg-blue-50'
                  }`}
                  onClick={() => { setTab(item.key); setPage(1); }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mb-4 max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, name, department or role"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">S.No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading users...</td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No users found.</td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user, index) => {
                        const departments = getDepartments(user);
                        return (
                          <tr key={user.id || `${user.email}-${index}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-700">{(page - 1) * PAGE_SIZE + index + 1}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {user.email ? (
                                <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-700 hover:underline">
                                  {user.email}
                                </a>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">{getStaffName(user)}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {departments.length > 0 ? (
                                <ul className="space-y-1">
                                  {departments.map((department, departmentIndex) => (
                                    <li key={`${user.id || user.email || index}-${department}-${departmentIndex}`}>{department}</li>
                                  ))}
                                </ul>
                              ) : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">{user.role || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && filteredUsers.length > PAGE_SIZE && (
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
