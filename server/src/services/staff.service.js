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

module.exports = { listAll, create, remove };
