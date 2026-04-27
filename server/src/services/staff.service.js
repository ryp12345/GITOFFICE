const { pool } = require('../config/db');
const { hashPassword } = require('../utils/hash');

async function listAll() {
  const sql = `
    SELECT s.*,
      (SELECT a.asso_name FROM association_staff ast JOIN associations a ON a.id = ast.association_id WHERE ast.staff_id = s.id AND ast.status = 'active' ORDER BY ast.id DESC LIMIT 1) AS association_name,
      (SELECT d.dept_name FROM department_staff dst JOIN departments d ON d.id = dst.department_id WHERE dst.staff_id = s.id AND dst.status = 'active' ORDER BY dst.id DESC LIMIT 1) AS department_name,
      (SELECT des.design_name FROM designation_staff dst2 JOIN designations des ON des.id = dst2.designation_id WHERE dst2.staff_id = s.id AND dst2.status = 'active' ORDER BY dst2.id DESC LIMIT 1) AS designation_name,
      (SELECT i.name FROM institution_staff ist JOIN institutions i ON i.id = ist.institution_id WHERE ist.staff_id = s.id AND ist.status = 'active' ORDER BY ist.id DESC LIMIT 1) AS institution_name,
      (SELECT et.employee_type FROM employee_types et WHERE et.staff_id = s.id AND et.status = 'active' ORDER BY et.id DESC LIMIT 1) AS emp_type_name
    FROM staff s
    ORDER BY s.created_at DESC, s.id DESC
  `;

  const { rows } = await pool.query(sql);
  return rows;
}

