const noticeModel = require('../models/notice.model');
const { findDepartmentByHodUserId } = require('../models/hodDepartmentOverview.model');
const {
  getNoticeAbilities,
  getStaffTypeForRole,
  canCreateNotice,
  canModifyNotice,
} = require('../policies/notice.policy');
const { STAFF_TYPES } = require('../validations/notice.validation');

const FEED_DEFAULT_LIMIT = 20;
const FEED_MAX_LIMIT = 100;

function httpError(statusCode, message, errors) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (errors) err.errors = errors;
  return err;
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, 'Invalid notice id');
  return id;
}

async function assertDepartmentsActive(departmentIds) {
  const activeIds = await noticeModel.findActiveDepartmentIds(departmentIds);
  if (activeIds.length !== departmentIds.length) {
    throw httpError(422, 'Please correct the highlighted fields', {
      department_ids: 'One or more selected departments do not exist or are inactive',
    });
  }
}

// Loads a notice the user may change. A notice the user may not change answers 404, not 403, so
// ids belonging to other roles cannot be probed.
async function getModifiableNotice(user, rawId) {
  const notice = await noticeModel.findNoticeById(parseId(rawId));
  if (!notice || !canModifyNotice(user, notice)) throw httpError(404, 'Notice not found');
  return notice;
}

async function getMeta(user) {
  const abilities = getNoticeAbilities(user);
  const departments = abilities.create ? await noticeModel.listActiveDepartments() : [];
  return { abilities, departments, staffTypes: STAFF_TYPES };
}

async function listNotices(user) {
  const { manageAll } = getNoticeAbilities(user);
  return noticeModel.listNotices({ ownerUserId: manageAll ? null : user.id });
}

function parseFeedLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) return FEED_DEFAULT_LIMIT;
  return Math.min(limit, FEED_MAX_LIMIT);
}

// Notices the user should see on their dashboard, newest first. The audience comes from the
// policy; a viewer with no department mapping gets an empty feed rather than every notice.
async function getFeed(user, query = {}) {
  const limit = parseFeedLimit(query.limit);
  const { audience } = getNoticeAbilities(user);

  if (audience === 'all') return noticeModel.listNoticeFeed({ limit });

  if (audience === 'department') {
    const department = await findDepartmentByHodUserId(user.id);
    if (!department) return [];
    return noticeModel.listNoticeFeed({ departmentIds: [Number(department.id)], limit });
  }

  if (audience === 'staff') {
    const departmentIds = await noticeModel.findActiveDepartmentIdsForUser(user.id);
    if (departmentIds.length === 0) return [];
    return noticeModel.listNoticeFeed({ departmentIds, staffType: getStaffTypeForRole(user.role), limit });
  }

  return [];
}

async function getNotice(user, rawId) {
  return getModifiableNotice(user, rawId);
}

async function createNotice(user, payload) {
  if (!canCreateNotice(user)) throw httpError(403, 'You are not allowed to raise notices');
  await assertDepartmentsActive(payload.department_ids);
  return noticeModel.createNotice({ ...payload, userId: user.id });
}

async function updateNotice(user, rawId, payload) {
  const notice = await getModifiableNotice(user, rawId);
  await assertDepartmentsActive(payload.department_ids);
  return noticeModel.updateNotice(notice.id, payload);
}

async function deleteNotice(user, rawId) {
  const notice = await getModifiableNotice(user, rawId);
  await noticeModel.deleteNotice(notice.id);
  return { id: notice.id };
}

module.exports = {
  getMeta,
  listNotices,
  getFeed,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
};
