import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stopImpersonation } from '../../api/userApi';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPathByRole } from '../../utils/role';
import api from '../../api/axios';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout, setSession } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const load = async () => {
      if (!user?.id) return;
      try {
        const res = await api.get('/notifications', { params: { user_id: user.id } });
        if (!mounted) return;
        const rows = res.data?.data || [];
        const mapped = rows.map((r) => ({
          id: r.id,
          message: r.description || r.notification_title,
          is_read: false,
          created_at: r.created_at || r.date,
        }));
        setNotifications(mapped);
      } catch (err) {
        // ignore
      }
    };

    load();
    timer = setInterval(load, 30000);

    return () => { mounted = false; if (timer) clearInterval(timer); };
  }, [user?.id]);

  useEffect(() => {
    if (!showNotifications) return;

    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    if (!isProfileOpen) return;

    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(event) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const displayName = user?.email || 'User';
  const initials = (displayName?.[0] || 'U').toUpperCase();
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleStopImpersonation = async () => {
    if (isStoppingImpersonation) return;

    const confirmed = window.confirm('Stop impersonation and return to your original login?');
    if (!confirmed) return;

    setIsStoppingImpersonation(true);

    try {
      const response = await stopImpersonation();
      const session = response?.data?.data;
      setSession(session);
      setIsMenuOpen(false);
      setIsProfileOpen(false);
      navigate(getDashboardPathByRole(session?.user?.role), { replace: true });
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to stop impersonation.';
      window.alert(message);
    } finally {
      setIsStoppingImpersonation(false);
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-16 sm:h-20 w-full items-center justify-between px-3 sm:px-6 lg:px-8">

        <div className="flex items-center gap-3">
          <img src="/git_logo.jpg" alt="Git logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-md object-contain" />
          <h1 className="br text-lg sm:text-2xl font-bold text-slate-900">KLS-GIT</h1>
        </div>

        <div className="flex items-center justify-end space-x-3 relative">
          {Boolean(user?.impersonating) && (
            <button
              type="button"
              onClick={handleStopImpersonation}
              disabled={isStoppingImpersonation}
              className="hidden sm:inline-flex items-center rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              {isStoppingImpersonation ? 'Stopping...' : 'Stop Impersonation'}
            </button>
          )}

          <div className="relative" ref={notificationRef}>
            <button
              className="relative p-2 rounded-full hover:bg-slate-100"
              aria-label="Notifications"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 15V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v4a2.032 2.032 0 01-.595 1.405L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b font-semibold text-slate-700">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-slate-500">No notifications</div>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="px-4 py-3 border-b last:border-b-0 text-sm text-slate-700">
                      <p>{item.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="hidden md:block relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-semibold">
                {initials}
              </div>
              <span className="text-sm font-medium text-slate-700">{displayName}</span>
              <svg
                className={`w-4 h-4 text-slate-500 transition ${isProfileOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-medium text-slate-900 break-all">{displayName}</div>
                  <div className="mt-2 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {user?.role || 'User'}
                  </div>
                </div>
                  <button
                    onClick={() => { setIsProfileOpen(false); navigate('/change-password'); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 border-b border-slate-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="md:hidden text-slate-700 hover:text-slate-900 focus:outline-none"
            aria-label="Open mobile menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen && user && (
        <div ref={mobileMenuRef} className="md:hidden px-4 pb-4 space-y-2 border-t border-slate-100">
          <div className="text-sm text-slate-600 pt-3 break-all">{displayName}</div>
          <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            {user?.role || 'User'}
          </div>
          {Boolean(user?.impersonating) && (
            <button
              type="button"
              onClick={handleStopImpersonation}
              disabled={isStoppingImpersonation}
              className="w-full border border-red-500 text-red-600 px-4 py-2 rounded-lg transition text-sm font-semibold hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              {isStoppingImpersonation ? 'Stopping...' : 'Stop Impersonation'}
            </button>
          )}
           <button
             onClick={() => { setIsMenuOpen(false); navigate('/change-password'); }}
             className="w-full border border-slate-300 text-slate-700 px-4 py-2 rounded-lg transition text-sm font-semibold hover:bg-slate-50"
           >
             Change Password
           </button>
           <button
             onClick={handleLogout}
             className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
           >
             Logout
           </button>
        </div>
      )}
    </header>
  );
}
