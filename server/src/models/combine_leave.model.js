const { pool } = require('../config/db');

const CombineLeave = {
  async getByLeaveId(leaveId) {
    const result = await pool.query(
      `SELECT cl.*, l.longname AS combined_longname, l.shortname AS combined_shortname
       FROM combine_leaves cl
       JOIN leaves l ON l.id = cl.combined_id
       WHERE cl.leave_id = $1
       ORDER BY cl.id DESC`,
      [leaveId]
    );
    return result.rows;
  },

  async sync(leaveId, items, wef) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const normalizedItems = Array.isArray(items)
        ? items
            .map((item) => ({
              combined_id: Number(item.combined_id),
              sandwitchable: item.sandwitchable,
            }))
            .filter((item) => Number.isFinite(item.combined_id) && ['Bothside', 'Oneside'].includes(item.sandwitchable))
        : [];

      const selectedIds = normalizedItems.map((item) => item.combined_id);

      if (selectedIds.length > 0) {
        await client.query(
          `UPDATE combine_leaves
           SET status = 'inactive',
               closing_wef = COALESCE(closing_wef, CURRENT_DATE),
               updated_at = NOW()
           WHERE leave_id = $1
             AND status = 'active'
             AND NOT (combined_id = ANY($2::bigint[]))`,
          [leaveId, selectedIds]
        );
      } else {
        await client.query(
          `UPDATE combine_leaves
           SET status = 'inactive',
               closing_wef = COALESCE(closing_wef, CURRENT_DATE),
               updated_at = NOW()
           WHERE leave_id = $1
             AND status = 'active'`,
          [leaveId]
        );
      }

      for (const item of normalizedItems) {
        const existingActive = await client.query(
          `SELECT id
           FROM combine_leaves
           WHERE leave_id = $1 AND combined_id = $2 AND status = 'active'
           ORDER BY id DESC
           LIMIT 1`,
          [leaveId, item.combined_id]
        );

        if (existingActive.rows.length > 0) {
          await client.query(
            `UPDATE combine_leaves
             SET sandwitchable = $1,
                 wef = $2,
                 closing_wef = NULL,
                 status = 'active',
                 updated_at = NOW()
             WHERE id = $3`,
            [item.sandwitchable, wef, existingActive.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO combine_leaves (leave_id, combined_id, sandwitchable, wef, closing_wef, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NULL, 'active', NOW(), NOW())`,
            [leaveId, item.combined_id, item.sandwitchable, wef]
          );
        }
      }

      await client.query('COMMIT');
      const result = await client.query(
        `SELECT cl.*, l.longname AS combined_longname, l.shortname AS combined_shortname
         FROM combine_leaves cl
         JOIN leaves l ON l.id = cl.combined_id
         WHERE cl.leave_id = $1
         ORDER BY cl.id DESC`,
        [leaveId]
      );
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = CombineLeave;
