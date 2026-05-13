import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth.api";
import type { UserResponse, AuthTokens } from "../types";

interface Ctx {
  user: UserResponse | null;
  isLoading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithWallet: (
    address: string,
    sign: (msg: string) => Promise<string>,
  ) => Promise<void>;
  logout: () => Promise<void>;
  applyTokens: (tokens: AuthTokens) => void;
}

export const AuthContext = createContext<Ctx>({} as Ctx);

function store(tokens: AuthTokens, setUser: (u: UserResponse) => void) {
  (window as any).__tc_token = tokens.access_token;
  localStorage.setItem("tc_rt", tokens.refresh_token);
  setUser(tokens.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setLoad] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const rt = localStorage.getItem("tc_rt");
    if (!rt) {
      setLoad(false);
      return;
    }
    authApi
      .refresh(rt)
      .then((t) => store(t, setUser))
      .catch(() => localStorage.removeItem("tc_rt"))
      .finally(() => setLoad(false));
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const t = await authApi.loginWithGoogle(idToken);
    store(t, setUser);
  }, []);

  const loginWithWallet = useCallback(
    async (address: string, sign: (msg: string) => Promise<string>) => {
      const nonce = await authApi.getWalletNonce(address);
      const sig = await sign(nonce);
      const t = await authApi.verifyWallet(address, sig);
      store(t, setUser);
    },
    [],
  );

  const logout = useCallback(async () => {
    const rt = localStorage.getItem("tc_rt");
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {}
    }
    (window as any).__tc_token = null;
    localStorage.removeItem("tc_rt");
    setUser(null);
  }, []);

  const applyTokens = useCallback((tokens: AuthTokens) => {
    store(tokens, setUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGoogle,
        loginWithWallet,
        logout,
        applyTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
