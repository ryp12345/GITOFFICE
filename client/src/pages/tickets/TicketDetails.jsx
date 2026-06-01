import { useEffect, useMemo, useState, useRef } from 'react';
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

import { useAuth } from '../../context/AuthContext';

// ========== Helper Functions ==========
function getStatusConfig(status) {
  const configs = {
    'New': { label: 'New', color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🔴' },
    'Pending': { label: 'Pending', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🟡' },
    'Resolved': { label: 'Resolved', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✅' },
    'Closed': { label: 'Closed', color: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '🔒' }
  };
  return configs[status] || configs['New'];
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
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
    } catch (_error) {}
    return value.trim() ? [value.trim()] : [];
  }
  return [];
}

// ========== AttachmentGallery (unchanged) ==========
function AttachmentGallery({ attachments, isReply, itemId, onPreview }) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment, idx) => {
          const imageUrl = buildUploadUrl(
            isReply ? `/uploads/attachment/post_attachment/${attachment}` : `/uploads/attachment/${attachment}`
          );
          return (
            <button
              key={`${itemId}-${idx}-${attachment}`}
              onClick={() => onPreview(imageUrl)}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:shadow-md"
            >
              <img
                src={imageUrl}
                alt={`attachment-${idx}`}
                className="h-16 w-16 object-cover transition-transform duration-200 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ========== MessageBubble – now uses isCurrentUser and displayName ==========
function MessageBubble({ message, isReply, displayName, isCurrentUser, onPreview }) {
  const statusConfig = getStatusConfig(message.status);
  const isTicket = !isReply;

  // Avatar letter: Y for "You", C for Customer, S for Support
  let avatarLetter = '?';
  if (isCurrentUser) {
    avatarLetter = 'Y';
  } else {
    avatarLetter = isReply ? 'S' : 'C';
  }

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
        {/* Sender Info */}
        <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            isCurrentUser ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {avatarLetter}
          </div>
          <span className="text-xs font-medium text-gray-600">
            {displayName}
          </span>
          <span className="text-xs text-gray-400">{formatDateTime(message.created_at)}</span>
        </div>

        {/* Message Card */}
        <div className={`rounded-2xl p-4 shadow-sm ${
          isCurrentUser
            ? 'bg-emerald-500 text-white'
            : 'bg-white border border-gray-200'
        }`}>
          <h3 className={`font-semibold mb-2 ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
            {message.title}
          </h3>
          <p className={`text-sm whitespace-pre-wrap ${isCurrentUser ? 'text-emerald-50' : 'text-gray-600'}`}>
            {message.description}
          </p>

          <AttachmentGallery
            attachments={isReply ? message.postAttachments : message.attachments}
            isReply={isReply}
            itemId={message.id}
            onPreview={onPreview}
          />

          {isTicket && message.status && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{
                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#f3f4f6'
              }}>
                <span>{statusConfig.icon}</span>
                <span>Status: {message.status}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== StatusUpdateCard (unchanged) ==========
function StatusUpdateCard({ currentStatus, onUpdate, isUpdating, isDisabled }) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🏷️</span>
        <h3 className="font-semibold text-gray-900">Update Ticket Status</h3>
      </div>

      <div className="space-y-3">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          disabled={isDisabled}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="New">New</option>
          <option value="Pending">Pending</option>
          <option value="Resolved">Resolved</option>
          {/* <option value="Closed">Closed</option> */}
        </select>

        <button
          onClick={() => onUpdate(selectedStatus)}
          disabled={isUpdating || isDisabled || selectedStatus === currentStatus}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {isUpdating ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </>
          ) : (
            <>
              <span>🔄</span>
              Update Status
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ========== ReplyComposer (unchanged) ==========
function ReplyComposer({ onSubmit, isSubmitting, isDisabled }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attachments: []
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;
    onSubmit(formData);
    setFormData({ title: '', description: '', attachments: [] });
  };

  const handleFileSelect = (files) => {
    setFormData(prev => ({ ...prev, attachments: normalizeFiles(files) }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      handleFileSelect(files);
    }
  };

  if (isDisabled) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-gray-600 font-medium">This ticket is resolved</p>
        <p className="text-sm text-gray-500 mt-1">New replies are disabled for resolved tickets</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="What's this reply about?"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          placeholder="Write your reply here..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Attachments
        </label>
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
            dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {formData.attachments.length === 0 ? (
            <div>
              <div className="text-3xl mb-2">📎</div>
              <p className="text-sm text-gray-600">Drag & drop images here or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                browse files
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formData.attachments.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`preview-${idx}`}
                    className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 transition-colors"
              >
                <span className="text-2xl text-gray-400">+</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </>
        ) : (
          <>
            <span>✉️</span>
            Send Reply
          </>
        )}
      </button>
    </form>
  );
}

// ========== MAIN COMPONENT ==========
export default function TicketDetails({ listPath, canUpdateStatus }) {
  const { id } = useParams();
  const { user } = useAuth(); // get current logged-in user
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [previewImage, setPreviewImage] = useState('');
  const messagesEndRef = useRef(null);

  const canReply = useMemo(() => ticket && ticket.status !== 'Resolved' && ticket.status !== 'Closed', [ticket]);

  // Build raw conversation items (without display logic)
  const conversationItems = useMemo(() => {
    if (!ticket) return [];
    return [
      {
        ...ticket,
        rowType: 'ticket',
        rowKey: `ticket-${ticket.id}`,
        attachments: normalizeAttachments(ticket.attachments),
        userId: ticket.user_id || ticket.created_by, // ensure your API returns this
      },
      ...replies.map((reply) => ({
        ...reply,
        rowType: 'reply',
        rowKey: `reply-${reply.id}`,
        postAttachments: normalizeAttachments(reply.attachments),
        userId: reply.user_id,
      })),
    ];
  }, [ticket, replies]);

  // Enrich each item with displayName and isCurrentUser flag
  const enrichedConversation = useMemo(() => {
    return conversationItems.map((item) => {
      const isCurrentUserAuthor = item.userId === user?.id;
      let displayName = '';

      if (isCurrentUserAuthor) {
        displayName = 'You';
      } else {
        if (item.rowType === 'ticket') {
          // Use actual customer name if available, otherwise fallback
          displayName = ticket?.customer_name || 'Customer';
        } else {
          displayName = 'Support Team';
        }
      }

      return {
        ...item,
        isCurrentUserAuthor,
        displayName,
      };
    });
  }, [conversationItems, user, ticket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [enrichedConversation]);

  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
  }

  async function loadDetails() {
    setLoading(true);
    try {
      const response = await getTicketDetails(id);
      const payload = response?.data?.data || {};
      const ticketData = payload.ticket || null;
      const replyData = Array.isArray(payload.replies) ? payload.replies : [];

      setTicket(ticketData ? { ...ticketData, attachments: normalizeAttachments(ticketData.attachments) } : null);
      setReplies(
        replyData
          .filter((reply) => Number(reply?.ticket_id) === Number(id))
          .sort((a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0))
          .map((reply) => ({
            ...reply,
            attachments: normalizeAttachments(reply.attachments),
          }))
      );
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to load ticket details.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [id]);

  async function onReplySubmit(formData) {
    setBusyAction('reply');
    try {
      await addTicketReply(id, formData);
      showNotification('Reply added successfully! 🎉');
      await loadDetails();
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to add reply.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  async function onUpdateStatus(newStatus) {
    setBusyAction('status');
    try {
      await updateTicketStatus(id, newStatus);
      showNotification(`Ticket status updated to ${newStatus}! ✨`);
      await loadDetails();
    } catch (error) {
      showNotification(error?.response?.data?.message || 'Failed to update status.', 'error');
    } finally {
      setBusyAction('');
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-teal-50 to-emerald-100">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-7xl">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center justify-center space-x-3">
                  <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-600">Loading ticket details...</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Not found state
  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-teal-50 to-emerald-100">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-7xl">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ticket Not Found</h2>
                <p className="text-gray-600 mb-6">The ticket you're looking for doesn't exist or you don't have access.</p>
                <Link to={listPath} className="inline-flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition">
                  <span>←</span>
                  Back to Tickets
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-teal-50 to-emerald-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ show: false, message: '', type: 'success' })}
            />

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Link
                    to={listPath}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <span>←</span>
                    Back to Tickets
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                        <span>{statusConfig.icon}</span>
                        <span>{statusConfig.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Chat Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-emerald-500 font-bold">
                        💬
                      </div>
                      <div>
                        <h2 className="text-white font-semibold">Conversation</h2>
                        <p className="text-emerald-100 text-sm">
                          {enrichedConversation.length} {enrichedConversation.length === 1 ? 'message' : 'messages'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[500px] overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
                    {enrichedConversation.map((item) => (
                      <MessageBubble
                        key={item.rowKey}
                        message={item}
                        isReply={item.rowType === 'reply'}
                        displayName={item.displayName}
                        isCurrentUser={item.isCurrentUserAuthor}
                        onPreview={setPreviewImage}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Status Update Card */}
                {canUpdateStatus && (
                  <StatusUpdateCard
                    currentStatus={ticket.status}
                    onUpdate={onUpdateStatus}
                    isUpdating={busyAction === 'status'}
                    isDisabled={ticket.status === 'Resolved' || ticket.status === 'Closed'}
                  />
                )}

                {/* Reply Composer */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-emerald-500">
                        ✏️
                      </div>
                      <h3 className="text-white font-semibold">Reply to Ticket</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <ReplyComposer
                      onSubmit={onReplySubmit}
                      isSubmitting={busyAction === 'reply'}
                      isDisabled={!canReply}
                    />
                  </div>
                </div>

                {/* Ticket Info Card - you can add extra details here if needed */}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage('')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <div className="relative max-w-4xl max-h-full">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-lg" />
            <button
              onClick={() => setPreviewImage('')}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
