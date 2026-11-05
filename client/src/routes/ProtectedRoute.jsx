import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CHANGE_PASSWORD_PATH, mustChangePassword } from '../utils/passwordChange';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  // Remember the requested page so login can return to it (Laravel's redirect()->intended()).
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // A temporary password must be replaced before any other page opens (also via direct URL).
  if (mustChangePassword(user) && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  return <Outlet />;
}
