// Who may raise and manage notices, and which notices each role sees on its dashboard. In Laravel
// this was implied by which role route groups had a copy of the notice controller and by each
// dashboard's own query; here it is one table, so changing a role is a one-line edit.
//
//   create     - may raise notices and edit/delete the ones they raised
//   manageAll  - may also list, edit and delete notices raised by anyone
//   audience   - which notices the role's feed shows:
//                  'all'        every notice (institution-wide offices)
//                  'department' notices addressed to the HOD's department
//                  'staff'      notices addressed to the staff member's active departments and
//                               staff type (or 'All')
//                  'none'       no feed
//
// Keys are compared case-insensitively against the JWT role. Establishment deliberately gets no
// access: the Laravel Role middleware let it through every role check, including notices.
const NOTICE_ROLE_ABILITIES = {
  'super admin': { create: true, manageAll: true, audience: 'all' },
  'super-admin': { create: true, manageAll: true, audience: 'all' },
  principal: { create: true, manageAll: false, audience: 'all' },
  dean_admin: { create: true, manageAll: false, audience: 'all' },
  'dean admin': { create: true, manageAll: false, audience: 'all' },
  principal_office: { create: true, manageAll: false, audience: 'all' },
  // The remaining offices that had a notice board in Laravel.
  registrar: { create: true, manageAll: false, audience: 'all' },
  deanacad_s: { create: true, manageAll: false, audience: 'all' },
  deanacad_d: { create: true, manageAll: false, audience: 'all' },
  office_stationary: { create: true, manageAll: false, audience: 'all' },
  'head of department': { create: true, manageAll: false, audience: 'department' },
  hod: { create: true, manageAll: false, audience: 'department' },
  // Read-only viewers.
  deanrnd: { create: false, manageAll: false, audience: 'all' },
  egov_admin: { create: false, manageAll: false, audience: 'all' },
  teaching: { create: false, manageAll: false, audience: 'staff' },
  'non-teaching': { create: false, manageAll: false, audience: 'staff' },
};

const NO_ABILITIES = { create: false, manageAll: false, audience: 'none' };

// Staff roles map onto the notices.staff_type values a notice can be addressed to.
const STAFF_TYPE_BY_ROLE = {
  teaching: 'Teaching',
  'non-teaching': 'Non-Teaching',
};

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : '';
}

function getNoticeAbilities(user) {
  const abilities = NOTICE_ROLE_ABILITIES[normalizeRole(user && user.role)];
  return abilities ? { ...abilities } : { ...NO_ABILITIES };
}

function getStaffTypeForRole(role) {
  return STAFF_TYPE_BY_ROLE[normalizeRole(role)] || null;
}

function canCreateNotice(user) {
  return getNoticeAbilities(user).create;
}

function canModifyNotice(user, notice) {
  if (!user || !notice) return false;
  const abilities = getNoticeAbilities(user);
  if (abilities.manageAll) return true;
  return abilities.create && Number(notice.user_id) === Number(user.id);
}

module.exports = {
  NOTICE_ROLE_ABILITIES,
  getNoticeAbilities,
  getStaffTypeForRole,
  canCreateNotice,
  canModifyNotice,
};
