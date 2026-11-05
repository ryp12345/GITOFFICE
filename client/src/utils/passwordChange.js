// Mandatory password change after an admin reset or account creation.
// The server enforces it (every other API answers 403 PASSWORD_CHANGE_REQUIRED); the client
// just keeps the user on the Change Password page so they never see broken screens.
export const CHANGE_PASSWORD_PATH = '/change-password';
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

export function mustChangePassword(user) {
  return Boolean(user?.must_change_password);
}
