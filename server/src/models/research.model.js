const { pool } = require('../config/db');
const { normalizeDateColumns } = require('../utils/pgDate');

// Every DATE column across the research tables (see database/migrations).
const DATE_COLUMNS = [
  'from_date',
  'to_date',
  'date',
  'application_date',
  'appl_date',
  'publication_date',
  'copyright_date',
  'reviewed_date',
];

function serializeRow(row) {
  return normalizeDateColumns(row, DATE_COLUMNS);
}

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Every research menu in Laravel was a near-identical controller pair (store/update/destroy)
// over one table. The React API keeps one generic CRUD surface and drives it from this
// registry, so a menu only has to describe its table, its ownership rule and its columns.
//
// ownership.mode:
//   'staff' - the row carries staff_id
//   'pivot' - the row is shared through <pivot>.<fk>
//
// egov: mirrors each controller's gen_egov_id(), including its month format and prefix.
const RESOURCES = {
  'conference-attended': {
    table: 'conferences_attendees',
    ownership: { mode: 'pivot', pivot: 'conferences_attendee_staff', fk: 'conferences_attendee_id' },
    egov: { prefix: '', month: 'text', dateColumn: 'from_date' },
    columns: [
      'conference_name',
      'attended_as',
      'from_date',
      'to_date',
      'no_of_days',
      'title',
      'place',
      'sponsored',
      'sponsored_by',
      'amount',
      'weblink',
      'type_of_level',
      'issn_no',
    ],
    orderBy: 'from_date DESC, id DESC',
  },
  'conference-conducted': {
    table: 'conferences_conducteds',
    ownership: { mode: 'pivot', pivot: 'conferences_conducted_staff', fk: 'conferences_conducted_id' },
    egov: { prefix: 'CC', month: 'text', dateColumn: 'from_date' },
    columns: [
      'conference_name',
      'co_organizer',
      'no_of_participants',
      'sponsored',
      'sponsoring_agency',
      'from_date',
      'to_date',
      'no_of_days',
      'place',
      'publisher',
      'role',
      'weblink',
      'type_of_level',
      'issn_no',
    ],
    orderBy: 'from_date DESC, id DESC',
  },
  publication: {
    table: 'publications',
    ownership: { mode: 'staff' },
    egov: { prefix: 'PUB', month: 'numeric', dateColumn: 'date' },
    columns: [
      'level',
      'other_level',
      'title',
      'date',
      'journal',
      'doi_number',
      'link',
      'role',
      'volume',
      'issue',
      'page_no',
      'year',
      'publication_type',
    ],
    orderBy: 'date DESC, id DESC',
  },
  'book-chapter': {
    table: 'book_publications',
    ownership: { mode: 'staff' },
    egov: { prefix: 'BP', month: 'text', dateColumn: 'date' },
    columns: [
      'title',
      'book_level',
      'publisher_name',
      'edition',
      'doi',
      'date',
      'issue',
      'type',
      'chapter_title',
      'start_page_no',
      'end_page_no',
    ],
    orderBy: 'date DESC, id DESC',
  },
  'funded-project': {
    table: 'funded_projects',
    ownership: { mode: 'staff' },
    egov: { prefix: 'FP', month: 'text', dateColumn: 'application_date' },
    columns: [
      'proposal_title',
      'role',
      'type',
      'amount',
      'proposal_status',
      'application_date',
      'fund_received',
      'project_status',
      'completion_year',
    ],
    orderBy: 'application_date DESC, id DESC',
  },
  consultancy: {
    table: 'consultancies',
    ownership: { mode: 'staff' },
    egov: { prefix: 'CON', month: 'numeric', dateColumn: 'from_date' },
    columns: ['consultancy_title', 'agency', 'from_date', 'to_date', 'amount', 'consultancy_type', 'role'],
    orderBy: 'from_date DESC, id DESC',
  },
  patent: {
    table: 'patents',
    ownership: { mode: 'staff' },
    egov: { prefix: 'PA', month: 'text', dateColumn: 'appl_date' },
    columns: [
      'appl_no',
      'appl_date',
      'title',
      'stream_domain',
      'status',
      'patent_no',
      'publication_no',
      'publication_date',
    ],
    orderBy: 'appl_date DESC, id DESC',
  },
  copyright: {
    table: 'copyrights',
    ownership: { mode: 'staff' },
    egov: { prefix: 'copy', month: 'numeric', dateColumn: 'copyright_date' },
    columns: ['copyright_title', 'copyright_date', 'author_name', 'status', 'description'],
    orderBy: 'copyright_date DESC, id DESC',
  },
  'reviewer-editor': {
    table: 'reviewer_editors',
    ownership: { mode: 'staff' },
    egov: { prefix: 'RE', month: 'text', dateColumn: 'reviewed_date' },
    columns: ['title', 'journal_name', 'publisher_name', 'reviewed_date', 'level', 'other_level', 'category'],
    orderBy: 'reviewed_date DESC, id DESC',
  },
  achievement: {
    table: 'general_achievements',
    ownership: { mode: 'staff' },
    // GeneralAchievementsController never persisted an e-Gov ID, and the column does not exist.
    egov: null,
    columns: ['award', 'year', 'details', 'awarding_body'],
    orderBy: 'year DESC, id DESC',
  },
};

