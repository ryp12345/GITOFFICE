import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathByRole, isRoleMatch } from '../utils/role';
import { CHANGE_PASSWORD_PATH, mustChangePassword } from '../utils/passwordChange';

function RoleRoute({ role }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // A temporary password must be replaced before any role page opens (also via direct URL).
  if (mustChangePassword(user)) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  if (!isRoleMatch(user.role, role)) {
    return <Navigate to={getDashboardPathByRole(user.role)} replace />;
  }

  return <Outlet />;
}

export { RoleRoute };
export default RoleRoute;