async function create(payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const emailRaw = String(payload.email || payload.emailUser || '').trim();
    if (!emailRaw) {
      const err = new Error('email is required');
      err.statusCode = 400;
      throw err;
    }
    const email = emailRaw.includes('@') ? emailRaw : `${emailRaw}@git.edu`;

    // check existing user
    const { rows: existingUsers } = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existingUsers.length > 0) {
      const err = new Error('User with email already exists');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await hashPassword(payload.password || 'changeme');
    const userInsert = await client.query(
      "INSERT INTO users (email, password, role, status, created_at, updated_at) VALUES ($1, $2, $3, 'Active', NOW(), NOW()) RETURNING id, email",
      [email, passwordHash, payload.role || 'staff']
    );
    const user = userInsert.rows[0];

    const staffFields = [
      'user_id',
      'fname',
      'mname',
      'lname',
      'local_address',
      'permanent_address',
      'dob',
      'doj',
      'religion_id',
      'castecategory_id',
      'gender',
      'date_of_superanuation',
      'bloodgroup',
      'pan_card',
      'adhar_card',
      'contactno',
      'emergency_no',
      'emergency_name'
      , 'employeecode'
    ];

    const staffValues = [
      user.id,
      payload.fname || null,
      payload.mname || null,
      payload.lname || null,
      payload.local_address || null,
      payload.permanent_address || null,
      payload.dob || null,
      payload.doj || null,
      payload.religion_id || null,
      payload.castecategory_id || null,
      payload.gender || null,
      payload.date_of_superanuation || null,
      payload.bloodgroup || null,
      payload.pan_card || null,
      payload.adhar_card || null,
      payload.contactno || null,
      payload.emergency_no || null,
      payload.emergency_name || null
      , payload.employeecode || payload.biometric_code || null
    ];

    const placeholders = staffFields.map((_, i) => `$${i + 1}`);
    const staffSql = `INSERT INTO staff (${staffFields.join(', ')}, created_at, updated_at) VALUES (${placeholders.join(', ')}, NOW(), NOW()) RETURNING *`;
    const staffRes = await client.query(staffSql, staffValues);
    const staff = staffRes.rows[0];

    // create association_staff pivot if associations_id present
    if (payload.associations_id) {
      const startDate = payload.doj || payload.start_date || null;
      await client.query(
        'INSERT INTO association_staff (association_id, staff_id, start_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [payload.associations_id, staff.id, startDate, 'active']
      );
    }

    // create department_staff pivot if departments_id present
    if (payload.departments_id) {
      const startDate = payload.doj || payload.start_date || null;
      await client.query(
        'INSERT INTO department_staff (department_id, staff_id, start_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [payload.departments_id, staff.id, startDate, 'active']
      );
    }

    // create designation_staff pivot if designations_id present
    if (payload.designations_id) {
      const startDate = payload.doj || payload.start_date || null;
      await client.query(
        'INSERT INTO designation_staff (designation_id, staff_id, dept_id, start_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [payload.designations_id, staff.id, payload.departments_id || null, startDate, 'active']
      );
    }

    // create institution_staff pivot if institution_id present
    if (payload.institution_id) {
      const startDate = payload.doj || payload.start_date || new Date().toISOString().slice(0, 10);
      const endDate = payload.end_date || null;
      const reason = payload.institution_reason || 'assigned';
      await client.query(
        'INSERT INTO institution_staff (institution_id, staff_id, start_date, end_date, reason, gcr, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
        [payload.institution_id, staff.id, startDate, endDate, reason, payload.gcr || null, 'active']
      );
    }

    // record employee type
    if (payload.employee_type) {
      await client.query(
        'INSERT INTO employee_types (staff_id, employee_type, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        [staff.id, payload.employee_type, 'active']
      );
    }

    await client.query('COMMIT');
    return { user, staff };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function remove(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT id, user_id FROM staff WHERE id = $1 LIMIT 1', [id]);
    if (!rows || rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const staff = rows[0];
    const sid = staff.id;
    const uid = staff.user_id;

    const tables = [
      'association_staff',
      'department_staff',
      'designation_staff',
      'institution_staff',
      'staffremunerationheads',
      'ntpayscale_staff',
      'ntcpayscale_staff',
      'qualification_staff',
      'leave_staff_applications',
      'leave_staff_entitlements',
      'employee_types'
    ];

    for (const t of tables) {
      await client.query(`DELETE FROM ${t} WHERE staff_id = $1`, [sid]);
    }

    await client.query('DELETE FROM staff WHERE id = $1', [sid]);
    if (uid) {
      await client.query('DELETE FROM users WHERE id = $1', [uid]);
    }

    await client.query('COMMIT');
    return { id: sid, user_id: uid };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getById(id) {
  const sql = `
    SELECT s.*, u.email,
      (SELECT a.asso_name FROM association_staff ast JOIN associations a ON a.id = ast.association_id WHERE ast.staff_id = s.id AND ast.status = 'active' ORDER BY ast.id DESC LIMIT 1) AS association_name,
      (SELECT d.dept_name FROM department_staff dst JOIN departments d ON d.id = dst.department_id WHERE dst.staff_id = s.id AND dst.status = 'active' ORDER BY dst.id DESC LIMIT 1) AS department_name,
      (SELECT des.design_name FROM designation_staff dst2 JOIN designations des ON des.id = dst2.designation_id WHERE dst2.staff_id = s.id AND dst2.status = 'active' ORDER BY dst2.id DESC LIMIT 1) AS designation_name,
      (SELECT i.name FROM institution_staff ist JOIN institutions i ON i.id = ist.institution_id WHERE ist.staff_id = s.id AND ist.status = 'active' ORDER BY ist.id DESC LIMIT 1) AS institution_name,
      (SELECT et.employee_type FROM employee_types et WHERE et.staff_id = s.id AND et.status = 'active' ORDER BY et.id DESC LIMIT 1) AS emp_type_name
    FROM staff s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [id]);
  const staff = rows[0] || null;
  if (!staff) return null;

  // Fetch all association_staff rows for this staff
  const assocSql = `
    SELECT ast.*, a.asso_name as association_name
    FROM association_staff ast
    JOIN associations a ON a.id = ast.association_id
    WHERE ast.staff_id = $1
    ORDER BY ast.id DESC
  `;
  const { rows: association_staff } = await pool.query(assocSql, [id]);
  staff.association_staff = association_staff;

  // Fetch all department_staff rows for this staff
  const deptSql = `
    SELECT dst.*, d.dept_name AS department_name
    FROM department_staff dst
    JOIN departments d ON d.id = dst.department_id
    WHERE dst.staff_id = $1
    ORDER BY dst.id DESC
  `;
  const { rows: department_staff } = await pool.query(deptSql, [id]);
  staff.department_staff = department_staff;

  // Fetch all institution_staff rows for this staff
  const instSql = `
    SELECT ist.*, i.name as institution_name
    FROM institution_staff ist
    JOIN institutions i ON i.id = ist.institution_id
    WHERE ist.staff_id = $1
    ORDER BY ist.id DESC
  `;
  const { rows: institutions } = await pool.query(instSql, [id]);
  staff.institutions = institutions;

  return staff;
}

async function updateById(id, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Only update allowed fields
    const allowed = [
      'fname','mname','lname','local_address','permanent_address','dob','doj','religion_id','castecategory_id','gender','date_of_superanuation','bloodgroup','pan_card','adhar_card','contactno','emergency_no','emergency_name','employeecode','biometric_code','pay_type','fixed_pay','payscale','gcr','duration'
    ];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const key of allowed) {
      if (payload[key] !== undefined) {
        updates.push(`${key} = $${idx}`);
        values.push(payload[key]);
        idx++;
      }
    }
    if (!updates.length) throw new Error('No valid fields to update');
    values.push(id);
    const sql = `UPDATE staff SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    const { rows } = await client.query(sql, values);
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listAssociationsByStaffId(staffId) {
  const sql = `
    SELECT ast.*, a.asso_name AS association_name
    FROM association_staff ast
    JOIN associations a ON a.id = ast.association_id
    WHERE ast.staff_id = $1
    ORDER BY ast.id DESC
  `;
  const { rows } = await pool.query(sql, [staffId]);
  return rows;
}

async function createAssociationForStaff(staffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const associationId = Number(payload.associations_id || payload.association_id);
    const startDate = payload.start_date || null;

    if (!associationId || !startDate) {
      const err = new Error('associations_id and start_date are required');
      err.statusCode = 400;
      throw err;
    }

    const { rows: staffRows } = await client.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [staffId]);
    if (!staffRows.length) {
      const err = new Error('Staff not found');
      err.statusCode = 404;
      throw err;
    }

    const { rows: activeRows } = await client.query(
      `SELECT id
       FROM association_staff
       WHERE staff_id = $1 AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [staffId]
    );

    if (activeRows.length) {
      await client.query(
        `UPDATE association_staff
         SET end_date = $1,
             status = 'inactive',
             updated_at = NOW()
         WHERE id = $2`,
        [startDate, activeRows[0].id]
      );
    }

    const { rows: insertedRows } = await client.query(
      `INSERT INTO association_staff
        (association_id, staff_id, start_date, closing_date, reason, gcr, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
       RETURNING *`,
      [
        associationId,
        staffId,
        startDate,
        payload.closing_date || null,
        payload.reason || null,
        payload.gcr || null,
      ]
    );

    const inserted = insertedRows[0];
    const { rows: joinedRows } = await client.query(
      `SELECT ast.*, a.asso_name AS association_name
       FROM association_staff ast
       JOIN associations a ON a.id = ast.association_id
       WHERE ast.id = $1
       LIMIT 1`,
      [inserted.id]
    );

    await client.query('COMMIT');
    return joinedRows[0] || inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateAssociationForStaff(staffId, associationStaffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existingRows } = await client.query(
      'SELECT * FROM association_staff WHERE id = $1 AND staff_id = $2 LIMIT 1',
      [associationStaffId, staffId]
    );

    if (!existingRows.length) {
      const err = new Error('Association row not found for this staff');
      err.statusCode = 404;
      throw err;
    }

    const allowed = ['association_id', 'associations_id', 'start_date', 'closing_date', 'end_date', 'reason', 'gcr', 'status'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        const column = key === 'associations_id' ? 'association_id' : key;
        updates.push(`${column} = $${idx}`);
        values.push(payload[key]);
        idx++;
      }
    }

    if (!updates.length) {
      const err = new Error('No fields provided to update');
      err.statusCode = 400;
      throw err;
    }

    values.push(associationStaffId, staffId);
    const updateSql = `
      UPDATE association_staff
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND staff_id = $${idx + 1}
      RETURNING *
    `;
    const { rows: updatedRows } = await client.query(updateSql, values);

    const updated = updatedRows[0];
    const { rows: joinedRows } = await client.query(
      `SELECT ast.*, a.asso_name AS association_name
       FROM association_staff ast
       JOIN associations a ON a.id = ast.association_id
       WHERE ast.id = $1
       LIMIT 1`,
      [updated.id]
    );

    await client.query('COMMIT');
    return joinedRows[0] || updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteAssociationForStaff(staffId, associationStaffId) {
  const { rowCount } = await pool.query(
    'DELETE FROM association_staff WHERE id = $1 AND staff_id = $2',
    [associationStaffId, staffId]
  );
  return rowCount > 0;
}

async function listDepartmentsByStaffId(staffId) {
  const sql = `
    SELECT dst.*, d.dept_name AS department_name
    FROM department_staff dst
    JOIN departments d ON d.id = dst.department_id
    WHERE dst.staff_id = $1
    ORDER BY dst.id DESC
  `;
  const { rows } = await pool.query(sql, [staffId]);
  return rows;
}

async function createDepartmentForStaff(staffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const departmentId = Number(payload.department_id || payload.departments_id);
    const startDate = payload.start_date || null;

    if (!departmentId || !startDate) {
      const err = new Error('department_id and start_date are required');
      err.statusCode = 400;
      throw err;
    }

    const { rows: staffRows } = await client.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [staffId]);
    if (!staffRows.length) {
      const err = new Error('Staff not found');
      err.statusCode = 404;
      throw err;
    }

    const { rows: activeRows } = await client.query(
      `SELECT id
       FROM department_staff
       WHERE staff_id = $1 AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [staffId]
    );

    if (activeRows.length) {
      await client.query(
        `UPDATE department_staff
         SET end_date = $1,
             status = 'inactive',
             updated_at = NOW()
         WHERE id = $2`,
        [startDate, activeRows[0].id]
      );
    }

    const { rows: insertedRows } = await client.query(
      `INSERT INTO department_staff
        (department_id, staff_id, start_date, end_date, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, 'active', NOW(), NOW())
       RETURNING *`,
      [
        departmentId,
        staffId,
        startDate,
        payload.end_date || null,
      ]
    );

    const inserted = insertedRows[0];
    const { rows: joinedRows } = await client.query(
      `SELECT dst.*, d.dept_name AS department_name
       FROM department_staff dst
       JOIN departments d ON d.id = dst.department_id
       WHERE dst.id = $1
       LIMIT 1`,
      [inserted.id]
    );

    await client.query('COMMIT');
    return joinedRows[0] || inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateDepartmentForStaff(staffId, departmentStaffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existingRows } = await client.query(
      'SELECT * FROM department_staff WHERE id = $1 AND staff_id = $2 LIMIT 1',
      [departmentStaffId, staffId]
    );

    if (!existingRows.length) {
      const err = new Error('Department row not found for this staff');
      err.statusCode = 404;
      throw err;
    }

    const allowed = ['department_id', 'departments_id', 'start_date', 'end_date', 'status'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        const column = key === 'departments_id' ? 'department_id' : key;
        updates.push(`${column} = $${idx}`);
        values.push(payload[key]);
        idx++;
      }
    }

    if (!updates.length) {
      const err = new Error('No fields provided to update');
      err.statusCode = 400;
      throw err;
    }

    values.push(departmentStaffId, staffId);
    const updateSql = `
      UPDATE department_staff
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND staff_id = $${idx + 1}
      RETURNING *
    `;
    const { rows: updatedRows } = await client.query(updateSql, values);

    const updated = updatedRows[0];
    const { rows: joinedRows } = await client.query(
      `SELECT dst.*, d.dept_name AS department_name
       FROM department_staff dst
       JOIN departments d ON d.id = dst.department_id
       WHERE dst.id = $1
       LIMIT 1`,
      [updated.id]
    );

    await client.query('COMMIT');
    return joinedRows[0] || updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteDepartmentForStaff(staffId, departmentStaffId) {
  const { rowCount } = await pool.query(
    'DELETE FROM department_staff WHERE id = $1 AND staff_id = $2',
    [departmentStaffId, staffId]
  );
  return rowCount > 0;
}

async function listInstitutionsByStaffId(staffId) {
  const sql = `
    SELECT ist.*, i.name AS institution_name
    FROM institution_staff ist
    JOIN institutions i ON i.id = ist.institution_id
    WHERE ist.staff_id = $1
    ORDER BY ist.id DESC
  `;
  const { rows } = await pool.query(sql, [staffId]);
  return rows;
}

async function createInstitutionForStaff(staffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const institutionId = Number(payload.institution_id || payload.institutions_id);
    const startDate = payload.start_date || null;

    if (!institutionId || !startDate) {
      const err = new Error('institution_id and start_date are required');
      err.statusCode = 400;
      throw err;
    }

    const { rows: staffRows } = await client.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [staffId]);
    if (!staffRows.length) {
      const err = new Error('Staff not found');
      err.statusCode = 404;
      throw err;
    }

    const { rows: activeRows } = await client.query(
      `SELECT id
       FROM institution_staff
       WHERE staff_id = $1 AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [staffId]
    );

    if (activeRows.length) {
      await client.query(
        `UPDATE institution_staff
         SET end_date = $1,
             status = 'inactive',
             updated_at = NOW()
         WHERE id = $2`,
        [startDate, activeRows[0].id]
      );
    }

    const { rows: insertedRows } = await client.query(
      `INSERT INTO institution_staff
        (institution_id, staff_id, start_date, end_date, reason, gcr, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
       RETURNING *`,
      [
        institutionId,
        staffId,
        startDate,
        payload.end_date || null,
        payload.reason || null,
        payload.gcr || null,
      ]
    );

    const inserted = insertedRows[0];
    const { rows: joinedRows } = await client.query(
      `SELECT ist.*, i.name AS institution_name
       FROM institution_staff ist
       JOIN institutions i ON i.id = ist.institution_id
       WHERE ist.id = $1
       LIMIT 1`,
      [inserted.id]
    );

    await client.query('COMMIT');
    return joinedRows[0] || inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateInstitutionForStaff(staffId, institutionStaffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existingRows } = await client.query(
      'SELECT * FROM institution_staff WHERE id = $1 AND staff_id = $2 LIMIT 1',
      [institutionStaffId, staffId]
    );

    if (!existingRows.length) {
      const err = new Error('Institution row not found for this staff');
      err.statusCode = 404;
      throw err;
    }

    const allowed = ['institution_id', 'institutions_id', 'start_date', 'end_date', 'reason', 'gcr', 'status'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        const column = key === 'institutions_id' ? 'institution_id' : key;
        updates.push(`${column} = $${idx}`);
        values.push(payload[key]);
        idx++;
      }
    }

    if (!updates.length) {
      const err = new Error('No fields provided to update');
      err.statusCode = 400;
      throw err;
    }

    values.push(institutionStaffId, staffId);
    const updateSql = `
      UPDATE institution_staff
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND staff_id = $${idx + 1}
      RETURNING *
    `;
    const { rows: updatedRows } = await client.query(updateSql, values);

    const updated = updatedRows[0];
    const { rows: joinedRows } = await client.query(
      `SELECT ist.*, i.name AS institution_name
       FROM institution_staff ist
       JOIN institutions i ON i.id = ist.institution_id
       WHERE ist.id = $1
       LIMIT 1`,
      [updated.id]
    );

    await client.query('COMMIT');
    return joinedRows[0] || updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteInstitutionForStaff(staffId, institutionStaffId) {
  const { rowCount } = await pool.query(
    'DELETE FROM institution_staff WHERE id = $1 AND staff_id = $2',
    [institutionStaffId, staffId]
  );
  return rowCount > 0;
}

// ── Annual Increment ──────────────────────────────────────────────────────────

async function listAnnualIncrementsByStaffId(staffId) {
  const sql = `
    SELECT *
    FROM annual_increments
    WHERE staff_id = $1
    ORDER BY id ASC
  `;
  const { rows } = await pool.query(sql, [staffId]);
  return rows;
}

async function createAnnualIncrementForStaff(staffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: staffRows } = await client.query('SELECT id, date_of_increment FROM staff WHERE id = $1 LIMIT 1', [staffId]);
    if (!staffRows.length) {
      const err = new Error('Staff not found');
      err.statusCode = 404;
      throw err;
    }

    const wef = payload.wef || null;
    const gc = payload.gc || null;
    const reason = payload.reason || null;
    const basic = payload.basic ? Number(payload.basic) : null;
    const additionalDays = payload.additional_days ? parseInt(payload.additional_days, 10) : 0;
    const additionalDaysType = payload.additional_days_type || 'Permanent';

    if (!wef || !gc || !reason || basic === null) {
      const err = new Error('wef, gc, reason and basic are required');
      err.statusCode = 400;
      throw err;
    }

    const { rows: inserted } = await client.query(
      `INSERT INTO annual_increments
        (staff_id, wef, additional_days, additional_days_type, gc, reason, basic, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [staffId, wef, additionalDays, additionalDaysType, gc, reason, basic]
    );

    // Mirror Laravel logic: update date_of_increment when reason is Regular Annual Increment
    if (reason === 'Regular Annual Increment') {
      const currentDoi = staffRows[0].date_of_increment;
      if (currentDoi) {
        let daysToAdd = 0;
        if (additionalDaysType === 'Permanent') {
          daysToAdd = 365 + additionalDays;
        } else {
          daysToAdd = additionalDays;
        }
        await client.query(
          `UPDATE staff SET date_of_increment = (date_of_increment::date + ($1 || ' days')::interval)::date WHERE id = $2`,
          [daysToAdd, staffId]
        );
      }
    }

    await client.query('COMMIT');
    return inserted[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateAnnualIncrementForStaff(staffId, incrementId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existingRows } = await client.query(
      'SELECT * FROM annual_increments WHERE id = $1 AND staff_id = $2 LIMIT 1',
      [incrementId, staffId]
    );

    if (!existingRows.length) {
      const err = new Error('Annual increment not found for this staff');
      err.statusCode = 404;
      throw err;
    }

    const existing = existingRows[0];
    const allowed = ['wef', 'additional_days', 'additional_days_type', 'gc', 'reason', 'basic'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        updates.push(`${key} = $${idx}`);
        values.push(payload[key]);
        idx++;
      }
    }

    if (!updates.length) {
      const err = new Error('No fields provided to update');
      err.statusCode = 400;
      throw err;
    }

    values.push(incrementId, staffId);
    const { rows: updatedRows } = await client.query(
      `UPDATE annual_increments SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} AND staff_id = $${idx + 1}
       RETURNING *`,
      values
    );

    // Mirror Laravel update logic: adjust date_of_increment if Permanent and additional_days changed
    const newReason = payload.reason !== undefined ? payload.reason : existing.reason;
    const newAdditionalDays = payload.additional_days !== undefined ? parseInt(payload.additional_days, 10) : parseInt(existing.additional_days, 10);
    const newAdditionalDaysType = payload.additional_days_type !== undefined ? payload.additional_days_type : existing.additional_days_type;
    const oldAdditionalDays = parseInt(existing.additional_days, 10);

    if (
      newReason === 'Regular Annual Increment' &&
      newAdditionalDaysType === 'Permanent' &&
      newAdditionalDays !== oldAdditionalDays
    ) {
      const diff = newAdditionalDays - oldAdditionalDays;
      await client.query(
        `UPDATE staff SET date_of_increment = (date_of_increment::date + ($1 || ' days')::interval)::date WHERE id = $2`,
        [diff, staffId]
      );
    }

    await client.query('COMMIT');
    return updatedRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteAnnualIncrementForStaff(staffId, incrementId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existingRows } = await client.query(
      'SELECT * FROM annual_increments WHERE id = $1 AND staff_id = $2 LIMIT 1',
      [incrementId, staffId]
    );

    if (!existingRows.length) {
      await client.query('COMMIT');
      return false;
    }

    const existing = existingRows[0];

    // Mirror Laravel delete logic: reverse date_of_increment change
    if (existing.reason === 'Regular Annual Increment') {
      const additionalDays = parseInt(existing.additional_days, 10) || 0;
      let daysToSubtract = 0;
      if (existing.additional_days_type === 'Permanent') {
        daysToSubtract = 365 + additionalDays;
      } else {
        daysToSubtract = additionalDays;
      }
      await client.query(
        `UPDATE staff SET date_of_increment = (date_of_increment::date - ($1 || ' days')::interval)::date WHERE id = $2`,
        [daysToSubtract, staffId]
      );
    }

    const { rowCount } = await client.query(
      'DELETE FROM annual_increments WHERE id = $1 AND staff_id = $2',
      [incrementId, staffId]
    );

    await client.query('COMMIT');
    return rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Laptop Loan ───────────────────────────────────────────────────────────────

async function listLaptopLoansByStaffId(staffId) {
  const { rows } = await pool.query(
    'SELECT * FROM laptoploans WHERE staff_id = $1 ORDER BY id ASC',
    [staffId]
  );
  return rows;
}

async function createLaptopLoanForStaff(staffId, payload) {
  const dateOfApplication = payload.date_of_application || null;
  const configuration = payload.configuration || null;
  const amount = payload.amount !== undefined ? parseInt(payload.amount, 10) : null;
  const emi = payload.emi !== undefined ? parseInt(payload.emi, 10) : null;
  const startDate = payload.start_date || null;

  if (!dateOfApplication || !configuration || amount === null || emi === null || !startDate) {
    const err = new Error('date_of_application, configuration, amount, emi and start_date are required');
    err.statusCode = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO laptoploans (staff_id, date_of_application, configuration, amount, emi, start_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [staffId, dateOfApplication, configuration, amount, emi, startDate]
  );
  return rows[0];
}

async function updateLaptopLoanForStaff(staffId, loanId, payload) {
  const { rows: existingRows } = await pool.query(
    'SELECT * FROM laptoploans WHERE id = $1 AND staff_id = $2 LIMIT 1',
    [loanId, staffId]
  );

  if (!existingRows.length) {
    const err = new Error('Laptop loan not found for this staff');
    err.statusCode = 404;
    throw err;
  }

  const allowed = ['date_of_application', 'configuration', 'amount', 'emi', 'start_date'];
  const updates = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx++;
    }
  }

  if (!updates.length) {
    const err = new Error('No fields provided to update');
    err.statusCode = 400;
    throw err;
  }

  values.push(loanId, staffId);
  const { rows } = await pool.query(
    `UPDATE laptoploans SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND staff_id = $${idx + 1}
     RETURNING *`,
    values
  );
  return rows[0];
}

async function deleteLaptopLoanForStaff(staffId, loanId) {
  const { rowCount } = await pool.query(
    'DELETE FROM laptoploans WHERE id = $1 AND staff_id = $2',
    [loanId, staffId]
  );
  return rowCount > 0;
}

module.exports = {
  listAll,
  create,
  remove,
  getById,
  updateById,
  listAssociationsByStaffId,
  createAssociationForStaff,
  updateAssociationForStaff,
  deleteAssociationForStaff,
  listDepartmentsByStaffId,
  createDepartmentForStaff,
  updateDepartmentForStaff,
  deleteDepartmentForStaff,
  listInstitutionsByStaffId,
  createInstitutionForStaff,
  updateInstitutionForStaff,
  deleteInstitutionForStaff,
  listAnnualIncrementsByStaffId,
  createAnnualIncrementForStaff,
  updateAnnualIncrementForStaff,
  deleteAnnualIncrementForStaff,
  listLaptopLoansByStaffId,
  createLaptopLoanForStaff,
  updateLaptopLoanForStaff,
  deleteLaptopLoanForStaff,
};
