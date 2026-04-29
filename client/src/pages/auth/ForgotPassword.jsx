import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '../../api/auth.api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await forgotPasswordRequest({ email: normalizedEmail });
      setSuccess(
        response?.data?.message ||
          'If an account exists for this email, a password reset link has been sent.'
      );
      setEmail('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not process your request right now.');
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-center mb-2">Forgot Password</h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Enter your email and we will send a password reset link.
        </p>

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
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              disabled={isSubmitting}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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
