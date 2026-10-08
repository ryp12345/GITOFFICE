import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, meRequest, registerRequest } from '../api/auth.api';
import { reportError } from '../utils/errors';

export const AuthContext = createContext(null);

// A corrupted stored user would otherwise throw on every page load and lock the user out.
function readStoredUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    reportError(error, { source: 'AuthContext:readStoredUser' });
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = readStoredUser();

    if (savedToken && savedRefreshToken && !savedUser) {
      // Tokens without a readable user cannot drive the menus or role routes; start fresh.
      clearStoredSession();
    } else if (savedToken && savedRefreshToken && savedUser) {
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      setUser(savedUser);

      // Stored sessions may predate coordinator data or a coordinator assignment change,
      // so re-sync the fields the menus depend on from the server.
      meRequest()
        .then((response) => {
          const freshUser = response.data?.data;
          if (!freshUser) return;
          setUser((prev) => {
            if (!prev) return prev;
            const nextUser = {
              ...prev,
              staff_id: freshUser.staff_id || null,
              coordinator_names: freshUser.coordinator_names || []
            };
            localStorage.setItem('user', JSON.stringify(nextUser));
            return nextUser;
          });
        })
        // Non-critical: the stored copy is still usable, and a 401 is handled by the interceptor.
        .catch((error) => reportError(error, { source: 'AuthContext:meRequest' }));
    }

    setIsLoading(false);
  }, []);

  const persistSession = (nextToken, nextRefreshToken, nextUser) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('refreshToken', nextRefreshToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setRefreshToken(nextRefreshToken);
    setUser(nextUser);
  };

  // Throws on failure so the login form can show the reason.
  const login = async (payload) => {
    const response = await loginRequest(payload);
    const session = response.data?.data;
    if (!session?.token || !session?.refreshToken || !session?.user) {
      throw new Error('Login failed: the server returned an incomplete session. Please try again.');
    }
    persistSession(session.token, session.refreshToken, session.user);
    return session.user;
  };

  const register = async (payload) => {
    await registerRequest(payload);
    return login({ email: payload.email, password: payload.password });
  };

  const logout = () => {
    clearStoredSession();
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const setSession = (session) => {
    if (!session?.token || !session?.refreshToken || !session?.user) {
      throw new Error('A complete session is required');
    }

    persistSession(session.token, session.refreshToken, session.user);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      register,
      setSession,
      logout
    }),
    [user, token, refreshToken, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
