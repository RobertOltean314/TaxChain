import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useAuth } from '../auth/useAuth';
import { authApi } from '../api/auth.api';
import { useToast } from '../components/ui/Toast';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // When wallet connects, immediately kick off SIWE flow
  useEffect(() => {
    if (!isConnected || !address) return;

    const doSiwe = async () => {
      try {
        toast('Semnați mesajul în wallet...', 'info');
        const nonce = await authApi.getWalletNonce(address);
        const signature = await signMessageAsync({ message: nonce });
        const tokens = await authApi.verifyWallet(address, signature);
        login(tokens);
        toast('Autentificat cu succes prin wallet!', 'success');
        navigate('/dashboard', { replace: true });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Autentificarea cu wallet a eșuat';
        toast(msg, 'error');
        disconnect();
      }
    };

    doSiwe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const handleGoogleSuccess = (credentialResponse: import('@react-oauth/google').CredentialResponse) => {
    if (!credentialResponse.credential) return;
    authApi
      .loginWithGoogle(credentialResponse.credential)
      .then((tokens) => {
        login(tokens);
        toast('Autentificat cu succes prin Google!', 'success');
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        toast('Autentificarea prin Google a eșuat', 'error');
      });
  };

  return (
    <div className="min-h-screen flex bg-surface overflow-hidden">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Background mesh */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(59,130,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 70% 70%, rgba(34,211,238,0.07) 0%, transparent 70%)',
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <span className="font-display text-3xl text-white tracking-tight">
              Tax<span className="text-brand">Chain</span>
            </span>
          </div>
          <div>
            <blockquote className="max-w-sm">
              <p className="font-display text-2xl text-white/90 leading-snug italic">
                "Administrare fiscală transparentă, ancorată în blockchain."
              </p>
              <footer className="mt-4 text-sm text-slate-500">
                Platformă hibridă Web2 / Web3 · Teză de licență
              </footer>
            </blockquote>
          </div>
          <div className="flex gap-6 text-xs text-slate-600 font-mono">
            <span>Ethereum</span>
            <span>·</span>
            <span>SIWE</span>
            <span>·</span>
            <span>JWT</span>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-[420px] shrink-0 flex flex-col justify-center px-8 py-12 border-l border-surface-border bg-surface-raised/30">
        <div className="max-w-sm w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <span className="font-display text-2xl text-white">
              Tax<span className="text-brand">Chain</span>
            </span>
          </div>

          <h1 className="font-display text-2xl text-white mb-1">Autentificare</h1>
          <p className="text-sm text-slate-400 mb-10">
            Alegeți metoda de autentificare preferată
          </p>

          {/* Google login */}
          <div className="mb-4">
            <p className="input-label mb-3">Cont Google</p>
            <div className="flex justify-start">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast('Autentificarea prin Google a eșuat', 'error')}
                theme="filled_black"
                shape="rectangular"
                size="large"
                text="signin_with"
              />
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-slate-500 bg-surface-raised">
                sau
              </span>
            </div>
          </div>

          {/* Wallet login */}
          <div>
            <p className="input-label mb-3">Wallet Ethereum</p>
            <p className="text-xs text-slate-500 mb-4">
              Conectați wallet-ul, apoi semnați mesajul SIWE pentru autentificare.
            </p>
            <ConnectButton
              label="Conectare Wallet"
              showBalance={false}
              chainStatus="none"
            />
          </div>

          <p className="mt-10 text-xs text-slate-600 text-center">
            Platforma TaxChain · Date protejate conform GDPR
          </p>
        </div>
      </div>
    </div>
  );
}
