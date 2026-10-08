import AppRoutes from './routes/AppRoutes';
import AuthProvider from './context/AuthContext';
import { NotificationProvider } from './notifications/NotificationProvider';

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </NotificationProvider>
  );
}
