import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../../api/auth.api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasToken = useMemo(() => Boolean(token), [token]);
  const passwordsFilled = Boolean(password) && Boolean(confirmPassword);
  const passwordsMatch = passwordsFilled && password === confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!hasToken) {
      setError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPasswordRequest({ token, password });
      setSuccess('Password reset successful. Redirecting to login...');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not reset password. Please request a new link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-8 sm:px-8 shadow-xl">
        <div className="flex items-center justify-center mb-4">
          <img src="/git_logo.jpg" alt="Git logo" className="h-24 w-24 rounded-xl object-contain ring-1 ring-slate-200" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-center mb-2">Reset Password</h1>


        {error ? (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New password</label>
            <div className="relative">
              <input
                type={showPassword.password ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                disabled={isSubmitting || !hasToken}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => ({ ...prev, password: !prev.password }))}
                className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-slate-700 transition disabled:cursor-not-allowed"
                disabled={isSubmitting || !hasToken}
                aria-label="Toggle new password visibility"
                title={showPassword.password ? 'Hide password' : 'Show password'}
              >
                {showPassword.password ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-7 1.152-2.849 3.062-4.849 5.364-5.95m3.252-.67A10.05 10.05 0 0112 5c5 0 9 3.5 10 7a11.442 11.442 0 01-4.123 5.177M15 12a3 3 0 00-4.243-4.243M9.88 9.88A3 3 0 0014.12 14.12M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm password</label>
            <div className="relative">
              <input
                type={showPassword.confirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                disabled={isSubmitting || !hasToken}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-slate-700 transition disabled:cursor-not-allowed"
                disabled={isSubmitting || !hasToken}
                aria-label="Toggle confirm password visibility"
                title={showPassword.confirmPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword.confirmPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-7 1.152-2.849 3.062-4.849 5.364-5.95m3.252-.67A10.05 10.05 0 0112 5c5 0 9 3.5 10 7a11.442 11.442 0 01-4.123 5.177M15 12a3 3 0 00-4.243-4.243M9.88 9.88A3 3 0 0014.12 14.12M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordsFilled && passwordsMatch ? (
              <p className="mt-1 text-xs text-green-600">Passwords match successfully.</p>
            ) : null}
            {passwordsFilled && !passwordsMatch ? (
              <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !hasToken}
            className="w-full bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
