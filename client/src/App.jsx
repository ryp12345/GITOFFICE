import AppRoutes from './routes/AppRoutes';
import AuthProvider from './context/AuthContext';
import ProfilePhotoProvider from './context/ProfilePhotoContext';
import { NotificationProvider } from './notifications/NotificationProvider';

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <ProfilePhotoProvider>
          <AppRoutes />
        </ProfilePhotoProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
