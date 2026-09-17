'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSession, type ApiUser } from '../../lib/apiClient';
import { clearSession, readCachedUser, readToken, saveSession } from '../../lib/auth';

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  isLoading: boolean;
  setSession: (token: string, user: ApiUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Provides backend-issued session state to the App Router client tree. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = readToken();
    const cachedUser = readCachedUser();
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    setToken(storedToken);
    setUser(cachedUser);
    getSession(storedToken)
      .then((session) => setUser(session.user))
      .catch(() => {
        clearSession();
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    setSession: (nextToken, nextUser) => {
      saveSession(nextToken, nextUser);
      setToken(nextToken);
      setUser(nextUser);
    },
    logout: () => {
      clearSession();
      setToken(null);
      setUser(null);
    }
  }), [isLoading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads the current authentication context and fails clearly outside its provider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
