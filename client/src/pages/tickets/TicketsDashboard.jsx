import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import { useAuth } from '../../context/AuthContext';
import { isRoleMatch, ROLE_SUPER_ADMIN } from '../../utils/role';
import {
  createTicket,
  deleteTicket,
  getTicketDashboard,
  updateTicket,
} from '../../api/ticketApi';

function getStatusBadgeClass(status) {
  if (status === 'New') return 'bg-red-100 text-red-700';
  if (status === 'Pending') return 'bg-amber-100 text-amber-700';
  if (status === 'Resolved') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
}

function normalizeFiles(fileList) {
  if (!fileList) return [];
  return Array.from(fileList);
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatRaisedDate(value) {
  if (!value) return '--NA--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--NA--';

  return date.toLocaleDateString();
}

export default function TicketsDashboard({ detailBasePath, canManageTickets }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ new_count: 0, pending_count: 0, resolved_count: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', attachments: [] });
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', attachments: [] });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [busyAction, setBusyAction] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const totalCount =
    Number(counts?.new_count || 0) + Number(counts?.pending_count || 0) + Number(counts?.resolved_count || 0);
  const showStaffNameColumn = isRoleMatch(user?.role, ROLE_SUPER_ADMIN);
  const tableColSpan = 6 + (showStaffNameColumn ? 1 : 0);

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return Number(b?.id || 0) - Number(a?.id || 0);
    }),
    [tickets]
  );

  const filteredTickets = useMemo(
    () => {
      const q = search.toLowerCase();
      return sortedTickets.filter((ticket) => {
        const title = String(ticket.title || '').toLowerCase();
        const status = String(ticket.status || '').toLowerCase();
        const staffName = String(ticket.staff_name || ticket.email || '').toLowerCase();
        const raisedDate = formatRaisedDate(ticket.created_at).toLowerCase();
        return title.includes(q) || status.includes(q) || staffName.includes(q) || raisedDate.includes(q);
      });
    },
    [sortedTickets, search]
  );

  const paginatedTickets = useMemo(
    () => {
      const start = (page - 1) * PAGE_SIZE;
      return filteredTickets.slice(start, start + PAGE_SIZE);
    },
    [filteredTickets, page]
  );

  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
  }

  function closeNotification() {
    setNotification({ show: false, message: '', type: 'success' });
  }

  async function loadDashboard() {
    setLoading(true);
    try {
      const response = await getTicketDashboard();
      const data = response?.data?.data || {};
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setCounts(data.counts || { new_count: 0, pending_count: 0, resolved_count: 0 });
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to load tickets.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [search, tickets]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function onCreateSubmit(event) {
    event.preventDefault();
    setBusyAction('create');
    try {
      await createTicket(createForm);
      setCreateForm({ title: '', description: '', attachments: [] });
      setShowCreate(false);
      showNotification('Ticket added successfully.');
      await loadDashboard();
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to create ticket.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  function startEdit(ticket) {
    setEditingTicketId(ticket.id);
    setEditForm({
      title: ticket.title || '',
      description: ticket.description || '',
      attachments: [],
    });
  }

  function cancelEdit() {
    setEditingTicketId(null);
    setEditForm({ title: '', description: '', attachments: [] });
  }

  async function onEditSubmit(event) {
    event.preventDefault();
    if (!editingTicketId) return;

    setBusyAction(`edit:${editingTicketId}`);
    try {
      await updateTicket(editingTicketId, editForm);
      showNotification('Ticket updated successfully.');
      cancelEdit();
      await loadDashboard();
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to update ticket.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function onDelete(ticket) {
    const confirmed = window.confirm('Are you sure you want to delete this ticket?');
    if (!confirmed) return;

    setBusyAction(`delete:${ticket.id}`);
    try {
      await deleteTicket(ticket.id);
      showNotification('Ticket deleted successfully.');
      await loadDashboard();
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to delete ticket.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto min-h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={closeNotification}
            />
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Ticket Dashboard</h1>
                <p className="mt-2 text-slate-600">Raise, track, and manage support tickets.</p>
              </div>
              {canManageTickets && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
                >
                  Raise Ticket
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow">
                <div className="text-sm font-semibold text-red-800">Ticket New</div>
                <div className="mt-1 text-3xl font-bold text-red-900">{counts.new_count || 0}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow">
                <div className="text-sm font-semibold text-amber-800">Ticket Pending</div>
                <div className="mt-1 text-3xl font-bold text-amber-900">{counts.pending_count || 0}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow">
                <div className="text-sm font-semibold text-emerald-800">Ticket Resolved</div>
                <div className="mt-1 text-3xl font-bold text-emerald-900">{counts.resolved_count || 0}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow">
                <div className="text-sm font-semibold text-blue-800">Total Tickets</div>
                <div className="mt-1 text-3xl font-bold text-blue-900">{totalCount}</div>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
              </div>
              <div className="flex flex-col items-start justify-between gap-4 mb-6 px-4 py-4 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">SL.No</th>
                      {showStaffNameColumn && (
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Staff Name</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Issue Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Raised Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Attachment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Ticket Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading && (
                      <tr>
                        <td colSpan={tableColSpan} className="px-4 py-6 text-center text-slate-500">
                          Loading tickets...
                        </td>
                      </tr>
                    )}

                    {!loading && filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan={tableColSpan} className="px-4 py-6 text-center text-slate-500">
                          No tickets found.
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      paginatedTickets.map((ticket, index) => {
                        const isEditing = editingTicketId === ticket.id;
                        const canEditDelete = canManageTickets && ticket.status !== 'Resolved';

                        return (
                          <tr key={ticket.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 align-top text-sm text-slate-700">{(page - 1) * PAGE_SIZE + index + 1}</td>
                            {showStaffNameColumn && (
                              <td className="px-4 py-3 align-top text-sm text-slate-700">
                                <div className="font-medium text-slate-900">{ticket.staff_name || ticket.email || '--NA--'}</div>
                              </td>
                            )}
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              <div>{ticket.title}</div>
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              {formatRaisedDate(ticket.created_at)}
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              {ticket.attachments?.length ? pluralize(ticket.attachments.length, 'file', 'files') : '--NA--'}
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top text-sm text-slate-700">
                              {!isEditing && (
                                <div className="flex flex-wrap gap-2">
                                  <Link
                                    to={`${detailBasePath}/${ticket.id}`}
                                    className="p-2 text-blue-600 transition-colors duration-200 bg-white rounded-lg hover:bg-blue-100 border border-blue-300"
                                    title="View"
                                    aria-label="View"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </Link>
                                  {canEditDelete && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEdit(ticket)}
                                        className="inline-flex items-center justify-center w-8 h-8 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                        title="Edit"
                                        aria-label="Edit"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busyAction === `delete:${ticket.id}`}
                                        onClick={() => onDelete(ticket)}
                                        className="inline-flex items-center justify-center w-8 h-8 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
                                        title="Delete"
                                        aria-label="Delete"
                                      >
                                        {busyAction === `delete:${ticket.id}` ? (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                            <path d="M7 4V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V4H22V6H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V6H2V4H7ZM6 6V20H18V6H6ZM9 9H11V17H9V9ZM13 9H15V17H13V9ZM9 4H15V3H9V4Z" />
                                          </svg>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {filteredTickets.length > PAGE_SIZE && (
                <div className="flex justify-end items-center gap-2 px-6 pb-6">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {Math.ceil(filteredTickets.length / PAGE_SIZE)}
                  </span>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(Math.ceil(filteredTickets.length / PAGE_SIZE), p + 1))}
                    disabled={page === Math.ceil(filteredTickets.length / PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {showCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                  <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Raise New Ticket</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Close
                    </button>
                  </div>

                  <form onSubmit={onCreateSubmit} className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Issue Title</label>
                      <input
                        type="text"
                        value={createForm.title}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                      <textarea
                        value={createForm.description}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                        rows={5}
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Attachment</label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, attachments: normalizeFiles(e.target.files) }))}
                        className="w-full rounded border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={busyAction === 'create'}
                        className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busyAction === 'create' ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingTicketId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                  <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Edit Ticket</h3>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Close
                    </button>
                  </div>

                  <form onSubmit={onEditSubmit} className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Issue Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        rows={5}
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Attachment</label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setEditForm((prev) => ({ ...prev, attachments: normalizeFiles(e.target.files) }))}
                        className="w-full rounded border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={busyAction === `edit:${editingTicketId}`}
                        className="rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busyAction === `edit:${editingTicketId}` ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