// These text columns are NOT NULL in the schema with no column default, and Laravel always
// posted the matching form input, so an omitted input reached the row as an empty string
// rather than NULL. Optional form fields must therefore bind '' instead of NULL.
const NOT_NULL_TEXT = {
  'conferences_attendees': ['title', 'place'],
  'conferences_conducteds': ['publisher'],
  'publications': ['journal', 'year'],
  'book_publications': ['edition', 'doi'],
  'patents': ['stream_domain'],
  'copyrights': ['description'],
  'general_achievements': ['details'],
};

// Numeric NOT NULL columns whose FormRequest left optional. Laravel only reached the insert
// because the blade form always submitted a number, so an omitted amount stores as 0.
const NOT_NULL_NUMBER = {
  'consultancies': { amount: 0 },
};

// A missing optional value must reach Postgres as NULL so the column default still applies.
// An empty string would instead be written verbatim and can trip a CHECK constraint.
function bindable(resource, column, value) {
  if (value === undefined) return null;
  if (value !== '' && value !== null) return value;

  const notNullText = NOT_NULL_TEXT[resource.table];
  if (notNullText && notNullText.includes(column)) return '';

  const notNullNumber = NOT_NULL_NUMBER[resource.table];
  if (notNullNumber && notNullNumber[column] !== undefined) return notNullNumber[column];

  return null;
}

function getResource(key) {
  const resource = RESOURCES[key];
  if (!resource) {
    const error = new Error('Unknown research resource');
    error.statusCode = 404;
    throw error;
  }
  return resource;
}

// Same shape as resolveStaffId in professionalActivity.model.js: staff.user_id -> users.id
async function resolveStaffId(userId) {
  const id = Number(userId);
  if (!id) return null;

  const byUser = await pool.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [id]);
  if (byUser.rows[0] && byUser.rows[0].id) return Number(byUser.rows[0].id);

  const byStaff = await pool.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [id]);
  if (byStaff.rows[0] && byStaff.rows[0].id) return Number(byStaff.rows[0].id);

  return null;
}

async function list(resourceKey, staffId) {
  const resource = getResource(resourceKey);

  if (resource.ownership.mode === 'pivot') {
    const result = await pool.query(
      `SELECT r.*
         FROM ${resource.table} r
         JOIN ${resource.ownership.pivot} p ON p.${resource.ownership.fk} = r.id
        WHERE p.staff_id = $1
        ORDER BY r.${resource.orderBy}`,
      [staffId]
    );
    return result.rows.map(serializeRow);
  }

  const result = await pool.query(
    `SELECT * FROM ${resource.table} WHERE staff_id = $1 ORDER BY ${resource.orderBy}`,
    [staffId]
  );
  return result.rows.map(serializeRow);
}

async function findOwned(client, resourceKey, id, staffId) {
  const resource = getResource(resourceKey);

  const where =
    resource.ownership.mode === 'pivot'
      ? `r.id = $1 AND EXISTS (
            SELECT 1 FROM ${resource.ownership.pivot} p
             WHERE p.${resource.ownership.fk} = r.id AND p.staff_id = $2
         )`
      : 'r.id = $1 AND r.staff_id = $2';

  const result = await client.query(`SELECT r.* FROM ${resource.table} r WHERE ${where} LIMIT 1`, [
    id,
    staffId,
  ]);
  return result.rows[0] || null;
}

