const { pool } = require('../config/db');

async function getEmployeeType(staffId) {
  const { rows } = await pool.query(
    `SELECT et.employee_type
     FROM employee_types et
     WHERE et.staff_id = $1
       AND COALESCE(et.status, 'active') = 'active'
     ORDER BY et.id DESC
     LIMIT 1`,
    [staffId]
  );
  return rows[0]?.employee_type || '';
}

async function listDesignationRows(staffId) {
  const primarySql = `
    SELECT ds.id,
           ds.staff_id,
           ds.designation_id,
           d.design_name AS designation_name,
           ds.start_date,
           ds.end_date,
           COALESCE(ds.reason, NULL) AS reason,
           COALESCE(ds.gcr, NULL) AS gcr,
           COALESCE(ds.allowance_status, NULL) AS allowance_status,
           COALESCE(ds.status, 'active') AS status,
           ds.created_at,
           ds.updated_at,
           COALESCE(d.isadditional, 0) AS isadditional
    FROM designation_staff ds
    JOIN designations d ON d.id = ds.designation_id
    WHERE ds.staff_id = $1
    ORDER BY ds.id DESC
  `;

  const fallbackSql = `
    SELECT ds.id,
           ds.staff_id,
           ds.designation_id,
           d.design_name AS designation_name,
           ds.start_date,
           ds.end_date,
           COALESCE(ds.reason, NULL) AS reason,
           COALESCE(ds.gcr, NULL) AS gcr,
           NULL::text AS allowance_status,
           COALESCE(ds.status, 'active') AS status,
           ds.created_at,
           ds.updated_at,
           COALESCE(d.isadditional, 0) AS isadditional
    FROM designation_staff ds
    JOIN designations d ON d.id = ds.designation_id
    WHERE ds.staff_id = $1
    ORDER BY ds.id DESC
  `;

  try {
    const { rows } = await pool.query(primarySql, [staffId]);
    return rows;
  } catch (err) {
    if (!/allowance_status/i.test(String(err?.message || ''))) {
      throw err;
    }

    const { rows } = await pool.query(fallbackSql, [staffId]);
    return rows;
  }
}

