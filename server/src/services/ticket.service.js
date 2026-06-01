const ticketModel = require('../models/ticket.model');

const MAX_FILE_SIZE_BYTES = 500 * 1024;
const ALLOWED_STATUSES = ['New', 'Pending', 'Resolved'];

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return (
    normalized === 'super admin' ||
    normalized === 'super-admin' ||
    normalized === 'admin' ||
    normalized === 'su'
  );
}

function ensureTitleDescription({ title, description }) {
  if (!title || !String(title).trim()) {
    const err = new Error('title is required');
    err.statusCode = 400;
    throw err;
  }

  if (!description || !String(description).trim()) {
    const err = new Error('description is required');
    err.statusCode = 400;
    throw err;
  }
}

function mapUploadedFiles(files = []) {
  return files.map((file) => file.filename);
}

function validateFileSizes(files = []) {
  const oversized = files.find((file) => Number(file?.size || 0) > MAX_FILE_SIZE_BYTES);
  if (oversized) {
    const err = new Error('File size is more than 500KB. Please consider re-uploading.');
    err.statusCode = 400;
    throw err;
  }
}

async function getDashboard(user) {
  const isAdmin = isAdminRole(user?.role);
  const userId = Number(user?.id);

  return ticketModel.listForDashboard({ userId, isAdmin });
}

async function createTicket(user, body, files) {
  ensureTitleDescription(body);
  validateFileSizes(files);

  return ticketModel.createTicket({
    title: String(body.title).trim(),
    description: String(body.description).trim(),
    userId: Number(user.id),
    attachments: mapUploadedFiles(files),
  });
}

async function getTicketById(user, ticketId) {
  const id = Number(ticketId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Valid ticket id is required');
    err.statusCode = 400;
    throw err;
  }

  const ticket = await ticketModel.findTicketById(id);
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const admin = isAdminRole(user?.role);
  if (!admin && Number(ticket.user_id) !== Number(user?.id)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const replies = await ticketModel.listReplies(id);
  return { ticket, replies, isAdmin: admin };
}

async function updateTicket(user, ticketId, body, files) {
  const id = Number(ticketId);
  const ticket = await ticketModel.findTicketById(id);

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  if (Number(ticket.user_id) !== Number(user?.id)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  if (ticket.status === 'Resolved') {
    const err = new Error('Resolved tickets cannot be edited');
    err.statusCode = 400;
    throw err;
  }

  const nextTitle = body.title !== undefined ? String(body.title).trim() : undefined;
  const nextDescription = body.description !== undefined ? String(body.description).trim() : undefined;

  if (nextTitle !== undefined && !nextTitle) {
    const err = new Error('title is required');
    err.statusCode = 400;
    throw err;
  }

  if (nextDescription !== undefined && !nextDescription) {
    const err = new Error('description is required');
    err.statusCode = 400;
    throw err;
  }

  validateFileSizes(files);

  const payload = {
    title: nextTitle,
    description: nextDescription,
  };

  if (Array.isArray(files) && files.length > 0) {
    payload.attachments = mapUploadedFiles(files);
  }

  return ticketModel.updateTicket(id, payload);
}

async function deleteTicket(user, ticketId) {
  const id = Number(ticketId);
  const ticket = await ticketModel.findTicketById(id);

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  if (Number(ticket.user_id) !== Number(user?.id)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  await ticketModel.deleteTicket(id);
}

async function addReply(user, ticketId, body, files) {
  const id = Number(ticketId);
  const ticket = await ticketModel.findTicketById(id);

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const admin = isAdminRole(user?.role);
  if (!admin && Number(ticket.user_id) !== Number(user?.id)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  ensureTitleDescription(body);
  validateFileSizes(files);

  const reply = await ticketModel.createReply({
    ticketId: id,
    userId: Number(user.id),
    title: String(body.title).trim(),
    description: String(body.description).trim(),
    attachments: mapUploadedFiles(files),
  });

  if (ticket.status === 'New') {
    await ticketModel.updateTicketStatus(id, 'Pending');
  }

  return reply;
}

async function updateStatus(user, ticketId, status) {
  if (!isAdminRole(user?.role)) {
    const err = new Error('Only admins can update status');
    err.statusCode = 403;
    throw err;
  }

  const id = Number(ticketId);
  const ticket = await ticketModel.findTicketById(id);

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const nextStatus = String(status || '').trim();
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    const err = new Error('status must be one of New, Pending, Resolved');
    err.statusCode = 400;
    throw err;
  }

  return ticketModel.updateTicketStatus(id, nextStatus);
}

module.exports = {
  getDashboard,
  createTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  addReply,
  updateStatus,
  isAdminRole,
};
