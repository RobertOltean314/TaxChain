import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { loginGoogle, walletNonce, walletVerify, logoutApi, refreshTokens } from "../api/auth.api";
import type { UserResponse, AuthTokens } from "../types";

interface Ctx {
  user: UserResponse | null;
  isLoading: boolean;
  doLoginGoogle: (idToken: string) => Promise<void>;
  doLoginWallet: (address: string, sign: (msg: string) => Promise<string>) => Promise<void>;
  doLogout: () => Promise<void>;
}

export const AuthContext = createContext<Ctx>({} as Ctx);

function store(tokens: AuthTokens, setUser: (u: UserResponse) => void) {
  (window as any).__tc_token = tokens.access_token;
  localStorage.setItem("tc_rt", tokens.refresh_token);
  setUser(tokens.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<UserResponse | null>(null);
  const [isLoading, setLoad]  = useState(true);

  // Restore session on mount
  useEffect(() => {
    const rt = localStorage.getItem("tc_rt");
    if (!rt) { setLoad(false); return; }
    refreshTokens(rt)
      .then((t) => store(t, setUser))
      .catch(() => localStorage.removeItem("tc_rt"))
      .finally(() => setLoad(false));
  }, []);

  const doLoginGoogle = useCallback(async (idToken: string) => {
    const t = await loginGoogle(idToken);
    store(t, setUser);
  }, []);

  const doLoginWallet = useCallback(async (
    address: string,
    sign: (msg: string) => Promise<string>,
  ) => {
    const nonce = await walletNonce(address);
    const sig   = await sign(nonce);
    const t     = await walletVerify(address, sig);
    store(t, setUser);
  }, []);

  const doLogout = useCallback(async () => {
    const rt = localStorage.getItem("tc_rt");
    if (rt) { try { await logoutApi(rt); } catch { /* ignore */ } }
    (window as any).__tc_token = null;
    localStorage.removeItem("tc_rt");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, doLoginGoogle, doLoginWallet, doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}
