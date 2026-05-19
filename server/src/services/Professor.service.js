const professorModel = require('../models/Professor.model');
const { resolveDepartmentForHod } = require('../models/hodMyStaff.model');

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function calculateAssociateProfessorYears(fromDate, toDate) {
  if (!fromDate) return 0;

  const from = new Date(fromDate);
  const to = toDate ? new Date(toDate) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return 0;
  }

  const diffMs = to.getTime() - from.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Number((diffDays / 365.25).toFixed(2));
}

function generateUgPgRemarks(ugClass, pgClass) {
  return ugClass === 'F' || pgClass === 'F' ? 'Satisfied' : 'Not Satisfied';
}

function generateExperienceRemarks(totalExp) {
  return totalExp >= 10 ? 'Satisfied' : 'Not Satisfied';
}

function generateAssociateProfessorExperienceRemarks(assocYears) {
  return assocYears >= 3 ? 'Satisfied' : 'Not Satisfied';
}

function generateResearchRemarks(totalPapers, researchScholars) {
  return totalPapers >= 10 || (totalPapers >= 6 && researchScholars >= 2)
    ? 'Satisfied'
    : 'Not Satisfied';
}

function computeEligibility({ phdUniversity, ugClass, pgClass, totalPapers, totalExp, assocYears, researchScholars }) {
  const errors = [];

  if (!phdUniversity) {
    errors.push('Ph.D. degree in relevant field is required');
  }

  if (!(ugClass === 'F' || pgClass === 'F')) {
    errors.push("First class or equivalent at either Bachelor's or Master's level is required");
  }

  if (totalExp < 10) {
    errors.push(`Minimum 10 years of teaching/research/industry experience is required (Current: ${totalExp} years)`);
  }

  if (assocYears < 3) {
    errors.push(`Minimum 3 years at a post equivalent to Associate Professor is required (Current: ${assocYears} years)`);
  }

  if (assocYears > totalExp) {
    errors.push(`Associate Professor level experience (${assocYears} years) cannot exceed total reported experience (${totalExp} years); ensure it's included in the total.`);
  }

  if (!(totalPapers >= 10 || (totalPapers >= 6 && researchScholars >= 2))) {
    errors.push(`Research criteria not met: need (>=6 publications and >=2 successful Ph.D. guided as Supervisor/Co-supervisor) OR >=10 publications (Current: ${totalPapers} publications, ${researchScholars} Ph.D. guided)`);
  }

  if (!errors.length) {
    return {
      status: 'Eligible',
      reason: totalPapers >= 10
        ? 'Meets clauses (a), (b), and (c). Meets clause (c) through >=10 publications'
        : 'Meets clauses (a), (b), and (c). Meets clause (c) through >=6 publications and >=2 Ph.D. guided'
    };
  }

  return {
    status: 'Not Eligible',
    reason: errors.join('; ')
  };
}

async function getDepartmentForUser(userId) {
  const department = await resolveDepartmentForHod(userId);
  if (!department?.id) {
    const err = new Error('No department mapping found for this HOD user');
    err.statusCode = 404;
    throw err;
  }
  return department;
}

