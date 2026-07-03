export const ROLE_STUDENT = 'student';
export const ROLE_ADMIN = 'Admin';
export const ROLE_ADMISSION = 'Admission';
export const ROLE_ACCOUNTS = 'Accounts';
export const ROLE_DEAN = 'Dean';
export const ROLE_DEAN_RND = 'Deanrnd';
export const ROLE_EGOV_ADMIN = 'egov_admin';
export const ROLE_EXAM_SECTION = 'Exam_section';
export const ROLE_DEAN_ACAD_S = 'Deanacad_s';
export const ROLE_DEAN_ACAD_D = 'Deanacad_d';
export const ROLE_OS = 'Office Superintendent';
export const ROLE_PRINCIPAL_OFFICE = 'principal_office';
export const ROLE_SUPER_ADMIN = 'Super Admin';
export const ROLE_ESTABLISHMENT = 'Establishment';
export const ROLE_HOD = 'Head of Department';
export const ROLE_TEACHING = 'teaching';
export const ROLE_NON_TEACHING = 'non-teaching';
export const ROLE_PRINCIPAL = 'Principal';
export const ROLE_DEAN_ADMIN = 'Dean_admin';
export const ROLE_REGISTRAR = 'Registrar';
export const ROLE_OFFICE_STATIONARY = 'Office_Stationary';
export const ROLE_ETENDER_USER = 'ETender_User';

const ROLE_ALIAS_MAP = {
  teaching: ROLE_TEACHING,
  'non-teaching': ROLE_NON_TEACHING,
  student: ROLE_STUDENT,
  'Super Admin': ROLE_SUPER_ADMIN,
  Admin: ROLE_ADMIN,
  Admission: ROLE_ADMISSION,
  Accounts: ROLE_ACCOUNTS,
  Establishment: ROLE_ESTABLISHMENT,
  'Office Superintendent': ROLE_OS,
  'Head of Department': ROLE_HOD,
  Dean: ROLE_DEAN,
  Deanrnd: ROLE_DEAN_RND,
  egov_admin: ROLE_EGOV_ADMIN,
  principal_office: ROLE_PRINCIPAL_OFFICE,
  Exam_section: ROLE_EXAM_SECTION,
  Dean_admin: ROLE_DEAN_ADMIN,
  Principal: ROLE_PRINCIPAL,
  Deanacad_s: ROLE_DEAN_ACAD_S,
  Deanacad_d: ROLE_DEAN_ACAD_D,
  Registrar: ROLE_REGISTRAR,
  Office_Stationary: ROLE_OFFICE_STATIONARY,
  ETender_User: ROLE_ETENDER_USER,
};

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '';
  const key = role;
  return ROLE_ALIAS_MAP[key] || role;
}

export function isRoleMatch(actualRole, expectedRole) {
  return normalizeRole(actualRole) === normalizeRole(expectedRole);
}

export function getDashboardPathByRole(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === ROLE_SUPER_ADMIN) return '/super-admin';
  if (normalizedRole === ROLE_ESTABLISHMENT) return '/establishment';
  if (normalizedRole === ROLE_HOD) return '/hod';
  if (normalizedRole === ROLE_PRINCIPAL) return '/principal';
  if (normalizedRole === ROLE_DEAN_ADMIN) return '/dean_admin';
  if (normalizedRole === ROLE_TEACHING) return '/teaching';
  if (normalizedRole === ROLE_NON_TEACHING) return '/nonteaching';
  if (normalizedRole === ROLE_REGISTRAR) return '/registrar';
  if (normalizedRole === ROLE_STUDENT) return '/student';
  if (normalizedRole === ROLE_ADMIN) return '/admin';
  if (normalizedRole === ROLE_ADMISSION) return '/admission';
  if (normalizedRole === ROLE_ACCOUNTS) return '/accounts';
  if (normalizedRole === ROLE_DEAN) return '/dean';
  if (normalizedRole === ROLE_DEAN_RND) return '/dean-rnd';
  if (normalizedRole === ROLE_EGOV_ADMIN) return '/egov-admin';
  if (normalizedRole === ROLE_PRINCIPAL_OFFICE) return '/principal-office';
  if (normalizedRole === ROLE_EXAM_SECTION) return '/exam-section';
  if (normalizedRole === ROLE_DEAN_ACAD_S) return '/dean-acad-s';
  if (normalizedRole === ROLE_DEAN_ACAD_D) return '/dean-acad-d';
  if (normalizedRole === ROLE_OS) return '/office-superintendent';
  if (normalizedRole === ROLE_OFFICE_STATIONARY) return '/office-stationary';
  if (normalizedRole === ROLE_ETENDER_USER) return '/e-tender';
  return '/login';
}

export function isAllowedRole(role) {
  return [
    ROLE_SUPER_ADMIN,
    ROLE_ESTABLISHMENT,
    ROLE_HOD,
    ROLE_PRINCIPAL,
    ROLE_DEAN_ADMIN,
    ROLE_REGISTRAR,
    ROLE_TEACHING,
    ROLE_NON_TEACHING,
    ROLE_STUDENT,
    ROLE_ADMIN,
    ROLE_ADMISSION,
    ROLE_ACCOUNTS,
    ROLE_DEAN,
    ROLE_DEAN_RND,
    ROLE_EGOV_ADMIN,
    ROLE_PRINCIPAL_OFFICE,
    ROLE_EXAM_SECTION,
    ROLE_DEAN_ACAD_S,
    ROLE_DEAN_ACAD_D,
    ROLE_OS,
    ROLE_OFFICE_STATIONARY,
    ROLE_ETENDER_USER
  ].includes(normalizeRole(role));
}
