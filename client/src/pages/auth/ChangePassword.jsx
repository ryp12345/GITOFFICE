import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { changePasswordRequest, verifyCurrentPasswordRequest } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPathByRole } from '../../utils/role';
import { mustChangePassword } from '../../utils/passwordChange';

const MIN_LENGTH = 8;

function EyeIcon({ open }) {
  return open ? (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-7 1.152-2.849 3.062-4.849 5.364-5.95m3.252-.67A10.05 10.05 0 0112 5c5 0 9 3.5 10 7a11.442 11.442 0 01-4.123 5.177M15 12a3 3 0 00-4.243-4.243M9.88 9.88A3 3 0 0014.12 14.12M3 3l18 18" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
    </svg>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, autoComplete, visible, onToggle, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, logout, setSession } = useAuth();
  // Signed in with a temporary password: no way out except changing it (or logging out).
  const isMandatory = mustChangePassword(user);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPasswordStatus, setCurrentPasswordStatus] = useState('idle');
  const passwordsFilled = Boolean(form.newPassword) && Boolean(form.confirmPassword);
  const passwordsMatch = passwordsFilled && form.newPassword === form.confirmPassword;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');

    if (e.target.name === 'currentPassword') {
      setCurrentPasswordStatus(e.target.value ? 'checking' : 'idle');
    }
  };

  useEffect(() => {
    if (!form.currentPassword) {
      setCurrentPasswordStatus('idle');
      return;
    }

    setCurrentPasswordStatus('checking');
    const timeoutId = setTimeout(async () => {
      try {
        const response = await verifyCurrentPasswordRequest({ currentPassword: form.currentPassword });
        const matched = Boolean(response?.data?.data?.matched);
        setCurrentPasswordStatus(matched ? 'matched' : 'not-matched');
      } catch (_error) {
        setCurrentPasswordStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.currentPassword]);

  const togglePasswordVisibility = (fieldName) => {
    setShowPassword((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (currentPasswordStatus === 'not-matched') {
      setError('Current password does not match. Please enter the correct current password.');
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError(isMandatory
        ? 'Choose a new password. The temporary password cannot be reused.'
        : 'New password must be different from your current password.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (form.newPassword.length < MIN_LENGTH) {
      setError(`New password must be at least ${MIN_LENGTH} characters long.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await changePasswordRequest({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // The server ends every session issued under the old password and returns a fresh one.
      const session = response?.data?.data;
      if (session?.token && session?.refreshToken && session?.user) {
        setSession(session);
        navigate(getDashboardPathByRole(session.user.role), { replace: true });
        return;
      }
      logout();
      navigate('/login', {
        replace: true,
        state: { message: 'Password changed successfully. Please log in with your new password.' }
      });
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      if (typeof apiMessage === 'string' && apiMessage.toLowerCase().includes('current password is incorrect')) {
        setError('Current password does not match. Please enter the correct current password.');
      } else {
        setError(apiMessage || 'Could not change password right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(getDashboardPathByRole(user?.role));
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const card = (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-1">
        {isMandatory ? 'Set a New Password' : 'Change Password'}
      </h2>
      {isMandatory ? (
        <div className="mb-6 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You signed in with a temporary password. You must choose your own password before you can use the application.
        </div>
      ) : (
        <p className="text-sm text-slate-500 mb-6">Update your account password below.</p>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="currentPassword"
          label={isMandatory ? 'Temporary Password' : 'Current Password'}
          value={form.currentPassword}
          onChange={handleChange}
          placeholder={isMandatory ? 'Enter the temporary password you were given' : 'Enter current password'}
          autoComplete="current-password"
          visible={showPassword.currentPassword}
          onToggle={() => togglePasswordVisibility('currentPassword')}
        >
          {form.currentPassword && currentPasswordStatus === 'checking' && (
            <p className="mt-1 text-xs text-slate-500">Checking password...</p>
          )}
          {form.currentPassword && currentPasswordStatus === 'matched' && (
            <p className="mt-1 text-xs text-green-600">Password matches.</p>
          )}
          {form.currentPassword && currentPasswordStatus === 'not-matched' && (
            <p className="mt-1 text-xs text-red-600">Password does not match.</p>
          )}
        </PasswordField>

        <PasswordField
          id="newPassword"
          label="New Password"
          value={form.newPassword}
          onChange={handleChange}
          placeholder={`At least ${MIN_LENGTH} characters`}
          autoComplete="new-password"
          visible={showPassword.newPassword}
          onToggle={() => togglePasswordVisibility('newPassword')}
        >
          <p className="mt-1 text-xs text-slate-500">
            Use at least {MIN_LENGTH} characters and keep it different from your {isMandatory ? 'temporary' : 'current'} password.
          </p>
        </PasswordField>

        <PasswordField
          id="confirmPassword"
          label="Confirm New Password"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          visible={showPassword.confirmPassword}
          onToggle={() => togglePasswordVisibility('confirmPassword')}
        >
          {passwordsFilled && passwordsMatch && (
            <p className="mt-1 text-xs text-green-600">Passwords match successfully.</p>
          )}
          {passwordsFilled && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
          )}
        </PasswordField>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isLoading ? 'Saving...' : 'Change Password'}
          </button>
          {!isMandatory && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {isMandatory && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Not you?{' '}
          <button type="button" onClick={handleLogout} className="font-medium text-blue-600 hover:text-blue-700">
            Log out
          </button>
        </p>
      )}
    </div>
  );

  // Mandatory change: a standalone screen. The header and menus would call APIs the server
  // refuses until the password is changed, and they would offer ways around this page.
  if (isMandatory) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-4">
            <img src="/git_logo.jpg" alt="Git logo" className="h-16 w-16 rounded-xl object-contain ring-1 ring-slate-200" />
          </div>
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-md mx-auto">{card}</div>
        </main>
      </div>
    </div>
  );
}
