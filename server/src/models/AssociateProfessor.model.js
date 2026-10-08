const { pool } = require('../config/db');
const { normalizeDateColumns } = require('../utils/pgDate');

// DATE columns go out as YYYY-MM-DD. As JS Dates they serialise in UTC, so on an IST server the
// edit form (which reads the first ten characters) showed and re-saved the previous day.
const DATE_COLUMNS = ['date_of_birth', 'advertisement_instance', 'phd_date', 'from_date_asso_prof', 'to_date_asso_prof'];

function serializeRow(row) {
  return normalizeDateColumns(row, DATE_COLUMNS);
}

const selectColumns = `
  id,
  application_no,
  applicant_name,
  email,
  ug_branches,
  pg_specialization,
  remarks,
  publication,
  date_of_birth,
  caste_name,
  applicant_address,
  applicant_phone,
  advertisement_instance,
  phd_university,
  phd_reputed_university,
  ug_class,
  pg_class,
  ug_pg_remarks,
  experience_years,
  experience_teaching,
  experience_research,
  experience_industry,
  experience_remarks,
  phd_date,
  post_phd_experience,
  phd_remarks,
  research_papers_count,
  papers_in_sci,
  papers_in_ugc,
  papers_in_aicte,
  research_remarks,
  eligibility_status,
  department_id,
  created_at,
  updated_at
`;

async function findAllByDepartmentId(departmentId) {
  const { rows } = await pool.query(
    `SELECT ${selectColumns}
     FROM associate_professor_applications
     WHERE department_id = $1
     ORDER BY created_at DESC, id DESC`,
    [departmentId]
  );
  return rows.map(serializeRow);
}

// Every department's applications, newest first, for the Principal's read-only Faculty
// Recruitment page (PrincipalController::Associate_Professor_Application used ::all()). The
// department is joined in because the list spans departments.
async function findAllWithDepartment() {
  const columns = selectColumns
    .split(',')
    .map((column) => `a.${column.trim()}`)
    .join(', ');
  const { rows } = await pool.query(
    `SELECT ${columns}, d.dept_name, d.dept_shortname
     FROM associate_professor_applications a
     LEFT JOIN departments d ON d.id = a.department_id
     ORDER BY a.created_at DESC, a.id DESC`
  );
  return rows.map(serializeRow);
}

async function findByIdAndDepartmentId(id, departmentId) {
  const { rows } = await pool.query(
    `SELECT ${selectColumns}
     FROM associate_professor_applications
     WHERE id = $1 AND department_id = $2
     LIMIT 1`,
    [id, departmentId]
  );
  return rows[0] ? serializeRow(rows[0]) : null;
}

async function create(payload) {
  const {
    application_no,
    applicant_name,
    email,
    ug_branches,
    pg_specialization,
    remarks,
    publication,
    date_of_birth,
    caste_name,
    applicant_address,
    applicant_phone,
    advertisement_instance,
    phd_university,
    phd_reputed_university,
    ug_class,
    pg_class,
    ug_pg_remarks,
    experience_years,
    experience_teaching,
    experience_research,
    experience_industry,
    experience_remarks,
    phd_date,
    post_phd_experience,
    phd_remarks,
    research_papers_count,
    papers_in_sci,
    papers_in_ugc,
    papers_in_aicte,
    research_remarks,
    eligibility_status,
    department_id
  } = payload;

  const { rows } = await pool.query(
    `INSERT INTO associate_professor_applications (
      application_no, applicant_name, email, ug_branches, pg_specialization,
      remarks, publication, date_of_birth, caste_name, applicant_address,
      applicant_phone, advertisement_instance, phd_university, phd_reputed_university,
      ug_class, pg_class, ug_pg_remarks, experience_years, experience_teaching,
      experience_research, experience_industry, experience_remarks, phd_date,
      post_phd_experience, phd_remarks, research_papers_count, papers_in_sci,
      papers_in_ugc, papers_in_aicte, research_remarks, eligibility_status,
      department_id, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,
      $11,$12,$13,$14,
      $15,$16,$17,$18,$19,
      $20,$21,$22,$23,
      $24,$25,$26,$27,
      $28,$29,$30,$31,
      $32,NOW(),NOW()
    )
    RETURNING ${selectColumns}`,
    [
      application_no, applicant_name, email, ug_branches, pg_specialization,
      remarks, publication, date_of_birth, caste_name, applicant_address,
      applicant_phone, advertisement_instance, phd_university, phd_reputed_university,
      ug_class, pg_class, ug_pg_remarks, experience_years, experience_teaching,
      experience_research, experience_industry, experience_remarks, phd_date,
      post_phd_experience, phd_remarks, research_papers_count, papers_in_sci,
      papers_in_ugc, papers_in_aicte, research_remarks, eligibility_status,
      department_id
    ]
  );

  return serializeRow(rows[0]);
}

// The service payload also carries derived values that have no column (eligibility_reason),
// so only columns listed in selectColumns are written. Laravel guarded the same way with
// Schema::hasColumn(); writing the extra key made every edit fail.
const UPDATABLE_COLUMNS = new Set(
  selectColumns
    .split(',')
    .map((column) => column.trim())
    .filter((column) => column && !['id', 'department_id', 'created_at', 'updated_at'].includes(column))
);

async function updateByIdAndDepartmentId(id, departmentId, payload) {
  const fields = [];
  const values = [];
  let index = 1;

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || !UPDATABLE_COLUMNS.has(key)) {
      return;
    }
    fields.push(`${key} = $${index}`);
    values.push(value);
    index += 1;
  });

  fields.push(`updated_at = NOW()`);
  values.push(id);
  values.push(departmentId);

  const { rows } = await pool.query(
    `UPDATE associate_professor_applications
     SET ${fields.join(', ')}
     WHERE id = $${index} AND department_id = $${index + 1}
     RETURNING ${selectColumns}`,
    values
  );

  return rows[0] ? serializeRow(rows[0]) : null;
}

async function removeByIdAndDepartmentId(id, departmentId) {
  const { rowCount } = await pool.query(
    `DELETE FROM associate_professor_applications
     WHERE id = $1 AND department_id = $2`,
    [id, departmentId]
  );
  return rowCount > 0;
}

module.exports = {
  findAllByDepartmentId,
  findAllWithDepartment,
  findByIdAndDepartmentId,
  create,
  updateByIdAndDepartmentId,
  removeByIdAndDepartmentId
};
