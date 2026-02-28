export const ROLE_SUPER_ADMIN = 'Super Admin';
export const ROLE_ESTABLISHMENT = 'Establishment';

export function getDashboardPathByRole(role) {
  if (role === ROLE_SUPER_ADMIN) return '/super-admin';
  if (role === ROLE_ESTABLISHMENT) return '/establishment';
  return '/login';
}

export function isAllowedRole(role) {
  return role === ROLE_SUPER_ADMIN || role === ROLE_ESTABLISHMENT;
}
