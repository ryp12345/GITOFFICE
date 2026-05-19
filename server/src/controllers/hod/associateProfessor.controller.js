const XLSX = require('xlsx');
const associateService = require('../../services/AssociateProfessor.service');

function formatDateDMY(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

async function list(req, res, next) {
  try {
    const data = await associateService.listForHod(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await associateService.createForHod(req.user.id, req.body || {});
    res.status(201).json({ success: true, data, message: 'New Associate Professor Application Added successfully' });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = await associateService.updateForHod(req.user.id, id, req.body || {});
    res.json({ success: true, data, message: 'Associate Professor Application updated successfully' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await associateService.removeForHod(req.user.id, id);
    res.json({ success: true, message: 'Associate Professor Application deleted successfully' });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { rows } = await associateService.listForHod(req.user.id);
    const exportRows = rows.map((app, index) => ({
      'S.No': index + 1,
      'Application No': app.application_no,
      Email: app.email,
      'UG Branches': app.ug_branches,
      'PG Specialization': app.pg_specialization,
      'Applicant Name': app.applicant_name,
      date_of_birth: formatDateDMY(app.date_of_birth),
      caste_name: app.caste_name,
      'Applicant Address': app.applicant_address,
      'Applicant Phone': app.applicant_phone,
      'Recruitment Instance': formatDateDMY(app.advertisement_instance),
      'PhD Granting Institution': app.phd_university,
      'PhD Completion Date': formatDateDMY(app.phd_date),
      'PhD from recognized university': app.phd_reputed_university === true ? 'Yes' : app.phd_reputed_university === false ? 'No' : '',
      'UG Class Obtained': app.ug_class,
      'PG Class Obtained': app.pg_class,
      'UG/PG Remarks': app.ug_pg_remarks,
      'PhD Remarks': app.phd_remarks,
      'Post PhD Exp': app.post_phd_experience,
      'Teaching Exp': app.experience_teaching,
      'Research Exp': app.experience_research,
      'Industry Exp': app.experience_industry,
      'Total Exp (Yrs)': app.experience_years,
      'Experience Remarks': app.experience_remarks,
      'Research Papers in SCI/SCI-E': app.papers_in_sci,
      'Research Papers in UGC': app.papers_in_ugc,
      'Research Papers in SCOPUS': app.papers_in_aicte,
      'Total Research Papers': app.research_papers_count,
      'Research Remarks': app.research_remarks,
      Publication: app.publication,
      Eligibility: app.eligibility_status,
      Remarks: app.remarks
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AssociateProfessor');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="associate_professor_applications.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
  exportExcel
};
