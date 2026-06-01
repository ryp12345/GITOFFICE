import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Notification from '../../components/common/Notification';
import {
  addTicketReply,
  buildUploadUrl,
  getTicketDetails,
  updateTicketStatus,
} from '../../api/ticketApi';

function getStatusTextClass(status) {
  if (status === 'New') return 'text-red-600';
  if (status === 'Pending') return 'text-amber-600';
  if (status === 'Resolved') return 'text-emerald-600';
  return 'text-slate-700';
}

function getStatusPillClass(status) {
  if (status === 'New') return 'bg-red-100 text-red-700 border-red-200';
  if (status === 'Pending') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'Resolved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function normalizeFiles(fileList) {
  if (!fileList) return [];
  return Array.from(fileList);
}

function normalizeAttachments(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_error) {
      // Keep compatibility with legacy single filename values
    }
    return value.trim() ? [value.trim()] : [];
  }

  return [];
}

function MessageBubble({ item, isReply, onPreview }) {
  const attachments = isReply ? item.postAttachments : item.attachments;
  const bubbleClass = isReply
    ? 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm'
    : 'bg-emerald-100 border border-emerald-200 text-slate-900 rounded-2xl rounded-tr-sm';
  const wrapperClass = isReply ? 'justify-start' : 'justify-end';
  const label = isReply ? 'Issue Title' : 'Issue Raised';

  return (
    <div className={`flex ${wrapperClass}`}>
      <div className={`w-full max-w-2xl p-4 shadow-sm ${bubbleClass}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-xs text-slate-500">{formatDateTime(item.created_at)}</div>
        </div>

        <h3 className="text-base font-semibold">{item.title}</h3>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.description}</div>

        <div className="mt-4">
          {attachments?.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {attachments.map((attachment) => {
                const imageUrl = buildUploadUrl(
                  isReply ? `/uploads/attachment/post_attachment/${attachment}` : `/uploads/attachment/${attachment}`
                );

                return (
                  <button
                    key={`${item.id}-${attachment}`}
                    type="button"
                    onClick={() => onPreview(imageUrl)}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <img src={imageUrl} alt="attachment" className="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    <div className="truncate px-2 py-1 text-left text-[11px] text-slate-500">{attachment}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500">No Image</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TicketDetails({ listPath, canUpdateStatus }) {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('New');
  const [replyForm, setReplyForm] = useState({ title: '', description: '', attachments: [] });
  const [busyAction, setBusyAction] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [previewImage, setPreviewImage] = useState('');

  const canReply = useMemo(() => ticket && ticket.status !== 'Resolved', [ticket]);
  const conversationItems = useMemo(() => {
    if (!ticket) return [];
    return [
      { ...ticket, rowType: 'ticket', rowKey: `ticket-${ticket.id}`, attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [] },
      ...replies.map((reply) => ({ ...reply, rowType: 'reply', rowKey: `reply-${reply.id}` })),
    ];
  }, [ticket, replies]);

  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
  }

  function closeNotification() {
    setNotification({ show: false, message: '', type: 'success' });
  }

  async function loadDetails() {
    setLoading(true);
    setTicket(null);
    setReplies([]);
    try {
      const response = await getTicketDetails(id);
      const payload = response?.data?.data || {};
      const ticketData = payload.ticket || null;
      const replyData = Array.isArray(payload.replies) ? payload.replies : [];

      setTicket(ticketData ? { ...ticketData, attachments: normalizeAttachments(ticketData.attachments) } : null);
      setReplies(
        replyData
          .filter((reply) => Number(reply?.ticket_id) === Number(id))
          .sort((a, b) => {
            const aTime = new Date(a?.created_at || 0).getTime();
            const bTime = new Date(b?.created_at || 0).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return Number(a?.id || 0) - Number(b?.id || 0);
          })
          .map((reply) => ({
            ...reply,
            postAttachments: normalizeAttachments(reply.attachments),
          }))
      );
      setStatus(ticketData?.status || 'New');
    } catch (error) {
      setTicket(null);
      setReplies([]);
      showNotification(error?.response?.data?.message || 'Failed to load ticket details.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [id]);

  async function onReplySubmit(event) {
    event.preventDefault();
    setBusyAction('reply');
    try {
      await addTicketReply(id, replyForm);
      setReplyForm({ title: '', description: '', attachments: [] });
      showNotification('Reply added successfully.');
      await loadDetails();
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to add reply.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function onUpdateStatus() {
    setBusyAction('status');
    try {
      await updateTicketStatus(id, status);
      showNotification('Ticket status updated successfully.');
      await loadDetails();
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to update status.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-teal-50 to-emerald-100">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto min-h-full max-w-6xl rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur sm:p-6">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={closeNotification}
            />

            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <Link
                  to={listPath}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Link>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Ticket Conversation</h1>
                  {/* <p className="text-xs text-slate-500">Modern chat view for ticket updates and replies</p> */}
                </div>
              </div>
              {ticket && (
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusPillClass(ticket.status)}`}>
                  Status: {ticket.status}
                </div>
              )}
            </div>

            {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Loading ticket details...</div>}

            {!loading && !ticket && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Ticket not found.</div>
            )}

            {!loading && ticket && (
              <div className="grid gap-4 lg:grid-cols-3">
                <section className="lg:col-span-2">
                  <div className="rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_right,_#dcfce7,_#ffffff_40%,_#f8fafc_100%)] p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                        TK
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Support Conversation</div>
                        <div className="text-xl text-blue-500">{ticket.title}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {conversationItems.map((item) => (
                        <MessageBubble
                          key={item.rowKey}
                          item={item}
                          isReply={item.rowType === 'reply'}
                          onPreview={setPreviewImage}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  {canUpdateStatus && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                      <h2 className="mb-3 text-sm font-semibold text-slate-800">Update Status</h2>
                      <div className="space-y-3">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          disabled={ticket.status === 'Resolved'}
                        >
                          <option value="New">New</option>
                          <option value="Pending">Pending</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        <button
                          type="button"
                          onClick={onUpdateStatus}
                          disabled={busyAction === 'status' || ticket.status === 'Resolved'}
                          className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                        >
                          {busyAction === 'status' ? 'Updating...' : 'Update Status'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold text-slate-800">Reply Composer</h2>

                    {canReply ? (
                      <form onSubmit={onReplySubmit} className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Issue Title</label>
                          <input
                            type="text"
                            value={replyForm.title}
                            onChange={(e) => setReplyForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</label>
                          <textarea
                            value={replyForm.description}
                            onChange={(e) => setReplyForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={5}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Attachment</label>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) =>
                              setReplyForm((prev) => ({ ...prev, attachments: normalizeFiles(e.target.files) }))
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={busyAction === 'reply'}
                          className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                          {busyAction === 'reply' ? 'Sending...' : 'Send Reply'}
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800">
                        This ticket is resolved. New replies are disabled.
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </main>
      </div>

      {previewImage && (
        <button
          type="button"
          onClick={() => setPreviewImage('')}
          className="fixed inset-0 z-[60] bg-black/70 p-4 flex items-center justify-center"
        >
          <img src={previewImage} alt="preview" className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </div>
  );
}