async function listTeachingPayscaleRows(staffId) {
  const queries = [
    `
      SELECT tps.id,
             'teaching_payscale'::text AS pay_record_type,
             'Payscale'::text AS pay_type,
             tps.staff_id,
             COALESCE(tps.teaching_payscale_id, tps.teaching_payscales_id) AS payscale_id,
             tp.payscale_title AS payscale_title,
             NULL::text AS payscale_level,
             NULL::numeric AS pay,
             tps.start_date,
             tps.end_date,
             COALESCE(tps.reason, NULL) AS reason,
             COALESCE(tps.gcr, NULL) AS gcr,
             COALESCE(tps.status, 'active') AS status,
             tps.created_at,
             tps.updated_at
      FROM teaching_payscale_staff tps
      LEFT JOIN teaching_payscales tp ON tp.id = COALESCE(tps.teaching_payscale_id, tps.teaching_payscales_id)
      WHERE tps.staff_id = $1
    `,
    `
      SELECT stp.id,
             'teaching_payscale'::text AS pay_record_type,
             'Payscale'::text AS pay_type,
             stp.staff_id,
             COALESCE(stp.teaching_payscale_id, stp.teaching_payscales_id) AS payscale_id,
             tp.payscale_title AS payscale_title,
             NULL::text AS payscale_level,
             NULL::numeric AS pay,
             stp.start_date,
             stp.end_date,
             NULL::text AS reason,
             NULL::text AS gcr,
             COALESCE(stp.status, 'active') AS status,
             stp.created_at,
             stp.updated_at
      FROM staff_teaching_payscale stp
      LEFT JOIN teaching_payscales tp ON tp.id = COALESCE(stp.teaching_payscale_id, stp.teaching_payscales_id)
      WHERE stp.staff_id = $1
    `,
    `
      SELECT stp.id,
             'teaching_payscale'::text AS pay_record_type,
             'Payscale'::text AS pay_type,
             stp.staff_id,
             stp.teaching_payscale_id AS payscale_id,
             tp.payscale_title AS payscale_title,
             NULL::text AS payscale_level,
             NULL::numeric AS pay,
             stp.start_date,
             stp.end_date,
             COALESCE(stp.reason, NULL) AS reason,
             COALESCE(stp.gcr, NULL) AS gcr,
             COALESCE(stp.status, 'active') AS status,
             stp.created_at,
             stp.updated_at
      FROM staff_teaching_payscale stp
      LEFT JOIN teaching_payscales tp ON tp.id = stp.teaching_payscale_id
      WHERE stp.staff_id = $1
    `,
  ];

  const rows = [];
  const seen = new Set();

  for (const query of queries) {
    try {
      const { rows: result } = await pool.query(query, [staffId]);
      for (const row of result) {
        const key = `${row.pay_record_type}:${row.id}:${row.staff_id}:${row.start_date || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
    } catch (_err) {
      // skip missing tables/columns to keep compatibility with existing DB states
    }
  }

  return rows;
}

async function insertTeachingPayscaleRow(client, staffId, teachingPayId, startDate, payload) {
  const statements = [
    {
      sql: `INSERT INTO teaching_payscale_staff
              (staff_id, teaching_payscale_id, start_date, end_date, reason, gcr, status, created_at, updated_at)
            VALUES
              ($1, $2, $3, NULL, $4, $5, 'active', NOW(), NOW())`,
      values: [staffId, teachingPayId, startDate, payload.reason || null, payload.gcr || null],
    },
    {
      sql: `INSERT INTO staff_teaching_payscale
              (staff_id, teaching_payscale_id, start_date, end_date, reason, gcr, status, created_at, updated_at)
            VALUES
              ($1, $2, $3, NULL, $4, $5, 'active', NOW(), NOW())`,
      values: [staffId, teachingPayId, startDate, payload.reason || null, payload.gcr || null],
    },
    {
      sql: `INSERT INTO staff_teaching_payscale
              (staff_id, teaching_payscales_id, start_date, end_date, reason, gcr, status, created_at, updated_at)
            VALUES
              ($1, $2, $3, NULL, $4, $5, 'active', NOW(), NOW())`,
      values: [staffId, teachingPayId, startDate, payload.reason || null, payload.gcr || null],
    },
    {
      sql: `INSERT INTO staff_teaching_payscale
              (staff_id, teaching_payscale_id, start_date, end_date, status, created_at, updated_at)
            VALUES
              ($1, $2, $3, NULL, 'active', NOW(), NOW())`,
      values: [staffId, teachingPayId, startDate],
    },
    {
      sql: `INSERT INTO staff_teaching_payscale
              (staff_id, teaching_payscales_id, start_date, end_date, status, created_at, updated_at)
            VALUES
              ($1, $2, $3, NULL, 'active', NOW(), NOW())`,
      values: [staffId, teachingPayId, startDate],
    },
  ];

  let lastError = null;

  for (const statement of statements) {
    try {
      await client.query(statement.sql, statement.values);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

async function updateTeachingPayscaleRow(staffId, payRowId, payload) {
  if (payload.payscales_id !== undefined) {
    if (payload.teaching_payscale_id === undefined) {
      payload.teaching_payscale_id = payload.payscales_id;
    }
    if (payload.teaching_payscales_id === undefined) {
      payload.teaching_payscales_id = payload.payscales_id;
    }
  }

  const variants = [
    {
      table: 'teaching_payscale_staff',
      fields: ['teaching_payscale_id', 'teaching_payscales_id', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
    {
      table: 'staff_teaching_payscale',
      fields: ['teaching_payscale_id', 'teaching_payscales_id', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
    {
      table: 'staff_teaching_payscale',
      fields: ['teaching_payscales_id', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
    {
      table: 'staff_teaching_payscale',
      fields: ['teaching_payscale_id', 'start_date', 'end_date', 'status'],
    },
    {
      table: 'staff_teaching_payscale',
      fields: ['teaching_payscales_id', 'start_date', 'end_date', 'status'],
    },
  ];

  let lastError = null;

  for (const variant of variants) {
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of variant.fields) {
      if (payload[key] !== undefined) {
        updates.push(`${key} = $${idx}`);
        values.push(payload[key]);
        idx += 1;
      }
    }

    if (!updates.length) {
      continue;
    }

    values.push(payRowId, staffId);

    try {
      const { rows } = await pool.query(
        `UPDATE ${variant.table}
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${idx} AND staff_id = $${idx + 1}
         RETURNING *`,
        values
      );

      if (rows.length) {
        return rows[0];
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  const err = new Error('Payscale row not found');
  err.statusCode = 404;
  throw err;
}

async function deleteTeachingPayscaleRow(staffId, payRowId) {
  const tables = ['teaching_payscale_staff', 'staff_teaching_payscale'];
  let lastError = null;

  for (const table of tables) {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM ${table} WHERE id = $1 AND staff_id = $2`,
        [payRowId, staffId]
      );

      if (rowCount > 0) {
        return true;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return false;
}

async function listDesignationPayscaleByStaffId(staffId) {
  const designationRows = await listDesignationRows(staffId);

  const ntPaySql = `
    SELECT nps.id,
           'nt_payscale'::text AS pay_record_type,
           'Payscale'::text AS pay_type,
           nps.staff_id,
           nps.ntpayscale_id AS payscale_id,
           np.title AS payscale_title,
           COALESCE(nps.level::text, NULL) AS payscale_level,
           NULL::numeric AS pay,
           nps.start_date,
           nps.end_date,
           COALESCE(nps.reason, NULL) AS reason,
           COALESCE(nps.gcr, NULL) AS gcr,
           COALESCE(nps.status, 'active') AS status,
           nps.created_at,
           nps.updated_at
    FROM ntpayscale_staff nps
    LEFT JOIN ntpayscales np ON np.id = nps.ntpayscale_id
    WHERE nps.staff_id = $1
  `;

  const ntcPaySql = `
    SELECT ncs.id,
           'ntc_payscale'::text AS pay_record_type,
           'Consolidated'::text AS pay_type,
           ncs.staff_id,
           ncs.ntcpayscale_id AS payscale_id,
           CONCAT('Base ', ncp.basepay, ' + Allowance ', ncp.allowance) AS payscale_title,
           NULL::text AS payscale_level,
           ncp.basepay::numeric AS pay,
           ncs.start_date,
           ncs.end_date,
           COALESCE(ncs.reason, NULL) AS reason,
           COALESCE(ncs.gcr, NULL) AS gcr,
           COALESCE(ncs.status, 'active') AS status,
           ncs.created_at,
           ncs.updated_at
    FROM ntcpayscale_staff ncs
    LEFT JOIN ntcpayscales ncp ON ncp.id = ncs.ntcpayscale_id
    WHERE ncs.staff_id = $1
  `;

  const consolidatedTeachingSql = `
    SELECT ctp.id,
           'consolidated_teaching'::text AS pay_record_type,
           'Consolidated'::text AS pay_type,
           ctp.staff_id,
           NULL::integer AS payscale_id,
           NULL::text AS payscale_title,
           NULL::text AS payscale_level,
           ctp.pay::numeric AS pay,
           ctp.start_date,
           ctp.end_date,
           COALESCE(ctp.reason, NULL) AS reason,
           COALESCE(ctp.gcr, NULL) AS gcr,
           COALESCE(ctp.status, 'active') AS status,
           ctp.created_at,
           ctp.updated_at
    FROM consolidated_teaching_pays ctp
    WHERE ctp.staff_id = $1
  `;

  const fixedNtSql = `
    SELECT fnp.id,
           'fixed_nt'::text AS pay_record_type,
           'Fixed'::text AS pay_type,
           fnp.staff_id,
           NULL::integer AS payscale_id,
           NULL::text AS payscale_title,
           NULL::text AS payscale_level,
           fnp.pay::numeric AS pay,
           fnp.start_date,
           fnp.end_date,
           COALESCE(fnp.reason, NULL) AS reason,
           COALESCE(fnp.gcr, NULL) AS gcr,
           COALESCE(fnp.status, 'active') AS status,
           fnp.created_at,
           fnp.updated_at
    FROM fixed_nt_pays fnp
    WHERE fnp.staff_id = $1
  `;

  const payQueries = [ntPaySql, ntcPaySql, consolidatedTeachingSql, fixedNtSql];
  const payRows = await listTeachingPayscaleRows(staffId);

  for (const q of payQueries) {
    try {
      const { rows } = await pool.query(q, [staffId]);
      payRows.push(...rows);
    } catch (_e) {
      // skip missing tables/columns to keep compatibility with existing DB states
    }
  }

  payRows.sort((a, b) => {
    const da = new Date(a.start_date || a.created_at || 0).getTime();
    const db = new Date(b.start_date || b.created_at || 0).getTime();
    return db - da;
  });

  const additionalDesignations = designationRows.filter((r) => Number(r.isadditional) === 1);
  const designationHistory = designationRows.filter((r) => Number(r.isadditional) !== 1);

  return {
    employeeType: await getEmployeeType(staffId),
    designations: designationHistory,
    payscales: payRows,
    additionalDesignations,
  };
}

async function closeActivePayRecords(client, staffId, startDate) {
  const updates = [
    `UPDATE teaching_payscale_staff SET end_date = $1, status = 'inactive', updated_at = NOW() WHERE staff_id = $2 AND LOWER(COALESCE(status,'active')) = 'active'`,
    `UPDATE staff_teaching_payscale SET end_date = $1, status = 'inactive', updated_at = NOW() WHERE staff_id = $2 AND LOWER(COALESCE(status,'active')) = 'active'`,
    `UPDATE ntpayscale_staff SET end_date = $1, status = 'inactive', updated_at = NOW() WHERE staff_id = $2 AND LOWER(COALESCE(status,'active')) = 'active'`,
    `UPDATE ntcpayscale_staff SET end_date = $1, status = 'inactive', updated_at = NOW() WHERE staff_id = $2 AND LOWER(COALESCE(status,'active')) = 'active'`,
    `UPDATE consolidated_teaching_pays SET end_date = $1, status = 'inactive', updated_at = NOW() WHERE staff_id = $2 AND LOWER(COALESCE(status,'active')) = 'active'`,
    `UPDATE fixed_nt_pays SET end_date = $1, status = 'inactive', updated_at = NOW() WHERE staff_id = $2 AND LOWER(COALESCE(status,'active')) = 'active'`,
  ];

  for (const q of updates) {
    try {
      await client.query(q, [startDate, staffId]);
    } catch (_e) {
      // skip missing tables/columns for compatibility
    }
  }
}

async function changeDesignationPayscaleForStaff(staffId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const designationId = Number(payload.designations_id || payload.designation_id);
    const payType = String(payload.pay_type || '').trim();
    const startDate = payload.start_date || null;

    if (!designationId || !payType || !startDate) {
      const err = new Error('designations_id, pay_type, and start_date are required');
      err.statusCode = 400;
      throw err;
    }

    const { rows: staffRows } = await client.query(
      `SELECT s.id,
              (
                SELECT et.employee_type
                FROM employee_types et
                WHERE et.staff_id = s.id
                  AND COALESCE(et.status, 'active') = 'active'
                ORDER BY et.id DESC
                LIMIT 1
              ) AS employee_type
       FROM staff s
       WHERE s.id = $1
       LIMIT 1`,
      [staffId]
    );
    if (!staffRows.length) {
      const err = new Error('Staff not found');
      err.statusCode = 404;
      throw err;
    }

    await client.query(
      `UPDATE designation_staff ds
       SET end_date = $1,
           status = 'inactive',
           updated_at = NOW()
       WHERE ds.staff_id = $2
         AND LOWER(COALESCE(ds.status,'active')) = 'active'
         AND ds.designation_id IN (
           SELECT id FROM designations WHERE COALESCE(isadditional, 0) = 0
         )`,
      [startDate, staffId]
    );

    const { rows: deptRows } = await client.query(
      `SELECT department_id
       FROM department_staff
       WHERE staff_id = $1 AND LOWER(COALESCE(status,'active')) = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [staffId]
    );

    const deptId = deptRows[0]?.department_id || null;

    await client.query(
      `INSERT INTO designation_staff
        (designation_id, staff_id, dept_id, start_date, end_date, reason, gcr, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, NULL, $5, $6, 'active', NOW(), NOW())`,
      [designationId, staffId, deptId, startDate, payload.reason || null, payload.gcr || null]
    );

    await closeActivePayRecords(client, staffId, startDate);

    const employeeType = String(staffRows[0].employee_type || '').trim();

    if (payType === 'Payscale') {
      if (employeeType === 'Teaching') {
        const teachingPayId = Number(payload.payscales_id || payload.payscale_id);
        if (!teachingPayId) {
          const err = new Error('payscales_id is required for Teaching Payscale');
          err.statusCode = 400;
          throw err;
        }
        await insertTeachingPayscaleRow(client, staffId, teachingPayId, startDate, payload);
      } else {
        const ntPayId = Number(payload.payscales_id || payload.payscale_id);
        if (!ntPayId) {
          const err = new Error('payscales_id is required for Non-Teaching Payscale');
          err.statusCode = 400;
          throw err;
        }
        await client.query(
          `INSERT INTO ntpayscale_staff
            (staff_id, ntpayscale_id, level, start_date, end_date, reason, gcr, status, created_at, updated_at)
           VALUES
            ($1, $2, $3, $4, NULL, $5, $6, 'active', NOW(), NOW())`,
          [
            staffId,
            ntPayId,
            payload.payscale_level || null,
            startDate,
            payload.reason || null,
            payload.gcr || null,
          ]
        );
      }
    } else if (payType === 'Consolidated') {
      if (employeeType === 'Teaching') {
        const pay = payload.pay || payload.consolidated_pay || null;
        if (!pay) {
          const err = new Error('consolidated_pay is required for Teaching Consolidated');
          err.statusCode = 400;
          throw err;
        }
        await client.query(
          `INSERT INTO consolidated_teaching_pays
            (staff_id, pay, start_date, end_date, reason, gcr, status, created_at, updated_at)
           VALUES
            ($1, $2, $3, NULL, $4, $5, 'active', NOW(), NOW())`,
          [staffId, pay, startDate, payload.reason || null, payload.gcr || null]
        );
      } else {
        const ntcPayId = Number(payload.payscales_id || payload.payscale_id);
        if (!ntcPayId) {
          const err = new Error('payscales_id is required for Non-Teaching Consolidated');
          err.statusCode = 400;
          throw err;
        }
        await client.query(
          `INSERT INTO ntcpayscale_staff
            (staff_id, ntcpayscale_id, start_date, end_date, reason, gcr, status, created_at, updated_at)
           VALUES
            ($1, $2, $3, NULL, $4, $5, 'active', NOW(), NOW())`,
          [staffId, ntcPayId, startDate, payload.reason || null, payload.gcr || null]
        );
      }
    } else if (payType === 'Fixed') {
      const fixedPay = payload.fixed_pay || payload.pay || null;
      if (!fixedPay) {
        const err = new Error('fixed_pay is required for Fixed pay type');
        err.statusCode = 400;
        throw err;
      }
      await client.query(
        `INSERT INTO fixed_nt_pays
          (staff_id, pay, start_date, end_date, reason, gcr, status, created_at, updated_at)
         VALUES
          ($1, $2, $3, NULL, $4, $5, 'active', NOW(), NOW())`,
        [staffId, fixedPay, startDate, payload.reason || null, payload.gcr || null]
      );
    } else {
      const err = new Error('Invalid pay_type. Allowed values: Payscale, Consolidated, Fixed');
      err.statusCode = 400;
      throw err;
    }

    await client.query(
      `UPDATE staff
       SET pay_type = $1,
           fixed_pay = $2,
           payscale = $3,
           gcr = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        payType,
        payType === 'Fixed' ? (payload.fixed_pay || payload.pay || null) : null,
        payload.payscales_id || payload.payscale_id || null,
        payload.gcr || null,
        staffId,
      ]
    );

    await client.query('COMMIT');
    return listDesignationPayscaleByStaffId(staffId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateStaffDesignationRow(staffId, designationRowId, payload) {
  const allowed = ['designation_id', 'start_date', 'end_date', 'reason', 'gcr', 'status'];
  const updates = [];
  const values = [];
  let idx = 1;

  if (payload.designations_id !== undefined && payload.designation_id === undefined) {
    payload.designation_id = payload.designations_id;
  }

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx += 1;
    }
  }

  if (!updates.length) {
    const err = new Error('No fields provided to update');
    err.statusCode = 400;
    throw err;
  }

  values.push(designationRowId, staffId);
  const { rows } = await pool.query(
    `UPDATE designation_staff
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND staff_id = $${idx + 1}
     RETURNING *`,
    values
  );

  if (!rows.length) {
    const err = new Error('Designation row not found');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
}

async function deleteStaffDesignationRow(staffId, designationRowId) {
  const { rowCount } = await pool.query(
    'DELETE FROM designation_staff WHERE id = $1 AND staff_id = $2',
    [designationRowId, staffId]
  );
  return rowCount > 0;
}

function getPayscaleTableMeta(payRecordType) {
  const map = {
    teaching_payscale: {
      table: 'teaching_payscale_staff',
      idColumn: 'id',
      fields: ['teaching_payscale_id', 'teaching_payscales_id', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
    nt_payscale: {
      table: 'ntpayscale_staff',
      idColumn: 'id',
      fields: ['ntpayscale_id', 'level', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
    ntc_payscale: {
      table: 'ntcpayscale_staff',
      idColumn: 'id',
      fields: ['ntcpayscale_id', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
    consolidated_teaching: {
      table: 'consolidated_teaching_pays',
      idColumn: 'id',
      fields: ['pay', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
    fixed_nt: {
      table: 'fixed_nt_pays',
      idColumn: 'id',
      fields: ['pay', 'start_date', 'end_date', 'reason', 'gcr', 'status'],
    },
  };

  return map[payRecordType] || null;
}

async function updateStaffPayscaleRow(staffId, payRecordType, payRowId, payload) {
  if (payRecordType === 'teaching_payscale') {
    return updateTeachingPayscaleRow(staffId, payRowId, payload);
  }

  const meta = getPayscaleTableMeta(payRecordType);
  if (!meta) {
    const err = new Error('Invalid pay record type');
    err.statusCode = 400;
    throw err;
  }

  if (payload.payscales_id !== undefined) {
    if (payRecordType === 'teaching_payscale') {
      payload.teaching_payscale_id = payload.payscales_id;
    } else if (payRecordType === 'nt_payscale') {
      payload.ntpayscale_id = payload.payscales_id;
    } else if (payRecordType === 'ntc_payscale') {
      payload.ntcpayscale_id = payload.payscales_id;
    }
  }

  if (payload.payscale_level !== undefined && payload.level === undefined) {
    payload.level = payload.payscale_level;
  }
  if (payload.fixed_pay !== undefined && payload.pay === undefined) {
    payload.pay = payload.fixed_pay;
  }
  if (payload.consolidated_pay !== undefined && payload.pay === undefined) {
    payload.pay = payload.consolidated_pay;
  }

  const updates = [];
  const values = [];
  let idx = 1;

  for (const key of meta.fields) {
    if (payload[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx += 1;
    }
  }

  if (!updates.length) {
    const err = new Error('No fields provided to update');
    err.statusCode = 400;
    throw err;
  }

  values.push(payRowId, staffId);
  const { rows } = await pool.query(
    `UPDATE ${meta.table}
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE ${meta.idColumn} = $${idx} AND staff_id = $${idx + 1}
     RETURNING *`,
    values
  );

  if (!rows.length) {
    const err = new Error('Payscale row not found');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
}

async function deleteStaffPayscaleRow(staffId, payRecordType, payRowId) {
  if (payRecordType === 'teaching_payscale') {
    return deleteTeachingPayscaleRow(staffId, payRowId);
  }

  const meta = getPayscaleTableMeta(payRecordType);
  if (!meta) {
    const err = new Error('Invalid pay record type');
    err.statusCode = 400;
    throw err;
  }

  const { rowCount } = await pool.query(
    `DELETE FROM ${meta.table} WHERE ${meta.idColumn} = $1 AND staff_id = $2`,
    [payRowId, staffId]
  );

  return rowCount > 0;
}

async function listAdditionalDesignationsByStaffId(staffId) {
  const { rows } = await pool.query(
    `SELECT ds.id,
            ds.staff_id,
            ds.designation_id,
            d.design_name AS designation_name,
            ds.dept_id,
            dept.dept_name AS department_name,
            ds.start_date,
            ds.end_date,
            COALESCE(ds.allowance_status, 'no') AS allowance_status,
            COALESCE(ds.gcr, NULL) AS gcr,
            COALESCE(ds.gcr_close, NULL) AS gcr_close,
            COALESCE(ds.status, 'active') AS status,
            ds.created_at,
            ds.updated_at
     FROM designation_staff ds
     JOIN designations d ON d.id = ds.designation_id
     LEFT JOIN departments dept ON dept.id = ds.dept_id
     WHERE ds.staff_id = $1
       AND COALESCE(d.isadditional, 0) = 1
     ORDER BY ds.id DESC`,
    [staffId]
  );

  return rows;
}

async function createAdditionalDesignationForStaff(staffId, payload) {
  const designationId = Number(payload.designation_id || payload.designations_id);
  const deptId = payload.dept_id ? Number(payload.dept_id) : null;
  const startDate = payload.start_date || null;

  if (!designationId || !startDate) {
    const err = new Error('designation_id and start_date are required');
    err.statusCode = 400;
    throw err;
  }

  const { rows: duplicates } = await pool.query(
    `SELECT id
     FROM designation_staff
     WHERE staff_id = $1
       AND designation_id = $2
       AND COALESCE(dept_id, 0) = COALESCE($3, 0)
       AND LOWER(COALESCE(status, 'active')) = 'active'
     LIMIT 1`,
    [staffId, designationId, deptId]
  );

  if (duplicates.length) {
    const err = new Error('Additional designation already exists as active for this department');
    err.statusCode = 409;
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO designation_staff
      (designation_id, staff_id, dept_id, start_date, end_date, allowance_status, gcr, gcr_close, status, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, NULL, $5, $6, NULL, 'active', NOW(), NOW())
     RETURNING *`,
    [
      designationId,
      staffId,
      deptId,
      startDate,
      payload.allowance_status || 'no',
      payload.gcr || null,
    ]
  );

  return rows[0];
}

async function updateAdditionalDesignationForStaff(staffId, rowId, payload) {
  const allowed = ['designation_id', 'dept_id', 'start_date', 'end_date', 'allowance_status', 'gcr', 'gcr_close', 'status'];
  const updates = [];
  const values = [];
  let idx = 1;

  if (payload.designations_id !== undefined && payload.designation_id === undefined) {
    payload.designation_id = payload.designations_id;
  }

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      updates.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx += 1;
    }
  }

  if (!updates.length) {
    const err = new Error('No fields provided to update');
    err.statusCode = 400;
    throw err;
  }

  values.push(rowId, staffId);
  const { rows } = await pool.query(
    `UPDATE designation_staff
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND staff_id = $${idx + 1}
     RETURNING *`,
    values
  );

  if (!rows.length) {
    const err = new Error('Additional designation row not found');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
}

async function deleteAdditionalDesignationForStaff(staffId, rowId) {
  const { rowCount } = await pool.query(
    'DELETE FROM designation_staff WHERE id = $1 AND staff_id = $2',
    [rowId, staffId]
  );

  return rowCount > 0;
}

module.exports = {
  listDesignationPayscaleByStaffId,
  changeDesignationPayscaleForStaff,
  updateStaffDesignationRow,
  deleteStaffDesignationRow,
  updateStaffPayscaleRow,
  deleteStaffPayscaleRow,
  listAdditionalDesignationsByStaffId,
  createAdditionalDesignationForStaff,
  updateAdditionalDesignationForStaff,
  deleteAdditionalDesignationForStaff,
};
