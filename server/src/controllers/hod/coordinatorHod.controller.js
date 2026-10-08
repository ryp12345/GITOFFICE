const coordinatorHodModel = require('../../models/hod/coordinatorHod.model');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { roleMiddleware } = require('../../middlewares/role.middleware');

async function resolveHodDept(req) {
  const staffId = await coordinatorHodModel.resolveStaffId(req.user?.id);
  if (!staffId) throw { statusCode: 404, message: 'Staff not found' };
  const deptId = await coordinatorHodModel.getHodDepartmentId(req.user?.id);
  if (!deptId) throw { statusCode: 404, message: 'Department not found for HOD' };
  return { staffId, deptId };
}

const hodAuth = [authMiddleware, roleMiddleware('Head of Department', 'hod')];

async function listCoordinators(req, res, next) {
  try {
    const rows = await coordinatorHodModel.listCoordinators();
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

async function getCoordinatorView(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    // Allow optional department override via query param for testing
    const effectiveDeptId = req.query.department_id ? Number(req.query.department_id) : deptId;
    if (!effectiveDeptId) throw { statusCode: 404, message: 'Department not found for HOD. Please ensure your account is linked to a staff record with an active department assignment.' };
    const { id } = req.params;
    const data = await coordinatorHodModel.getCoordinatorView(Number(id), effectiveDeptId);
    if (!data) throw { statusCode: 404, message: 'Coordinator not found' };
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function addCoordinatorStaff(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    const effectiveDeptId = req.query.department_id ? Number(req.query.department_id) : deptId;
    if (!effectiveDeptId) throw { statusCode: 404, message: 'Department not found for HOD' };
    const { coordinator_id, staff_id, start_date, sdate } = req.body;
    const finalStartDate = start_date || sdate;
    if (!coordinator_id || !staff_id || !finalStartDate) {
      throw { statusCode: 400, message: 'coordinator_id, staff_id, and start_date are required' };
    }
    if (await coordinatorHodModel.isActiveCoordinatorStaff(Number(coordinator_id), Number(staff_id))) {
      throw { statusCode: 409, message: 'This staff is already an active coordinator' };
    }
    const row = await coordinatorHodModel.addCoordinatorStaff({
      coordinator_id: Number(coordinator_id),
      staff_id: Number(staff_id),
      start_date: finalStartDate,
      department_id: effectiveDeptId
    });
    res.json({ success: true, data: row, message: 'Coordinator Staff Added Successfully' });
  } catch (e) { next(e); }
}

async function updateCoordinatorStaff(req, res, next) {
  try {
    const { deptId } = await resolveHodDept(req);
    const effectiveDeptId = req.query.department_id ? Number(req.query.department_id) : deptId;
    const { id } = req.params;
    const { staff_id, start_date, end_date, sdate, edate } = req.body;
    const finalStartDate = start_date || sdate;
    const finalEndDate = end_date || edate;
    const result = await coordinatorHodModel.updateCoordinatorStaff({
      id: Number(id),
      staff_id: staff_id ? Number(staff_id) : undefined,
      start_date: finalStartDate,
      end_date: finalEndDate
    });
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = {
  listCoordinators,
  getCoordinatorView,
  addCoordinatorStaff,
  updateCoordinatorStaff,
  hodAuth
};