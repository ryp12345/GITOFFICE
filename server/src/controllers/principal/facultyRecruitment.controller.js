const associateModel = require('../../models/AssociateProfessor.model');
const professorModel = require('../../models/Professor.model');

// PrincipalController::Associate_Professor_Application / Professor_Application: a read-only
// list of every department's applications, served to both the Principal and Dean_admin.
// HODs create and edit them under /api/hod.
// The payload keeps the { rows } shape of the HOD list so the same React page renders both.

// GET /api/principal/faculty-recruitment/associate-professor-applications
async function listAssociateProfessorApplications(_req, res, next) {
  try {
    const rows = await associateModel.findAllWithDepartment();
    res.json({ success: true, data: { rows } });
  } catch (error) {
    next(error);
  }
}

// GET /api/principal/faculty-recruitment/professor-applications
async function listProfessorApplications(_req, res, next) {
  try {
    const rows = await professorModel.findAllWithDepartment();
    res.json({ success: true, data: { rows } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAssociateProfessorApplications,
  listProfessorApplications,
};
