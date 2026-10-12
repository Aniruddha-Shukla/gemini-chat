import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api.js';
import { onUnauthorized, tokenStorage } from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'checking' while a token saved by a previous visit is being verified, then 'ready'.
  const [status, setStatus] = useState(() => (tokenStorage.get() ? 'checking' : 'ready'));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Any 401 on an authenticated request (expired or revoked token) logs the user out.
  useEffect(() => {
    onUnauthorized(logout);
  }, [logout]);

  // On first load, confirm the stored token with the server before showing protected pages.
  useEffect(() => {
    if (status !== 'checking') return;
    let active = true;
    authApi
      .me()
      .then((me) => active && setUser(me))
      // A 401 is already handled by the interceptor; if the server is unreachable
      // the user simply lands on the login page.
      .catch(() => {})
      .finally(() => active && setStatus('ready'));
    return () => {
      active = false;
    };
  }, [status]);

  const authenticate = useCallback(async (request) => {
    const { token, user: authedUser } = await request;
    tokenStorage.set(token);
    setUser(authedUser);
    return authedUser;
  }, []);

  const login = useCallback((credentials) => authenticate(authApi.login(credentials)), [authenticate]);
  const register = useCallback((details) => authenticate(authApi.register(details)), [authenticate]);

  const value = useMemo(
    () => ({ user, isReady: status === 'ready', login, register, logout }),
    [user, status, login, register, logout]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
