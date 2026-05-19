import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathByRole, isRoleMatch } from '../utils/role';

function RoleRoute({ role }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isRoleMatch(user.role, role)) {
    return <Navigate to={getDashboardPathByRole(user.role)} replace />;
  }

  return <Outlet />;
}

export { RoleRoute };
export default RoleRoute;
