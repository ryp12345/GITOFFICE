import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { getUsers } from '../../api/userApi';

const PAGE_SIZE = 10;


export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('DEAN/HOD');

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
    if (tab === 'DEAN/Head of Department') {
      return users.filter((user) => {
        const role = String(user.role || '').toLowerCase();
        return role === 'dean' || role === 'Head of Department';
      });
    } else if (tab === 'Teaching') {
      return users.filter((user) => {
        const role = String(user.role || '').toLowerCase();
        return role === 'teaching';
      });
    } else if (tab === 'Non-Teaching') {
      return users.filter((user) => {
        const role = String(user.role || '').toLowerCase();
        return role === 'non-teaching';
      });
    }
    return users;
  }, [users, tab]);

  // Search filter within tab
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFilteredUsers;
    return tabFilteredUsers.filter((user) => {
      const email = String(user.email || '').toLowerCase();
      const role = String(user.role || '').toLowerCase();
      const status = String(user.status || '').toLowerCase();
      const id = String(user.id || '').toLowerCase();
      return email.includes(q) || role.includes(q) || status.includes(q) || id.includes(q);
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Users</h1>
              <p className="mt-1 text-slate-600">View and search all registered users.</p>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2">
              {['DEAN/HOD', 'Teaching', 'Non-Teaching'].map((t) => (
                <button
                  key={t}
                  className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors duration-150 ${
                    tab === t
                      ? 'border-blue-600 bg-white text-blue-700'
                      : 'border-transparent bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                  onClick={() => { setTab(t); setPage(1); }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mb-4 max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, role, status or ID"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">S.No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">User ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Staff Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading users...</td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">No users found.</td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user, index) => {
                        const isActive = String(user.status || '').toLowerCase() === 'active';
                        const staffNameRaw = [user.fname, user.mname, user.lname].filter(Boolean).join(' ');
                        const staffName = staffNameRaw && staffNameRaw.trim() ? staffNameRaw : '--NA--';
                        return (
                          <tr key={user.id || `${user.email}-${index}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-700">{(page - 1) * PAGE_SIZE + index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{user.id || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{user.email || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{staffName}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{user.department_name && user.department_name.trim() ? user.department_name : '--NA--'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{user.role || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {user.status || 'Unknown'}
                              </span>
                            </td>
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
