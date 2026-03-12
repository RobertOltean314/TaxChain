import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.api';
import { setAccessToken } from '../api/axios';
import type { UserResponse, AuthTokens } from '../types';

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session from stored refresh token
  useEffect(() => {
    const restore = async () => {
      const storedRefresh = localStorage.getItem('refresh_token');
      if (!storedRefresh) {
        setIsLoading(false);
        return;
      }
      try {
        const tokens = await authApi.refresh(storedRefresh);
        setAccessToken(tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
        setUser(tokens.user);
      } catch {
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback((tokens: AuthTokens) => {
    setAccessToken(tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    setUser(tokens.user);
  }, []);

  const logout = useCallback(async () => {
    const storedRefresh = localStorage.getItem('refresh_token');
    if (storedRefresh) {
      try {
        await authApi.logout(storedRefresh);
      } catch {
        // ignore — we clear locally regardless
      }
    }
    setAccessToken(null);
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
