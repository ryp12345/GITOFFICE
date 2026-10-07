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
    const items = (Array.isArray(req.body.items) ? req.body.items : [])
      .map((item) => ({ course_id: Number(item?.course_id), staff_id: Number(item?.staff_id) }))
      .filter((item) => item.course_id > 0 && item.staff_id > 0);
    if (items.length === 0) {
      throw { statusCode: 400, message: 'Please select at least one staff member to approve.' };
    }
    const result = await hodFastrackModel.approveHodRecords(items, deptId);
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
    const id = Number(req.params.id);
    const record = await hodFastrackModel.findStaffRecordInDepartment(id, deptId);
    if (!record) throw { statusCode: 404, message: 'Staff record not found.' };
    if (record.status === 'Approved') throw { statusCode: 409, message: 'This record is already Approved.' };

    // Laravel rule: ft_justification required|string|max:255
    const ft_justification = String(req.body.ft_justification || '').trim();
    if (!ft_justification) throw { statusCode: 422, message: 'The justification field is required.' };
    if (ft_justification.length > 255) throw { statusCode: 422, message: 'The justification may not be greater than 255 characters.' };

    const parseCount = (value, label) => {
      if (value === undefined || value === null || String(value).trim() === '') return undefined;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) throw { statusCode: 422, message: `${label} must be a whole number of 0 or more` };
      return n;
    };

    const result = await hodFastrackModel.processJustification(id, {
      classes_conducted: parseCount(req.body.classes_conducted, 'Classes conducted'),
      labs_conducted: parseCount(req.body.labs_conducted, 'Labs conducted'),
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