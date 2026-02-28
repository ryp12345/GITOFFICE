import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, registerRequest } from '../api/auth.api';

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedRefreshToken && savedUser) {
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      setUser(JSON.parse(savedUser));
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

  const login = async (payload) => {
    const response = await loginRequest(payload);
    const session = response.data?.data;
    persistSession(session.token, session.refreshToken, session.user);
    return session.user;
  };

  const register = async (payload) => {
    await registerRequest(payload);
    return login({ email: payload.email, password: payload.password });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
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
