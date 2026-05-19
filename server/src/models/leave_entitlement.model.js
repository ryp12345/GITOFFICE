const { pool } = require('../config/db');

const CONFIRMED_ASSOCIATION_PATTERNS = [
  '%Confirmed%',
  '%Contractual%',
  '%Probationary%',
  '%Temporary (non teaching)%',
  '%Promotional Probationary%'
];

const toSafeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const getLeaveTypes = async (entitledOnly = false) => {
  const params = [];
  const clauses = [
    "TRIM(LOWER(status)) = 'active'",
    "UPPER(TRIM(shortname)) NOT LIKE 'SML%'",
    "UPPER(TRIM(shortname)) <> 'ML'"
  ];

  if (entitledOnly) {
    clauses.push('COALESCE(max_entitlement, 0) > 0');
  }

  const sql = `
    SELECT UPPER(TRIM(shortname)) AS shortname, MIN(id) AS id
    FROM leaves
    WHERE ${clauses.join(' AND ')}
    GROUP BY UPPER(TRIM(shortname))
    ORDER BY shortname ASC
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
};

const getDepartments = async () => {
  const sql = `
    SELECT id, dept_name, dept_shortname
    FROM departments
    WHERE LOWER(status) = 'active'
    ORDER BY dept_name ASC
  `;

  const { rows } = await pool.query(sql);
  return rows;
};

const getEligibleStaff = async (departmentId) => {
  const sql = `
    SELECT
      s.id,
      s.user_id,
      TRIM(CONCAT_WS(' ', s.fname, s.mname, s.lname)) AS name,
      COALESCE(STRING_AGG(DISTINCT d.dept_shortname, ', '), 'N/A') AS dept_shortname
    FROM staff s
    JOIN association_staff ast ON ast.staff_id = s.id AND ast.status = 'active'
    JOIN associations a ON a.id = ast.association_id
    LEFT JOIN department_staff ds ON ds.staff_id = s.id AND ds.status = 'active'
    LEFT JOIN departments d ON d.id = ds.department_id
    WHERE (
      a.asso_name ILIKE $1 OR
      a.asso_name ILIKE $2 OR
      a.asso_name ILIKE $3 OR
      a.asso_name ILIKE $4 OR
      a.asso_name ILIKE $5
    )
      AND ($6::bigint IS NULL OR ds.department_id = $6)
    GROUP BY s.id, s.user_id, s.fname, s.mname, s.lname
    ORDER BY s.id ASC
  `;

  const { rows } = await pool.query(sql, [...CONFIRMED_ASSOCIATION_PATTERNS, departmentId || null]);
  return rows;
};

const getEntitlementsForStaff = async (year, staffIds) => {
  if (!Array.isArray(staffIds) || staffIds.length === 0) return [];

  const sql = `
    SELECT
      lse.staff_id,
      UPPER(TRIM(l.shortname)) AS shortname,
      COALESCE(lse.entitled_curr_year, 0) AS entitled_curr_year,
      COALESCE(lse.accumulated, 0) AS accumulated,
      COALESCE(lse.consumed_curr_year, 0) AS availed,
      COALESCE(lse.encashed_curr_year, 0) AS encashed_curr_year,
      COALESCE(lse.total_encashed, 0) AS total_encashed
    FROM leave_staff_entitlements lse
    JOIN leaves l ON l.id = lse.leave_id
    WHERE lse.year = $1
      AND lse.staff_id = ANY($2::bigint[])
      AND l.status = 'active'
        AND UPPER(TRIM(l.shortname)) NOT LIKE 'SML%'
        AND UPPER(TRIM(l.shortname)) <> 'ML'
  `;

  const { rows } = await pool.query(sql, [year, staffIds]);
  return rows;
};

const getUpdateLeaveTypesForStaff = async (client, staffId) => {
  const employeeTypeQuery = await client.query(
    `
      SELECT employee_type
      FROM employee_types
      WHERE staff_id = $1
        AND status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `,
    [staffId]
  );

  const activeAssociationQuery = await client.query(
    `
      SELECT LOWER(a.asso_name) AS asso_name
      FROM association_staff ast
      JOIN associations a ON a.id = ast.association_id
      WHERE ast.staff_id = $1
        AND ast.status = 'active'
      ORDER BY ast.id DESC
      LIMIT 1
    `,
    [staffId]
  );

  const employeeType = (employeeTypeQuery.rows[0]?.employee_type || '').toLowerCase();
  const associationName = activeAssociationQuery.rows[0]?.asso_name || '';

  let vacationType = 'Vacational';
  if (employeeType === 'non-teaching') {
    vacationType = 'Non-vacational';
  } else if (associationName === 'contractual' || associationName === 'temporary (non teaching)') {
    vacationType = 'Non-vacational';
  }

  const leaveTypesQuery = await client.query(
    `
      SELECT UPPER(TRIM(shortname)) AS shortname, MIN(id) AS id
      FROM leaves
      WHERE vacation_type = $1
        AND COALESCE(max_entitlement, 0) > 0
        AND UPPER(TRIM(shortname)) NOT LIKE 'SML%'
        AND UPPER(TRIM(shortname)) <> 'ML'
        AND TRIM(LOWER(status)) = 'active'
      GROUP BY UPPER(TRIM(shortname))
      ORDER BY shortname ASC
    `,
    [vacationType]
  );

  return leaveTypesQuery.rows;
};

const buildRows = (staffRows, entitlementRows, year) => {
  const byStaff = new Map();

  staffRows.forEach((staff) => {
    byStaff.set(Number(staff.id), {
      id: Number(staff.id),
      user_id: Number(staff.user_id || 0) || null,
      name: staff.name || '',
      dept_shortname: staff.dept_shortname || 'N/A',
      year,
      leaves: {}
    });
  });

  entitlementRows.forEach((record) => {
    const staffId = Number(record.staff_id);
    const current = byStaff.get(staffId);
    if (!current) return;

    const entitled = toSafeNumber(record.entitled_curr_year, 0);
    const accumulated = toSafeNumber(record.accumulated, 0);
    const availed = toSafeNumber(record.availed, 0);
    const encashedCurrYear = toSafeNumber(record.encashed_curr_year, 0);
    const totalEncashed = toSafeNumber(record.total_encashed, 0);

    current.leaves[record.shortname] = {
      entitled_curr_year: entitled,
      accumulated,
      availed,
      encashed_curr_year: encashedCurrYear,
      encashed: encashedCurrYear + totalEncashed,
      entitled_accumulated: entitled + accumulated - encashedCurrYear,
      balance: entitled + accumulated - availed - encashedCurrYear
    };
  });

  return Array.from(byStaff.values());
};

const getEntitlementScreenData = async ({ year, departmentId }) => {
  const [leaveTypes, leaveTypesTaken, departments, staffRows] = await Promise.all([
    getLeaveTypes(true),
    getLeaveTypes(false),
    getDepartments(),
    getEligibleStaff(departmentId)
  ]);

  const staffIds = staffRows.map((row) => Number(row.id));
  const entitlementRows = await getEntitlementsForStaff(year, staffIds);
  const rows = buildRows(staffRows, entitlementRows, year);

  return {
    departments,
    leave_types: leaveTypes,
    leave_types_taken: leaveTypesTaken,
    year,
    data: rows
  };
};

const updateEntitlements = async ({ year, staffId, entitled, availed, thisYearEncashedEl, accumulatedEl }) => {
  const numericYear = Number(year);
  const numericStaffId = Number(staffId);

  if (!numericYear || !numericStaffId) {
    const err = new Error('year and staff_id are required');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let leaveTypes = await getUpdateLeaveTypesForStaff(client, numericStaffId);
    if (!leaveTypes.length) {
      leaveTypes = await getLeaveTypes(true);
    }

    // Deduplicate leaveTypes by leaveId (MIN(id) per shortname)
    const uniqueLeaveTypes = [];
    const seenLeaveIds = new Set();
    for (const leaveType of leaveTypes) {
      const leaveId = Number(leaveType.id);
      if (!leaveId || seenLeaveIds.has(leaveId)) continue;
      seenLeaveIds.add(leaveId);
      uniqueLeaveTypes.push(leaveType);
    }

    for (const leaveType of uniqueLeaveTypes) {
      const shortname = leaveType.shortname;
      const leaveId = Number(leaveType.id);

      const entitledValue = toSafeNumber(entitled?.[shortname], 0);
      const availedValue = toSafeNumber(availed?.[shortname], 0);
      const encashedCurrYear = shortname === 'EL' ? toSafeNumber(thisYearEncashedEl, 0) : 0;
      const accumulatedValue = shortname === 'EL' ? toSafeNumber(accumulatedEl, 0) : 0;

      const existing = await client.query(
        `
          SELECT id
          FROM leave_staff_entitlements
          WHERE staff_id = $1 AND year = $2 AND leave_id = $3
          ORDER BY id DESC
          LIMIT 1
        `,
        [numericStaffId, numericYear, leaveId]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `
            UPDATE leave_staff_entitlements
            SET entitled_curr_year = $1,
                consumed_curr_year = $2,
                encashed_curr_year = $3,
                accumulated = $4,
                status = 'active',
                updated_at = NOW()
            WHERE id = $5
          `,
          [entitledValue, availedValue, encashedCurrYear, accumulatedValue, existing.rows[0].id]
        );
      } else {
        await client.query(
          `
            INSERT INTO leave_staff_entitlements
              (year, staff_id, leave_id, entitled_curr_year, accumulated, consumed_curr_year, encashed_curr_year, total_encashed, wef, status, created_at, updated_at)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'active', NOW(), NOW())
          `,
          [numericYear, numericStaffId, leaveId, entitledValue, accumulatedValue, availedValue, encashedCurrYear, `${numericYear}-01-01`]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getEntitlementScreenData,
  updateEntitlements
};
