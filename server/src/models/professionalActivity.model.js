const { pool } = require('../config/db');

const ATTENDEE_TABLE = 'professional_activity_attendees';
const ATTENDEE_PIVOT = 'professional_activity_attendee_staff';
const CONDUCTED_TABLE = 'professional_activity_conducteds';
const CONDUCTED_PIVOT = 'professional_activity_conducted_staff';

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Same shape as resolveStaffIdFromUserId in leave_calendar.model.js: staff.user_id -> users.id
async function resolveStaffId(userId) {
  const id = Number(userId);
  if (!id) return null;

  const byUser = await pool.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [id]);
  if (byUser.rows[0] && byUser.rows[0].id) return Number(byUser.rows[0].id);

  const byStaff = await pool.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [id]);
  if (byStaff.rows[0] && byStaff.rows[0].id) return Number(byStaff.rows[0].id);

  return null;
}

// Laravel built the e-Gov ID as <YYYY><Mon><PA|PC><5 digit sequence>, resetting the
// sequence for every calendar year and incrementing from the newest row of that year.
async function buildEgovId(client, { table, prefix, fromDate }) {
  const isoDate = String(fromDate).slice(0, 10);
  const year = Number(isoDate.slice(0, 4));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;
  const month = MONTH_ABBREVIATIONS[monthIndex] || 'Jan';

  // Serialises concurrent inserts so two records never claim the same sequence.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1), $2::int)', [`${table}:${year}`, 1]);

  const latest = await client.query(
    `SELECT egov_id FROM ${table}
      WHERE from_date BETWEEN $1::date AND $2::date
      ORDER BY id DESC
      LIMIT 1`,
    [`${year}-01-01`, `${year}-12-31`]
  );

  let sequence = 1;
  const previousEgovId = latest.rows[0] && latest.rows[0].egov_id;
  if (previousEgovId) {
    const previousSequence = parseInt(String(previousEgovId).slice(9), 10);
    sequence = Number.isFinite(previousSequence) ? previousSequence + 1 : 1;
  }

  return `${year}${month}${prefix}${String(sequence).padStart(5, '0')}`;
}

async function listAttended(staffId) {
  const result = await pool.query(
    `SELECT a.*
       FROM ${ATTENDEE_TABLE} a
       JOIN ${ATTENDEE_PIVOT} p ON p.professional_activity_attendee_id = a.id
      WHERE p.staff_id = $1
      ORDER BY a.from_date DESC, a.id DESC`,
    [staffId]
  );
  return result.rows;
}

async function listConducted(staffId) {
  const result = await pool.query(
    `SELECT c.*
       FROM ${CONDUCTED_TABLE} c
       JOIN ${CONDUCTED_PIVOT} p ON p.professional_activity_conducted_id = c.id
      WHERE p.staff_id = $1
      ORDER BY c.from_date DESC, c.id DESC`,
    [staffId]
  );
  return result.rows;
}

