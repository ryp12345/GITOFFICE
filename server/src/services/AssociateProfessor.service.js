const associateModel = require('../models/AssociateProfessor.model');
const { resolveDepartmentForHod } = require('../models/hodMyStaff.model');

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function calculatePostPhdExperience(phdDate) {
  if (!phdDate) return 0;

  const from = new Date(phdDate);
  const to = new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  if (Number.isNaN(from.getTime()) || to <= from) {
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
  return totalExp >= 8 ? 'Satisfied' : 'Not Satisfied';
}

function generatePhdRemarks(hasPhd, postPhdExp) {
  return hasPhd && postPhdExp >= 2 ? 'Satisfied' : 'Not Satisfied';
}

function generateResearchRemarks(totalPapers) {
  return totalPapers >= 6 ? 'Satisfied' : 'Not Satisfied';
}

function computeEligibility({ hasPhd, ugClass, pgClass, totalPapers, totalExp, postPhdExp }) {
  const errors = [];

  if (!hasPhd) {
    errors.push('Ph.D. degree is mandatory');
  }

  if (!(ugClass === 'F' || pgClass === 'F')) {
    errors.push("First class or equivalent at Bachelor's or Master's level is required");
  }

  if (totalPapers < 6) {
    errors.push(`Minimum 6 research publications in SCI journals / UGC/AICTE approved list is required (Current: ${totalPapers})`);
  }

  if (totalExp < 8) {
    errors.push(`Minimum 8 years of experience in teaching/research/industry is required (Current: ${totalExp} years)`);
  }

  if (postPhdExp < 2) {
    errors.push(`Minimum 2 years of Post-Ph.D. experience is required (Current: ${postPhdExp} years)`);
  }

  if (!errors.length) {
    return {
      status: 'Eligible',
      reason: 'Meets all minimum qualification requirements'
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

  const sci = toNumber(payload.papers_in_sci ?? payload.papers_in_SCI, 0);
  const ugc = toNumber(payload.papers_in_ugc ?? payload.papers_in_UGC, 0);
  const aicte = toNumber(payload.papers_in_aicte ?? payload.papers_in_AICTE, 0);
  const totalPapers = Math.floor(sci + ugc + aicte);

  const postPhdExp = calculatePostPhdExperience(payload.phd_date);
  const hasPhd = Boolean(payload.phd_date || payload.phd_university);

  const eligibility = computeEligibility({
    hasPhd,
    ugClass: payload.ug_class,
    pgClass: payload.pg_class,
    totalPapers,
    totalExp,
    postPhdExp
  });

  return {
    application_no: payload.application_no || null,
    applicant_name: payload.applicant_name || null,
    email: payload.email || null,
    ug_branches: payload.ug_branches || null,
    pg_specialization: payload.pg_specialization || null,
    remarks: payload.remarks || null,
    publication: payload.publication || null,
    date_of_birth: payload.date_of_birth || null,
    caste_name: payload.caste_name || null,
    applicant_address: payload.applicant_address || null,
    applicant_phone: payload.applicant_phone || null,
    advertisement_instance: payload.advertisement_instance || null,
    phd_university: payload.phd_university || null,
    phd_reputed_university:
      payload.phd_reputed_university === '' || payload.phd_reputed_university === null || payload.phd_reputed_university === undefined
        ? null
        : Boolean(Number(payload.phd_reputed_university)),
    ug_class: payload.ug_class || null,
    pg_class: payload.pg_class || null,
    ug_pg_remarks: generateUgPgRemarks(payload.ug_class, payload.pg_class),
    experience_years: totalExp,
    experience_teaching: teaching,
    experience_research: research,
    experience_industry: industry,
    experience_remarks: generateExperienceRemarks(totalExp),
    phd_date: payload.phd_date || null,
    post_phd_experience: postPhdExp,
    phd_remarks: generatePhdRemarks(hasPhd, postPhdExp),
    research_papers_count: totalPapers,
    papers_in_sci: Math.floor(sci),
    papers_in_ugc: Math.floor(ugc),
    papers_in_aicte: Math.floor(aicte),
    research_remarks: generateResearchRemarks(totalPapers),
    eligibility_status: eligibility.status,
    department_id: departmentId,
    eligibility_reason: eligibility.reason
  };
}

function validateRequired(payload) {
  if (!payload.application_no) {
    const err = new Error('application_no is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.applicant_name) {
    const err = new Error('applicant_name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.email) {
    const err = new Error('email is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.applicant_address) {
    const err = new Error('applicant_address is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.applicant_phone) {
    const err = new Error('applicant_phone is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.advertisement_instance) {
    const err = new Error('advertisement_instance is required');
    err.statusCode = 400;
    throw err;
  }
  if (!payload.remarks) {
    const err = new Error('remarks is required');
    err.statusCode = 400;
    throw err;
  }
}

async function listForHod(userId) {
  const department = await getDepartmentForUser(userId);
  const rows = await associateModel.findAllByDepartmentId(department.id);
  return { department, rows };
}

async function createForHod(userId, input) {
  const department = await getDepartmentForUser(userId);
  const payload = normalizePayload(input, department.id);
  validateRequired(payload);
  const row = await associateModel.create(payload);
  return row;
}

async function updateForHod(userId, id, input) {
  const department = await getDepartmentForUser(userId);
  const existing = await associateModel.findByIdAndDepartmentId(id, department.id);
  if (!existing) {
    const err = new Error('Associate Professor Application not found');
    err.statusCode = 404;
    throw err;
  }

  const payload = normalizePayload({ ...existing, ...input }, department.id);
  validateRequired(payload);

  const row = await associateModel.updateByIdAndDepartmentId(id, department.id, payload);
  return row;
}

async function removeForHod(userId, id) {
  const department = await getDepartmentForUser(userId);
  const ok = await associateModel.removeByIdAndDepartmentId(id, department.id);
  if (!ok) {
    const err = new Error('Associate Professor Application not found');
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
