import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { useAuth } from "../auth/useAuth";
import { useToast } from "../components/ui/Toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, doLoginGoogle, doLoginWallet } = useAuth();
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => { if (user) navigate("/dashboard", { replace: true }); }, [user]);

  useEffect(() => {
    if (!isConnected || !address || user) return;
    doLoginWallet(address, (msg) => signMessageAsync({ message: msg }))
      .then(() => navigate("/dashboard", { replace: true }))
      .catch((e) => toast(e?.response?.data?.error ?? "Eroare la autentificarea cu wallet.", "err"));
  }, [isConnected, address]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg)" }}>
      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(var(--amber) 1px, transparent 1px), linear-gradient(90deg, var(--amber) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

      <div className="relative w-full max-w-sm mx-4 fade-up">
        <div className="text-center mb-10">
          <h1 className="font-display text-6xl mb-2" style={{ color: "var(--amber)" }}>TaxChain</h1>
          <p className="text-xs font-mono tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>
            Platformă fiscală descentralizată
          </p>
        </div>

        <div className="rounded-2xl border p-8 space-y-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
              — Cont Google
            </p>
            <div className="flex justify-center">
              <GoogleLogin
                theme="filled_black"
                shape="pill"
                onSuccess={async (res) => {
                  if (!res.credential) return;
                  try {
                    await doLoginGoogle(res.credential);
                    navigate("/dashboard", { replace: true });
                  } catch {
                    toast("Eroare la autentificarea Google.", "err");
                  }
                }}
                onError={() => toast("Autentificare Google eșuată.", "err")}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>sau</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
              — Wallet Web3
            </p>
            <div className="flex justify-center">
              <ConnectButton label="Conectează Wallet" />
            </div>
          </div>
        </div>

        <p className="text-center text-xs font-mono mt-6" style={{ color: "var(--text-dim)" }}>
          © 2025 TaxChain · Teză universitară
        </p>
      </div>
    </div>
  );
}