async function createAttended(staffId, data, document) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const egovId = await buildEgovId(client, {
      table: ATTENDEE_TABLE,
      prefix: 'PA',
      fromDate: data.from_date
    });

    const inserted = await client.query(
      `INSERT INTO ${ATTENDEE_TABLE}
         (egov_id, title, organizer, role, level, category, sponsored, sponsored_by,
          from_date, to_date, no_of_days, document, validation_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date, $11, $12, 'new', NOW(), NOW())
       RETURNING *`,
      [
        egovId,
        data.title,
        data.organizer,
        data.role,
        data.level,
        data.category,
        data.sponsored,
        data.sponsored_by,
        data.from_date,
        data.to_date,
        data.no_of_days,
        document
      ]
    );

    await client.query(
      `INSERT INTO ${ATTENDEE_PIVOT} (professional_activity_attendee_id, staff_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [inserted.rows[0].id, staffId]
    );

    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createConducted(staffId, data, document) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const egovId = await buildEgovId(client, {
      table: CONDUCTED_TABLE,
      prefix: 'PC',
      fromDate: data.from_date
    });

    const inserted = await client.query(
      `INSERT INTO ${CONDUCTED_TABLE}
         (egov_id, title, organizer, co_organizer, level, category, sponsored,
          sponsoring_agency_name_address, from_date, to_date, place, no_of_days, role,
          document, validation_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date, $11, $12, $13, $14, 'new', NOW(), NOW())
       RETURNING *`,
      [
        egovId,
        data.title,
        data.organizer,
        data.co_organizer,
        data.level,
        data.category,
        data.sponsored,
        data.sponsoring_agency_name_address,
        data.from_date,
        data.to_date,
        data.place,
        data.no_of_days,
        data.role,
        document
      ]
    );

    await client.query(
      `INSERT INTO ${CONDUCTED_PIVOT} (professional_activity_conducted_id, staff_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [inserted.rows[0].id, staffId]
    );

    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findOwnedAttendee(client, id, staffId) {
  const result = await client.query(
    `SELECT a.id, a.document
       FROM ${ATTENDEE_TABLE} a
       JOIN ${ATTENDEE_PIVOT} p ON p.professional_activity_attendee_id = a.id
      WHERE a.id = $1 AND p.staff_id = $2
      LIMIT 1`,
    [id, staffId]
  );
  return result.rows[0] || null;
}

async function findOwnedConducted(client, id, staffId) {
  const result = await client.query(
    `SELECT c.id, c.document
       FROM ${CONDUCTED_TABLE} c
       JOIN ${CONDUCTED_PIVOT} p ON p.professional_activity_conducted_id = c.id
      WHERE c.id = $1 AND p.staff_id = $2
      LIMIT 1`,
    [id, staffId]
  );
  return result.rows[0] || null;
}

// Editing an entry always sends the staff back to the review queue, exactly like the
// Laravel forms which posted a hidden validation_status=updated on every update.
async function updateAttended(id, staffId, data, document) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const owned = await findOwnedAttendee(client, id, staffId);
    if (!owned) {
      const error = new Error('Professional activity not found');
      error.statusCode = 404;
      throw error;
    }

    const updated = await client.query(
      `UPDATE ${ATTENDEE_TABLE}
          SET title = $2,
              organizer = $3,
              role = $4,
              level = $5,
              category = $6,
              sponsored = $7,
              sponsored_by = $8,
              from_date = $9::date,
              to_date = $10::date,
              no_of_days = $11,
              document = COALESCE($12, document),
              validation_status = 'updated',
              updated_at = NOW()
        WHERE id = $1
      RETURNING *`,
      [
        id,
        data.title,
        data.organizer,
        data.role,
        data.level,
        data.category,
        data.sponsored,
        data.sponsored_by,
        data.from_date,
        data.to_date,
        data.no_of_days,
        document
      ]
    );

    await client.query('COMMIT');

    return { record: updated.rows[0], previousDocument: document ? owned.document : null };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateConducted(id, staffId, data, document) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const owned = await findOwnedConducted(client, id, staffId);
    if (!owned) {
      const error = new Error('Professional activity not found');
      error.statusCode = 404;
      throw error;
    }

    const updated = await client.query(
      `UPDATE ${CONDUCTED_TABLE}
          SET title = $2,
              organizer = $3,
              co_organizer = $4,
              level = $5,
              category = $6,
              sponsored = $7,
              sponsoring_agency_name_address = $8,
              from_date = $9::date,
              to_date = $10::date,
              place = $11,
              no_of_days = $12,
              role = $13,
              document = COALESCE($14, document),
              validation_status = 'updated',
              updated_at = NOW()
        WHERE id = $1
      RETURNING *`,
      [
        id,
        data.title,
        data.organizer,
        data.co_organizer,
        data.level,
        data.category,
        data.sponsored,
        data.sponsoring_agency_name_address,
        data.from_date,
        data.to_date,
        data.place,
        data.no_of_days,
        data.role,
        document
      ]
    );

    await client.query('COMMIT');

    return { record: updated.rows[0], previousDocument: document ? owned.document : null };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteAttended(id, staffId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const owned = await findOwnedAttendee(client, id, staffId);
    if (!owned) {
      const error = new Error('Professional activity not found');
      error.statusCode = 404;
      throw error;
    }

    await client.query(`DELETE FROM ${ATTENDEE_PIVOT} WHERE professional_activity_attendee_id = $1`, [id]);
    await client.query(`DELETE FROM ${ATTENDEE_TABLE} WHERE id = $1`, [id]);

    await client.query('COMMIT');
    return { previousDocument: owned.document };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteConducted(id, staffId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const owned = await findOwnedConducted(client, id, staffId);
    if (!owned) {
      const error = new Error('Professional activity not found');
      error.statusCode = 404;
      throw error;
    }

    await client.query(`DELETE FROM ${CONDUCTED_PIVOT} WHERE professional_activity_conducted_id = $1`, [id]);
    await client.query(`DELETE FROM ${CONDUCTED_TABLE} WHERE id = $1`, [id]);

    await client.query('COMMIT');
    return { previousDocument: owned.document };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ATTENDEE_TABLE,
  CONDUCTED_TABLE,
  resolveStaffId,
  listAttended,
  listConducted,
  createAttended,
  createConducted,
  updateAttended,
  updateConducted,
  deleteAttended,
  deleteConducted
};