function normalizePayload(input, departmentId) {
  const payload = { ...input };
  const teaching = toNumber(payload.experience_teaching, 0);
  const research = toNumber(payload.experience_research, 0);
  const industry = toNumber(payload.experience_industry, 0);
  const totalExp = Number((teaching + research + industry).toFixed(2));

  const assocYears = calculateAssociateProfessorYears(payload.from_date_asso_prof, payload.to_date_asso_prof);
  const sci = Math.floor(toNumber(payload.papers_in_sci ?? payload.papers_in_SCI, 0));
  const ugc = Math.floor(toNumber(payload.papers_in_ugc ?? payload.papers_in_UGC, 0));
  const aicte = Math.floor(toNumber(payload.papers_in_aicte ?? payload.papers_in_AICTE, 0));
  const totalPapers = sci + ugc + aicte;
  const researchScholars = Math.floor(toNumber(payload.research_scholars_count, 0));

  const type = payload.type || null;
  const isIndustry = type === 'Industry';
  const isEducation = type === 'Education';
  const eligibility = computeEligibility({
    phdUniversity: payload.phd_university,
    ugClass: payload.ug_class,
    pgClass: payload.pg_class,
    totalPapers,
    totalExp,
    assocYears,
    researchScholars
  });

  return {
    advertisement_instance: payload.advertisement_instance || null,
    application_no: payload.application_no || null,
    applicant_name: payload.applicant_name || null,
    email: payload.email || null,
    applicant_address: payload.applicant_address || null,
    applicant_phone: payload.applicant_phone || null,
    phd_university: payload.phd_university || null,
    phd_reputed_university:
      payload.phd_reputed_university === '' || payload.phd_reputed_university === null || payload.phd_reputed_university === undefined
        ? null
        : Boolean(Number(payload.phd_reputed_university)),
    ug_class: payload.ug_class || null,
    ug_branches: payload.ug_branches || null,
    pg_class: payload.pg_class || null,
    pg_specialization: payload.pg_specialization || null,
    ug_pg_remarks: generateUgPgRemarks(payload.ug_class, payload.pg_class),
    type,
    designation: isEducation ? payload.designation || null : null,
    industry_designation: isIndustry ? payload.industry_designation || null : null,
    from_date_asso_prof: payload.from_date_asso_prof || null,
    to_date_asso_prof: payload.to_date_asso_prof || null,
    experience_teaching: teaching,
    experience_research: research,
    experience_industry: industry,
    experience_years: totalExp,
    experience_remarks: generateExperienceRemarks(totalExp),
    post_asso_prof_experience: assocYears,
    asso_prof_experience_remarks: generateAssociateProfessorExperienceRemarks(assocYears),
    associate_level: isIndustry ? payload.associate_level || null : null,
    research_papers_count: totalPapers,
    papers_in_sci: sci,
    papers_in_ugc: ugc,
    papers_in_aicte: aicte,
    research_scholars_count: researchScholars,
    research_remarks: generateResearchRemarks(totalPapers, researchScholars),
    remarks: payload.remarks || null,
    publication: payload.publication || null,
    date_of_birth: payload.date_of_birth || null,
    caste_name: payload.caste_name || null,
    eligibility_status: eligibility.status,
    department_id: departmentId,
    eligibility_reason: eligibility.reason
  };
}

function validateRequired(payload) {
  const requiredFields = [
    'application_no',
    'applicant_name',
    'email',
    'applicant_address',
    'applicant_phone',
    'advertisement_instance',
    'type',
    'ug_class',
    'ug_branches',
    'pg_class',
    'from_date_asso_prof'
  ];

  const missing = requiredFields.find((field) => !payload[field]);
  if (missing) {
    const err = new Error(`${missing} is required`);
    err.statusCode = 400;
    throw err;
  }
}

async function listForHod(userId) {
  const department = await getDepartmentForUser(userId);
  const rows = await professorModel.findAllByDepartmentId(department.id);
  return { department, rows };
}

async function createForHod(userId, input) {
  const department = await getDepartmentForUser(userId);
  const payload = normalizePayload(input, department.id);
  validateRequired(payload);
  return professorModel.create(payload);
}

async function updateForHod(userId, id, input) {
  const department = await getDepartmentForUser(userId);
  const existing = await professorModel.findByIdAndDepartmentId(id, department.id);
  if (!existing) {
    const err = new Error('Professor Application not found');
    err.statusCode = 404;
    throw err;
  }

  const payload = normalizePayload({ ...existing, ...input }, department.id);
  validateRequired(payload);
  return professorModel.updateByIdAndDepartmentId(id, department.id, payload);
}

async function removeForHod(userId, id) {
  const department = await getDepartmentForUser(userId);
  const ok = await professorModel.removeByIdAndDepartmentId(id, department.id);
  if (!ok) {
    const err = new Error('Professor Application not found');
    err.statusCode = 404;
    throw err;
  }
  return true;
}

module.exports = {
  listForHod,
  createForHod,
  updateForHod,
  removeForHod
};
