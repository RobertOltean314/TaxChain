import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './auth/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PersoanaFizicaPage } from './pages/PersoanaFizicaPage';
import { PersoanaFizicaFormPage } from './pages/PersoanaFizicaFormPage';
import { PersoanaJuridicaPage } from './pages/PersoanaJuridicaPage';
import { PersoanaJuridicaFormPage } from './pages/PersoanaJuridicaFormPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

const wagmiConfig = getDefaultConfig({
  appName: 'TaxChain',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia],
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#3b82f6',
              borderRadius: 'medium',
            })}
          >
            <AuthProvider>
              <ToastProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />

                    {/* Protected — any authenticated role */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<DashboardPage />} />

                      <Route path="/persoane-fizice" element={<PersoanaFizicaPage />} />
                      <Route path="/persoane-fizice/:id" element={<PersoanaFizicaFormPage />} />

                      <Route path="/persoane-juridice" element={<PersoanaJuridicaPage />} />
                      <Route path="/persoane-juridice/:id" element={<PersoanaJuridicaFormPage />} />
                    </Route>

                    {/* Admin-only create routes */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                      <Route path="/persoane-fizice/new" element={<PersoanaFizicaFormPage />} />
                      <Route path="/persoane-juridice/new" element={<PersoanaJuridicaFormPage />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </BrowserRouter>
              </ToastProvider>
            </AuthProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
