const { pool } = require('../../config/db');

async function findAllWithPrograms() {
  const { rows } = await pool.query(
    `SELECT fi.id,
            fi.ft_instance_name,
            fi.start_date,
            fi.end_date,
            fi.academic_year,
            fi.scheme_id,
            fi.max_theory_class,
            fi.max_lab_class,
            fi.total_fees_collected,
            fi.deadline_date,
            fi.created_at,
            fi.updated_at,
            s.scheme_name,
            COALESCE((SELECT STRING_AGG(DISTINCT p.program_code, ', ' ORDER BY p.program_code)
             FROM fastrack_instance_program fip
             JOIN programs p ON p.id = fip.program_id
             WHERE fip.fastrack_instance_id = fi.id), '') AS program_code,
            COALESCE((SELECT STRING_AGG(DISTINCT fip.semester::text, ', ' ORDER BY fip.semester::text)
             FROM fastrack_instance_program fip
             WHERE fip.fastrack_instance_id = fi.id), '') AS semesters
     FROM fastrack_instances fi
     LEFT JOIN schemes s ON s.id = fi.scheme_id
     ORDER BY fi.id DESC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT fi.id,
            fi.ft_instance_name,
            fi.start_date,
            fi.end_date,
            fi.academic_year,
            fi.scheme_id,
            fi.max_theory_class,
            fi.max_lab_class,
            fi.total_fees_collected,
            fi.deadline_date,
            fi.created_at,
            fi.updated_at
     FROM fastrack_instances fi
     WHERE fi.id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findProgramsByInstanceId(instanceId) {
  const { rows } = await pool.query(
    `SELECT fip.program_id, fip.semester
     FROM fastrack_instance_program fip
     WHERE fip.fastrack_instance_id = $1`,
    [instanceId]
  );
  return rows;
}

async function createInstance({
  ft_instance_name,
  start_date,
  end_date,
  academic_year,
  scheme_id,
  max_theory_class,
  max_lab_class,
  total_fees_collected,
  deadline_date,
  programIds = [],
  semesters = []
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO fastrack_instances
         (ft_instance_name, start_date, end_date, academic_year, scheme_id, max_theory_class, max_lab_class, total_fees_collected, deadline_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, ft_instance_name, start_date, end_date, academic_year, scheme_id, max_theory_class, max_lab_class, total_fees_collected, deadline_date, created_at, updated_at`,
      [ft_instance_name, start_date, end_date, academic_year, scheme_id, max_theory_class, max_lab_class, total_fees_collected, deadline_date]
    );

    const instance = rows[0];
    const instanceId = instance.id;

    if (programIds.length > 0 && semesters.length > 0) {
      const values = [];
      const params = [];
      let idx = 1;
      for (const programId of programIds) {
        for (const semester of semesters) {
          values.push(`($${idx++}, $${idx++}, $${idx++})`);
          params.push(instanceId, programId, semester);
        }
      }
      await client.query(
        `INSERT INTO fastrack_instance_program (fastrack_instance_id, program_id, semester, created_at, updated_at) VALUES ${values.join(', ')}`,
        params
      );
    }

    await client.query('COMMIT');
    return instance;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateInstance(id, {
  ft_instance_name,
  start_date,
  end_date,
  academic_year,
  scheme_id,
  max_theory_class,
  max_lab_class,
  total_fees_collected,
  deadline_date,
  programIds = [],
  semesters = []
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE fastrack_instances
       SET ft_instance_name = $1,
           start_date = $2,
           end_date = $3,
           academic_year = $4,
           scheme_id = $5,
           max_theory_class = $6,
           max_lab_class = $7,
           total_fees_collected = $8,
           deadline_date = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING id, ft_instance_name, start_date, end_date, academic_year, scheme_id, max_theory_class, max_lab_class, total_fees_collected, deadline_date, created_at, updated_at`,
      [ft_instance_name, start_date, end_date, academic_year, scheme_id, max_theory_class, max_lab_class, total_fees_collected, deadline_date, id]
    );

    const instance = rows[0];

    await client.query(
      `DELETE FROM fastrack_instance_program WHERE fastrack_instance_id = $1`,
      [id]
    );

    if (programIds.length > 0 && semesters.length > 0) {
      const values = [];
      const params = [];
      let idx = 1;
      for (const programId of programIds) {
        for (const semester of semesters) {
          values.push(`($${idx++}, $${idx++}, $${idx++})`);
          params.push(id, programId, semester);
        }
      }
      await client.query(
        `INSERT INTO fastrack_instance_program (fastrack_instance_id, program_id, semester, created_at, updated_at) VALUES ${values.join(', ')}`,
        params
      );
    }

    await client.query('COMMIT');
    return instance;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function removeInstance(id) {
  const { rows } = await pool.query(
    `DELETE FROM fastrack_instances
     WHERE id = $1
     RETURNING id, ft_instance_name`,
    [id]
  );
  return rows[0] || null;
}

async function findSchemes() {
  const { rows } = await pool.query(
    `SELECT id, scheme_name FROM schemes WHERE status = 'active' ORDER BY scheme_name ASC`
  );
  return rows;
}

async function findPrograms() {
  const { rows } = await pool.query(
    `SELECT id, program_name, program_code FROM programs ORDER BY program_name ASC`
  );
  return rows;
}

module.exports = {
  findAllWithPrograms,
  findById,
  findProgramsByInstanceId,
  createInstance,
  updateInstance,
  removeInstance,
  findSchemes,
  findPrograms,
};