// Laravel built each e-Gov ID as <YYYY><Mon><PREFIX><5 digits>, restarting the sequence for
// every calendar year. Several controllers parsed the serial with substr($id, 9) which is
// only correct when the prefix is two characters wide; the trailing five digits are the
// intended serial in every case, so that is what we read here.
async function buildEgovId(client, resourceKey, fromDate) {
  const resource = getResource(resourceKey);
  if (!resource.egov) return null;

  const isoDate = String(fromDate).slice(0, 10);
  const year = Number(isoDate.slice(0, 4));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;

  const month =
    resource.egov.month === 'numeric'
      ? String(monthIndex + 1).padStart(2, '0')
      : MONTH_ABBREVIATIONS[monthIndex] || 'Jan';

  // Serialises concurrent inserts so two records never claim the same sequence.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1), $2::int)', [
    `${resource.table}:${year}`,
    1,
  ]);

  const latest = await client.query(
    `SELECT egov_id FROM ${resource.table}
      WHERE ${resource.egov.dateColumn} BETWEEN $1::date AND $2::date
      ORDER BY id DESC
      LIMIT 1`,
    [`${year}-01-01`, `${year}-12-31`]
  );

  let sequence = 1;
  const previousEgovId = latest.rows[0] && latest.rows[0].egov_id;
  if (previousEgovId) {
    const previousSequence = parseInt(String(previousEgovId).slice(-5), 10);
    sequence = Number.isFinite(previousSequence) ? previousSequence + 1 : 1;
  }

  return `${year}${month}${resource.egov.prefix}${String(sequence).padStart(5, '0')}`;
}

async function create(resourceKey, staffId, data, document) {
  const resource = getResource(resourceKey);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hasEgov = Boolean(resource.egov);
    const egovId = hasEgov
      ? await buildEgovId(client, resourceKey, data[resource.egov.dateColumn])
      : null;

    const columns = [];
    const values = [];

    const addColumn = (column, value) => {
      columns.push(column);
      values.push(value === undefined ? null : value);
    };

    resource.columns.forEach((column) => addColumn(column, bindable(resource, column, data[column])));

    if (resource.ownership.mode === 'staff') {
      addColumn('staff_id', staffId);
    }

    if (hasEgov) {
      addColumn('egov_id', egovId);
    }

    addColumn('document', document || null);

    const placeholders = values.map((_value, index) => `$${index + 1}`);

    const inserted = await client.query(
      `INSERT INTO ${resource.table} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );

    const record = inserted.rows[0];

    if (resource.ownership.mode === 'pivot') {
      await client.query(
        `INSERT INTO ${resource.ownership.pivot} (staff_id, ${resource.ownership.fk}) VALUES ($1, $2)`,
        [staffId, record.id]
      );
    }

    await client.query('COMMIT');
    return serializeRow(record);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(resourceKey, id, staffId, data, document) {
  const resource = getResource(resourceKey);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const owned = await findOwned(client, resourceKey, id, staffId);
    if (!owned) {
      const error = new Error('Research record not found');
      error.statusCode = 404;
      throw error;
    }

    const assignments = [];
    const values = [];

    resource.columns.forEach((column) => {
      values.push(bindable(resource, column, data[column]));
      assignments.push(`${column} = $${values.length + 1}`);
    });

    // Laravel re-ran gen_egov_id() on every update, so each edit gave the record a new e-Gov ID
    // and broke any reference the approver already held. The ID only encodes year and month,
    // so it is regenerated only when the edit moves the record into a different month.
    if (resource.egov) {
      const previousPeriod = String(serializeRow({ ...owned })[resource.egov.dateColumn] || '').slice(0, 7);
      const nextPeriod = String(data[resource.egov.dateColumn] || '').slice(0, 7);

      if (!owned.egov_id || previousPeriod !== nextPeriod) {
        const egovId = await buildEgovId(client, resourceKey, data[resource.egov.dateColumn]);
        values.push(egovId);
        assignments.push(`egov_id = $${values.length + 1}`);
      }
    }

    // One new file replaces the stored one; sending none keeps whatever is already there.
    values.push(document || null);
    assignments.push(`document = COALESCE($${values.length + 1}, document)`);

    // A record rejected by the approver returns to the queue once the staff member edits it.
    assignments.push(`validation_status = CASE WHEN validation_status = 'invalid' THEN 'updated' ELSE validation_status END`);
    assignments.push('updated_at = NOW()');

    const updated = await client.query(
      `UPDATE ${resource.table}
          SET ${assignments.join(', ')}
        WHERE id = $1
      RETURNING *`,
      [id, ...values]
    );

    await client.query('COMMIT');

    return {
      record: serializeRow(updated.rows[0]),
      previousDocument: document ? owned.document : null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function remove(resourceKey, id, staffId) {
  const resource = getResource(resourceKey);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const owned = await findOwned(client, resourceKey, id, staffId);
    if (!owned) {
      const error = new Error('Research record not found');
      error.statusCode = 404;
      throw error;
    }

    if (resource.ownership.mode === 'pivot') {
      await client.query(
        `DELETE FROM ${resource.ownership.pivot} WHERE ${resource.ownership.fk} = $1 AND staff_id = $2`,
        [id, staffId]
      );
    }

    await client.query(`DELETE FROM ${resource.table} WHERE id = $1`, [id]);
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
  RESOURCES,
  getResource,
  resolveStaffId,
  list,
  create,
  update,
  remove,
};