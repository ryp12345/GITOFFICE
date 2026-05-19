
export const ROLE_SUPER_ADMIN = 'Super Admin';
export const ROLE_ESTABLISHMENT = 'Establishment';
export const ROLE_HOD = 'Head of Department';
export const ROLE_TEACHING = 'Teaching';
export const ROLE_NON_TEACHING = 'Non-Teaching';
export const ROLE_PRINCIPAL = 'Principal';
// export const ROLE_DEAN = 'Dean'; // removed, not used
export const ROLE_DEAN_ADMIN = 'Dean_admin';

const ROLE_ALIAS_MAP = {
  'super admin': ROLE_SUPER_ADMIN,
  'super-admin': ROLE_SUPER_ADMIN,
  superadmin: ROLE_SUPER_ADMIN,
  establishment: ROLE_ESTABLISHMENT,
  hod: ROLE_HOD,
  'head of department': ROLE_HOD,
  'head-of-department': ROLE_HOD,
  teaching: ROLE_TEACHING,
  'non teaching': ROLE_NON_TEACHING,
  'non-teaching': ROLE_NON_TEACHING,
  nonteaching: ROLE_NON_TEACHING,
  principal: ROLE_PRINCIPAL,
  // dean: ROLE_DEAN, // removed, not used
  'dean_admin': ROLE_DEAN_ADMIN,
  'dean admin': ROLE_DEAN_ADMIN,
  dean_admin: ROLE_DEAN_ADMIN
};

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '';
  const key = role.trim().toLowerCase();
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
  return '/login';
}


export function isAllowedRole(role) {
  return [
    ROLE_SUPER_ADMIN,
    ROLE_ESTABLISHMENT,
    ROLE_HOD,
    ROLE_PRINCIPAL,
    ROLE_DEAN_ADMIN,
    ROLE_TEACHING,
    ROLE_NON_TEACHING
  ].includes(normalizeRole(role));
}
