import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import { changePasswordRequest, verifyCurrentPasswordRequest } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPathByRole } from '../../utils/role';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPasswordStatus, setCurrentPasswordStatus] = useState('idle');
  const passwordsFilled = Boolean(form.newPassword) && Boolean(form.confirmPassword);
  const passwordsMatch = passwordsFilled && form.newPassword === form.confirmPassword;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');

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
    setSuccess('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (currentPasswordStatus === 'not-matched') {
      setError('Current password does not match. Please enter the correct current password.');
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await changePasswordRequest({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setSuccess('Password changed successfully. You can use your new password from now on.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      if (typeof apiMessage === 'string' && apiMessage.toLowerCase().includes('current password')) {
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-md mx-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Change Password</h2>
              <p className="text-sm text-slate-500 mb-6">Update your account password below.</p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="currentPassword">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showPassword.currentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={form.currentPassword}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('currentPassword')}
                      className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword.currentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showPassword.currentPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-7 1.152-2.849 3.062-4.849 5.364-5.95m3.252-.67A10.05 10.05 0 0112 5c5 0 9 3.5 10 7a11.442 11.442 0 01-4.123 5.177M15 12a3 3 0 00-4.243-4.243M9.88 9.88A3 3 0 0014.12 14.12M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {form.currentPassword && currentPasswordStatus === 'checking' && (
                    <p className="mt-1 text-xs text-slate-500">Checking current password...</p>
                  )}
                  {form.currentPassword && currentPasswordStatus === 'matched' && (
                    <p className="mt-1 text-xs text-green-600">Current password matches.</p>
                  )}
                  {form.currentPassword && currentPasswordStatus === 'not-matched' && (
                    <p className="mt-1 text-xs text-red-600">Current password does not match.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword.newPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={form.newPassword}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword.newPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showPassword.newPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-7 1.152-2.849 3.062-4.849 5.364-5.95m3.252-.67A10.05 10.05 0 0112 5c5 0 9 3.5 10 7a11.442 11.442 0 01-4.123 5.177M15 12a3 3 0 00-4.243-4.243M9.88 9.88A3 3 0 0014.12 14.12M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Use at least 8 characters and keep it different from your current password.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword.confirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword.confirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showPassword.confirmPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-7 1.152-2.849 3.062-4.849 5.364-5.95m3.252-.67A10.05 10.05 0 0112 5c5 0 9 3.5 10 7a11.442 11.442 0 01-4.123 5.177M15 12a3 3 0 00-4.243-4.243M9.88 9.88A3 3 0 0014.12 14.12M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {passwordsFilled && passwordsMatch && (
                    <p className="mt-1 text-xs text-green-600">Passwords match successfully.</p>
                  )}
                  {passwordsFilled && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
                  >
                    {isLoading ? 'Saving...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
