const { pool } = require('../config/db');

const selectColumns = `
  id,
  advertisement_instance,
  application_no,
  applicant_name,
  email,
  applicant_address,
  applicant_phone,
  phd_university,
  phd_reputed_university,
  ug_class,
  ug_branches,
  pg_class,
  pg_specialization,
  ug_pg_remarks,
  type,
  designation,
  industry_designation,
  from_date_asso_prof,
  to_date_asso_prof,
  experience_teaching,
  experience_research,
  experience_industry,
  experience_years,
  experience_remarks,
  post_asso_prof_experience,
  asso_prof_experience_remarks,
  associate_level,
  research_papers_count,
  papers_in_sci,
  papers_in_ugc,
  papers_in_aicte,
  research_scholars_count,
  research_remarks,
  remarks,
  publication,
  date_of_birth,
  caste_name,
  eligibility_status,
  department_id,
  created_at,
  updated_at
`;

async function findAllByDepartmentId(departmentId) {
  const { rows } = await pool.query(
    `SELECT ${selectColumns}
     FROM professor_applications
     WHERE department_id = $1
     ORDER BY created_at DESC, id DESC`,
    [departmentId]
  );

  return rows;
}

async function findByIdAndDepartmentId(id, departmentId) {
  const { rows } = await pool.query(
    `SELECT ${selectColumns}
     FROM professor_applications
     WHERE id = $1 AND department_id = $2
     LIMIT 1`,
    [id, departmentId]
  );

  return rows[0] || null;
}

async function create(payload) {
  const {
    advertisement_instance,
    application_no,
    applicant_name,
    email,
    applicant_address,
    applicant_phone,
    phd_university,
    phd_reputed_university,
    ug_class,
    ug_branches,
    pg_class,
    pg_specialization,
    ug_pg_remarks,
    type,
    designation,
    industry_designation,
    from_date_asso_prof,
    to_date_asso_prof,
    experience_teaching,
    experience_research,
    experience_industry,
    experience_years,
    experience_remarks,
    post_asso_prof_experience,
    asso_prof_experience_remarks,
    associate_level,
    research_papers_count,
    papers_in_sci,
    papers_in_ugc,
    papers_in_aicte,
    research_scholars_count,
    research_remarks,
    remarks,
    publication,
    date_of_birth,
    caste_name,
    eligibility_status,
    department_id
  } = payload;

  const { rows } = await pool.query(
    `INSERT INTO professor_applications (
      advertisement_instance, application_no, applicant_name, email,
      applicant_address, applicant_phone, phd_university, phd_reputed_university,
      ug_class, ug_branches, pg_class, pg_specialization, ug_pg_remarks,
      type, designation, industry_designation, from_date_asso_prof,
      to_date_asso_prof, experience_teaching, experience_research,
      experience_industry, experience_years, experience_remarks,
      post_asso_prof_experience, asso_prof_experience_remarks, associate_level,
      research_papers_count, papers_in_sci, papers_in_ugc, papers_in_aicte,
      research_scholars_count, research_remarks, remarks, publication,
      date_of_birth, caste_name, eligibility_status, department_id,
      created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,$8,
      $9,$10,$11,$12,$13,
      $14,$15,$16,$17,
      $18,$19,$20,
      $21,$22,$23,
      $24,$25,$26,
      $27,$28,$29,$30,
      $31,$32,$33,$34,
      $35,$36,$37,$38,
      NOW(),NOW()
    )
    RETURNING ${selectColumns}`,
    [
      advertisement_instance, application_no, applicant_name, email,
      applicant_address, applicant_phone, phd_university, phd_reputed_university,
      ug_class, ug_branches, pg_class, pg_specialization, ug_pg_remarks,
      type, designation, industry_designation, from_date_asso_prof,
      to_date_asso_prof, experience_teaching, experience_research,
      experience_industry, experience_years, experience_remarks,
      post_asso_prof_experience, asso_prof_experience_remarks, associate_level,
      research_papers_count, papers_in_sci, papers_in_ugc, papers_in_aicte,
      research_scholars_count, research_remarks, remarks, publication,
      date_of_birth, caste_name, eligibility_status, department_id
    ]
  );

  return rows[0];
}

async function updateByIdAndDepartmentId(id, departmentId, payload) {
  const fields = [];
  const values = [];
  let index = 1;

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || key === 'id' || key === 'department_id') {
      return;
    }

    fields.push(`${key} = $${index}`);
    values.push(value);
    index += 1;
  });

  fields.push('updated_at = NOW()');
  values.push(id, departmentId);

  const { rows } = await pool.query(
    `UPDATE professor_applications
     SET ${fields.join(', ')}
     WHERE id = $${index} AND department_id = $${index + 1}
     RETURNING ${selectColumns}`,
    values
  );

  return rows[0] || null;
}

async function removeByIdAndDepartmentId(id, departmentId) {
  const { rowCount } = await pool.query(
    `DELETE FROM professor_applications
     WHERE id = $1 AND department_id = $2`,
    [id, departmentId]
  );

  return rowCount > 0;
}

module.exports = {
  findAllByDepartmentId,
  findByIdAndDepartmentId,
  create,
  updateByIdAndDepartmentId,
  removeByIdAndDepartmentId
};
