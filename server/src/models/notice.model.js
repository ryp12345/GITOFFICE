const { pool } = require('../config/db');
const { toIsoDate } = require('../utils/pgDate');

// Shares the notices / department_notice tables with the Laravel app, so rows written here must
// stay readable there: same columns, department links in department_notice, timestamps set.

const NOTICE_SELECT = `
  SELECT n.id, n.user_id, n.title, n.date, n.description, n.staff_type, n.created_at, n.updated_at,
         u.email AS author_email,
         u.role AS author_role,
         (SELECT NULLIF(TRIM(CONCAT_WS(' ', s.fname, s.lname)), '')
            FROM staff s WHERE s.user_id = n.user_id LIMIT 1) AS author_name,
         COALESCE(
           JSON_AGG(JSON_BUILD_OBJECT('id', d.id, 'dept_shortname', d.dept_shortname, 'dept_name', d.dept_name)
                    ORDER BY d.dept_shortname) FILTER (WHERE d.id IS NOT NULL),
           '[]'
         ) AS departments
    FROM notices n
    LEFT JOIN users u ON u.id = n.user_id
    LEFT JOIN department_notice dn ON dn.notice_id = n.id
    LEFT JOIN departments d ON d.id = dn.department_id`;

// node-postgres returns bigint columns as strings while the JSON-aggregated department ids are
// numbers; return numbers throughout so the client can compare ids directly.
function mapNotice(row) {
  if (!row) return null;
  return { ...row, id: Number(row.id), user_id: Number(row.user_id), date: toIsoDate(row.date) };
}

// The data was imported with explicit ids, so the identity sequences can lag behind MAX(id) and
// the next insert collides. Same guard the department and association models use.
async function syncIdSequences(client) {
  await client.query(
    `SELECT setval(pg_get_serial_sequence('notices', 'id'), COALESCE((SELECT MAX(id) FROM notices), 1), true)`
  );
  await client.query(
    `SELECT setval(pg_get_serial_sequence('department_notice', 'id'),
                   COALESCE((SELECT MAX(id) FROM department_notice), 1), true)`
  );
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function attachDepartments(client, noticeId, departmentIds) {
  await client.query(
    `INSERT INTO department_notice (notice_id, department_id, created_at, updated_at)
     SELECT $1, dept_id, NOW(), NOW() FROM UNNEST($2::bigint[]) AS dept_id`,
    [noticeId, departmentIds]
  );
}

// ownerUserId null lists every notice (Super Admin); otherwise only that user's notices.
async function listNotices({ ownerUserId = null } = {}) {
  const params = [];
  let where = '';
  if (ownerUserId !== null) {
    params.push(ownerUserId);
    where = 'WHERE n.user_id = $1';
  }
  const { rows } = await pool.query(
    `${NOTICE_SELECT} ${where} GROUP BY n.id, u.email, u.role ORDER BY n.date DESC, n.id DESC`,
    params
  );
  return rows.map(mapNotice);
}

// Dashboard feed. departmentIds null means every notice; otherwise only notices addressed to at
// least one of those departments. staffType limits to notices for that staff type or 'All'.
// Each notice still lists all the departments it was addressed to.
async function listNoticeFeed({ departmentIds = null, staffType = null, limit = 20 } = {}) {
  const params = [];
  const conditions = [];
  if (departmentIds !== null) {
    params.push(departmentIds);
    conditions.push(`EXISTS (SELECT 1 FROM department_notice f
                              WHERE f.notice_id = n.id AND f.department_id = ANY($${params.length}::bigint[]))`);
  }
  if (staffType) {
    params.push(staffType);
    conditions.push(`n.staff_type IN ($${params.length}, 'All')`);
  }
  params.push(limit);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `${NOTICE_SELECT} ${where} GROUP BY n.id, u.email, u.role
      ORDER BY n.date DESC, n.id DESC LIMIT $${params.length}`,
    params
  );
  return rows.map(mapNotice);
}

// Departments a staff member is currently active in (Laravel: $staff->activedepartments).
async function findActiveDepartmentIdsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ds.department_id
       FROM staff s
       JOIN department_staff ds ON ds.staff_id = s.id AND LOWER(ds.status) = 'active'
      WHERE s.user_id = $1`,
    [userId]
  );
  return rows.map((row) => Number(row.department_id));
}

async function findNoticeById(id) {
  const { rows } = await pool.query(
    `${NOTICE_SELECT} WHERE n.id = $1 GROUP BY n.id, u.email, u.role`,
    [id]
  );
  return mapNotice(rows[0]);
}

async function listActiveDepartments() {
  const { rows } = await pool.query(
    `SELECT id, dept_name, dept_shortname
       FROM departments
      WHERE LOWER(status) = 'active'
      ORDER BY dept_shortname`
  );
  return rows.map((row) => ({ ...row, id: Number(row.id) }));
}

async function findActiveDepartmentIds(ids) {
  const { rows } = await pool.query(
    `SELECT id FROM departments WHERE id = ANY($1::bigint[]) AND LOWER(status) = 'active'`,
    [ids]
  );
  return rows.map((row) => Number(row.id));
}

async function createNotice({ userId, title, date, description, staff_type, department_ids }) {
  const noticeId = await withTransaction(async (client) => {
    await syncIdSequences(client);
    const { rows } = await client.query(
      `INSERT INTO notices (user_id, title, date, description, staff_type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [userId, title, date, description, staff_type]
    );
    await attachDepartments(client, rows[0].id, department_ids);
    return rows[0].id;
  });
  return findNoticeById(noticeId);
}

async function updateNotice(id, { title, date, description, staff_type, department_ids }) {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE notices
          SET title = $2, date = $3, description = $4, staff_type = $5, updated_at = NOW()
        WHERE id = $1`,
      [id, title, date, description, staff_type]
    );
    await client.query('DELETE FROM department_notice WHERE notice_id = $1', [id]);
    await syncIdSequences(client);
    await attachDepartments(client, id, department_ids);
  });
  return findNoticeById(id);
}

async function deleteNotice(id) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM department_notice WHERE notice_id = $1', [id]);
    await client.query('DELETE FROM notices WHERE id = $1', [id]);
  });
}

module.exports = {
  listNotices,
  listNoticeFeed,
  findActiveDepartmentIdsForUser,
  findNoticeById,
  listActiveDepartments,
  findActiveDepartmentIds,
  createNotice,
  updateNotice,
  deleteNotice,
};
