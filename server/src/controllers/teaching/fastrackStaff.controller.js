const fs = require('fs');
const path = require('path');
const fastrackStaffModel = require('../../models/teaching/fastrackStaff.model');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { roleMiddleware } = require('../../middlewares/role.middleware');

const MAX_DOCUMENT_SIZE = 500 * 1024;
const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'staff', 'fastrack_staff');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

async function resolveTeachingStaff(req) {
  const staffId = await fastrackStaffModel.resolveStaffId(req.user?.id);
  if (!staffId) throw { statusCode: 404, message: 'Staff not found' };
  const isCoord = await fastrackStaffModel.isCoordinator(req.user?.id);
  const deptId = await fastrackStaffModel.getStaffDepartmentId(staffId);
  return { staffId, isCoord, deptId };
}

// Faculty: list my courses
async function listMyCourses(req, res, next) {
  try {
    const { staffId } = await resolveTeachingStaff(req);
    const rows = await fastrackStaffModel.listMyCourses(staffId);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

// Faculty: update my course (classes/labs/document)
async function updateMyCourse(req, res, next) {
  try {
    const { staffId } = await resolveTeachingStaff(req);
    const courseId = Number(req.params.id);
    const { classes_conducted, labs_conducted } = req.body;
    let document = null;

    if (req.file) {
      if (req.file.size > MAX_DOCUMENT_SIZE) {
        throw { statusCode: 422, message: 'File exceeds 500KB limit' };
      }
      ensureUploadDir();
      const filename = `${staffId}_${courseId}.pdf`;
      const fullPath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      fs.writeFileSync(fullPath, req.file.buffer);
      document = filename;
    }

    const row = await fastrackStaffModel.updateMyCourse(staffId, courseId, {
      classes_conducted: classes_conducted ? Number(classes_conducted) : null,
      labs_conducted: labs_conducted ? Number(labs_conducted) : null,
      document,
    });

    res.json({ success: true, message: 'Record saved successfully.', data: row });
  } catch (e) {
    next(e);
  }
}

// Coordinator: list all courses in department
async function listCoordinatorCourses(req, res, next) {
  try {
    const { staffId, isCoord, deptId } = await resolveTeachingStaff(req);
    if (!isCoord) throw { statusCode: 403, message: 'Not authorized as FASTRACK coordinator' };
    if (!deptId) throw { statusCode: 404, message: 'Department not found' };

    const rows = await fastrackStaffModel.listCoordinatorCourses(deptId);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

// Coordinator: get staff lists for assignment
async function getStaffForAssignment(req, res, next) {
  try {
    const { staffId, isCoord, deptId } = await resolveTeachingStaff(req);
    if (!isCoord) throw { statusCode: 403, message: 'Not authorized as FASTRACK coordinator' };
    if (!deptId) throw { statusCode: 404, message: 'Department not found' };

    const data = await fastrackStaffModel.getStaffForAssignment(deptId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

// Coordinator: assign staff to course
async function assignStaffToCourse(req, res, next) {
  try {
    const { staffId, isCoord, deptId } = await resolveTeachingStaff(req);
    if (!isCoord) throw { statusCode: 403, message: 'Not authorized as FASTRACK coordinator' };
    if (!deptId) throw { statusCode: 404, message: 'Department not found' };

    const { staff_id, instructor_foreman_id, peon_attender_id, ft_course_type_id } = req.body;
    const courseId = Number(req.body.course_id);

    await fastrackStaffModel.assignStaffToCourse(courseId, {
      staff_ids: staff_id,
      instructor_foreman_id,
      peon_attender_id,
      ft_course_type_id,
    });

    res.json({ success: true, message: 'Staff Assigned to Lab Course Successfully' });
  } catch (e) {
    next(e);
  }
}

// Coordinator: update staff assignment
async function updateStaffAssignment(req, res, next) {
  try {
    const { staffId, isCoord, deptId } = await resolveTeachingStaff(req);
    if (!isCoord) throw { statusCode: 403, message: 'Not authorized as FASTRACK coordinator' };
    if (!deptId) throw { statusCode: 404, message: 'Department not found' };

    const { staff_id, instructor_foreman_id, peon_attender_id, ft_course_type_id, course_id } = req.body;

    await fastrackStaffModel.updateStaffAssignment(course_id, {
      staff_ids: staff_id,
      instructor_foreman_id,
      peon_attender_id,
      ft_course_type_id,
    });

    res.json({ success: true, message: 'Staff updated for lab course successfully.' });
  } catch (e) {
    next(e);
  }
}

// Coordinator: filter courses by academic year and instance
async function filterCoordinatorCourses(req, res, next) {
  try {
    const { staffId, isCoord, deptId } = await resolveTeachingStaff(req);
    if (!isCoord) throw { statusCode: 403, message: 'Not authorized as FASTRACK coordinator' };
    if (!deptId) throw { statusCode: 404, message: 'Department not found' };

    const { academic_year, ft_instance_id } = req.query;
    if (!academic_year || !ft_instance_id) {
      throw { statusCode: 400, message: 'academic_year and ft_instance_id are required' };
    }

    const rows = await fastrackStaffModel.filterCoordinatorCourses(deptId, academic_year, ft_instance_id);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

// Coordinator Verification: list courses for verification
async function listVerificationCourses(req, res, next) {
  try {
    const { staffId, isCoord, deptId } = await resolveTeachingStaff(req);
    if (!isCoord) throw { statusCode: 403, message: 'Not authorized as FASTRACK coordinator' };
    if (!deptId) throw { statusCode: 404, message: 'Department not found' };

    const rows = await fastrackStaffModel.listVerificationCourses(deptId);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

// Coordinator Verification: verify selected records
async function verifyRecords(req, res, next) {
  try {
    const { staffId, isCoord, deptId } = await resolveTeachingStaff(req);
    if (!isCoord) throw { statusCode: 403, message: 'Not authorized as FASTRACK coordinator' };
    if (!deptId) throw { statusCode: 404, message: 'Department not found' };

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw { statusCode: 400, message: 'No items to verify' };
    }

    await fastrackStaffModel.verifyRecords(items);
    res.json({ success: true, message: 'Staff Fastrack Records Verified Successfully.' });
  } catch (e) {
    next(e);
  }
}

// Lookup data for modals
async function getLookupData(req, res, next) {
  try {
    const data = await fastrackStaffModel.getLookupData();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listMyCourses,
  updateMyCourse,
  listCoordinatorCourses,
  getStaffForAssignment,
  assignStaffToCourse,
  updateStaffAssignment,
  filterCoordinatorCourses,
  listVerificationCourses,
  verifyRecords,
  getLookupData,
};