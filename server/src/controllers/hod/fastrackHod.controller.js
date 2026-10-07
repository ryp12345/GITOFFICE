const hodFastrackModel = require('../../models/hod/fastrackHod.model');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { roleMiddleware } = require('../../middlewares/role.middleware');

async function resolveHodDept(req) {
  const staffId = await hodFastrackModel.resolveStaffId(req.user?.id);
  if (!staffId) throw { statusCode: 404, message: 'Staff not found' };
  const deptId = await hodFastrackModel.getHodDepartmentId(req.user?.id);
  if (!deptId) throw { statusCode: 404, message: 'Department not found for HOD' };
  return { staffId, deptId };
}

const hodAuth = [authMiddleware, roleMiddleware('Head of Department', 'hod')];

// List courses for HOD
async function listCourses(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    const rows = await hodFastrackModel.listHodCourses(deptId);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

// Filter courses by academic year and instance
async function filterCourses(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    const { academic_year, ft_instance_id } = req.body;
    if (!academic_year || !ft_instance_id) {
      throw { statusCode: 400, message: 'academic_year and ft_instance_id are required' };
    }
    const rows = await hodFastrackModel.filterHodCourses(deptId, academic_year, ft_instance_id);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

// Approve staff records
async function approveRecords(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    const { staff_ids, course_ids } = req.body;
    const result = await hodFastrackModel.approveHodRecords(staff_ids || [], course_ids || []);
    res.json(result);
  } catch (e) { next(e); }
}

// Get course type for a staff record
async function getCourseType(req, res, next) {
  try {
    const { id } = req.params;
    const courseType = await hodFastrackModel.getCourseTypeForStaff(Number(id));
    if (!courseType) throw { statusCode: 404, message: 'Course type not found' };
    res.json({ success: true, courseType });
  } catch (e) { next(e); }
}

// Process justification (update classes/labs and auto-approve)
async function processJustification(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    const { id } = req.params;
    const { classes_conducted, labs_conducted, ft_justification } = req.body;
    const result = await hodFastrackModel.processJustification(Number(id), {
      classes_conducted,
      labs_conducted,
      ft_justification,
    });
    res.json(result);
  } catch (e) { next(e); }
}

// List fastrack management view
async function listManagement(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    const rows = await hodFastrackModel.listHodFastrackManagement(deptId);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

// Lookup data for filter dropdowns
async function getLookup(req, res, next) {
  try {
    const data = await hodFastrackModel.getHodLookupData();
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

module.exports = {
  listCourses,
  filterCourses,
  approveRecords,
  getCourseType,
  processJustification,
  listManagement,
  getLookup,
};