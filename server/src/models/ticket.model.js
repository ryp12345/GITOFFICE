const { pool } = require('../config/db');

function mapTicketRow(row) {
  if (!row) return null;
  return {
    ...row,
    attachments: parseAttachmentField(row.attachment),
  };
}

function parseAttachmentField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_error) {
      // Keep legacy single-filename string format.
    }
    return [value];
  }

  return [];
}

function toAttachmentDbValue(files) {
  if (!Array.isArray(files) || files.length === 0) return null;
  if (files.length === 1) return files[0];
  return JSON.stringify(files);
}

async function listForDashboard({ userId, isAdmin }) {
  const values = [];
  const whereSql = isAdmin ? '' : 'WHERE t.user_id = $1';

  if (!isAdmin) values.push(userId);

  const ticketSql = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.status,
      t.attachment,
      t.user_id,
      t.created_at,
      t.updated_at,
      u.email,
      u.role AS user_role,
      CONCAT(COALESCE(s.fname, ''), CASE WHEN s.mname IS NOT NULL AND s.mname <> '' THEN ' ' || s.mname ELSE '' END, CASE WHEN s.lname IS NOT NULL AND s.lname <> '' THEN ' ' || s.lname ELSE '' END) AS staff_name
    FROM tickets t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN staff s ON s.user_id = t.user_id
    ${whereSql}
    ORDER BY t.created_at DESC NULLS LAST, t.id DESC
  `;

  const countSql = `
    SELECT
      COUNT(CASE WHEN status = 'New' THEN 1 END)::int AS new_count,
      COUNT(CASE WHEN status = 'Pending' THEN 1 END)::int AS pending_count,
      COUNT(CASE WHEN status = 'Resolved' THEN 1 END)::int AS resolved_count
    FROM tickets
    ${isAdmin ? '' : 'WHERE user_id = $1'}
  `;

  const [{ rows: ticketRows }, { rows: countRows }] = await Promise.all([
    pool.query(ticketSql, values),
    pool.query(countSql, values),
  ]);

  return {
    tickets: ticketRows.map(mapTicketRow),
    counts: countRows[0] || { new_count: 0, pending_count: 0, resolved_count: 0 },
  };
}

async function createTicket({ title, description, userId, attachments }) {
  const attachmentValue = toAttachmentDbValue(attachments);
  const { rows } = await pool.query(
    `
    INSERT INTO tickets (title, description, status, attachment, user_id, created_at, updated_at)
    VALUES ($1, $2, 'New', $3, $4, NOW(), NOW())
    RETURNING id, title, description, status, attachment, user_id, created_at, updated_at
    `,
    [title, description, attachmentValue, userId]
  );

  return mapTicketRow(rows[0]);
}

async function findTicketById(id) {
  const { rows } = await pool.query(
    `
    SELECT
      t.id,
      t.title,
      t.description,
      t.status,
      t.attachment,
      t.user_id,
      t.created_at,
      t.updated_at,
      u.email,
      u.role AS user_role,
      CONCAT(COALESCE(s.fname, ''), CASE WHEN s.mname IS NOT NULL AND s.mname <> '' THEN ' ' || s.mname ELSE '' END, CASE WHEN s.lname IS NOT NULL AND s.lname <> '' THEN ' ' || s.lname ELSE '' END) AS staff_name
    FROM tickets t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN staff s ON s.user_id = t.user_id
    WHERE t.id = $1
    LIMIT 1
    `,
    [id]
  );

  return mapTicketRow(rows[0] || null);
}

async function listReplies(ticketId) {
  const { rows } = await pool.query(
    `
    SELECT
      p.id,
      p.ticket_id,
      p.user_id,
      p.title,
      p.description,
      p.post_attachment,
      p.created_at,
      p.updated_at,
      u.email,
      u.role AS user_role,
      CONCAT(COALESCE(s.fname, ''), CASE WHEN s.mname IS NOT NULL AND s.mname <> '' THEN ' ' || s.mname ELSE '' END, CASE WHEN s.lname IS NOT NULL AND s.lname <> '' THEN ' ' || s.lname ELSE '' END) AS staff_name
    FROM post_tickets p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN staff s ON s.user_id = p.user_id
    WHERE p.ticket_id = $1
    ORDER BY p.created_at ASC NULLS LAST, p.id ASC
    `,
    [ticketId]
  );

  return rows.map((row) => ({
    ...row,
    attachments: parseAttachmentField(row.post_attachment),
  }));
}

async function updateTicket(id, { title, description, attachments }) {
  const updates = [];
  const values = [];
  let index = 1;

  if (title !== undefined) {
    updates.push(`title = $${index++}`);
    values.push(title);
  }

  if (description !== undefined) {
    updates.push(`description = $${index++}`);
    values.push(description);
  }

  if (attachments !== undefined) {
    updates.push(`attachment = $${index++}`);
    values.push(toAttachmentDbValue(attachments));
  }

  updates.push('updated_at = NOW()');

  values.push(id);

  const { rows } = await pool.query(
    `
    UPDATE tickets
    SET ${updates.join(', ')}
    WHERE id = $${index}
    RETURNING id, title, description, status, attachment, user_id, created_at, updated_at
    `,
    values
  );

  return mapTicketRow(rows[0] || null);
}

async function deleteTicket(id) {
  await pool.query('DELETE FROM post_tickets WHERE ticket_id = $1', [id]);
  await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
}

async function createReply({ ticketId, userId, title, description, attachments }) {
  const attachmentValue = toAttachmentDbValue(attachments);
  const { rows } = await pool.query(
    `
    INSERT INTO post_tickets (ticket_id, user_id, title, description, post_attachment, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id, ticket_id, user_id, title, description, post_attachment, created_at, updated_at
    `,
    [ticketId, userId, title, description, attachmentValue]
  );

  const row = rows[0] || null;
  if (!row) return null;

  return {
    ...row,
    attachments: parseAttachmentField(row.post_attachment),
  };
}

async function updateTicketStatus(id, status) {
  const { rows } = await pool.query(
    `
    UPDATE tickets
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, title, description, status, attachment, user_id, created_at, updated_at
    `,
    [status, id]
  );

  return mapTicketRow(rows[0] || null);
}

module.exports = {
  listForDashboard,
  createTicket,
  findTicketById,
  listReplies,
  updateTicket,
  deleteTicket,
  createReply,
  updateTicketStatus,
  parseAttachmentField,
};
