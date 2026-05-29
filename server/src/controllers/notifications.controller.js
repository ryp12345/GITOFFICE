const { pool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

exports.getNotifications = async (req, res) => {
  try {
    const userId = Number(req.query.user_id) || null;
    if (!userId) return sendError(res, 'user_id is required', 400);

    const { rows } = await pool.query(
      `SELECT id, user_id, notification_title, notification_type, TO_CHAR(date::date, 'YYYY-MM-DD') AS date, description, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, err.message || 'Failed to load notifications', err.statusCode || 500);
  }
};
