import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";

import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import { ToastProvider } from "./components/ui/Toast";
import AppLayout from "./components/ui/AppLayout";

import LoginPage               from "./pages/LoginPage";
import UnauthorizedPage        from "./pages/UnauthorizedPage";
import DashboardPage           from "./pages/DashboardPage";
import PersoanaFizicaPage      from "./pages/PersoanaFizicaPage";
import PersoanaFizicaFormPage  from "./pages/PersoanaFizicaFormPage";
import PersoanaJuridicaPage    from "./pages/PersoanaJuridicaPage";
import PersoanaJuridicaFormPage from "./pages/PersoanaJuridicaFormPage";
import PartenerPage            from "./pages/PartenerPage";
import PartenerFormPage        from "./pages/PartenerFormPage";
import InvoicePage             from "./pages/InvoicePage";
import InvoiceFormPage         from "./pages/InvoiceFormPage";
import InvoiceDetailPage       from "./pages/InvoiceDetailPage";

// ─── wagmi v2 + RainbowKit v2 ─────────────────────────────────────────────────
const wagmiConfig = getDefaultConfig({
  appName: "TaxChain",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000",
  chains: [mainnet, sepolia],
  transports: { [mainnet.id]: http(), [sepolia.id]: http() },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <AuthProvider>
              <ToastProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <Routes>
                    {/* ── Public ───────────────────────────────── */}
                    <Route path="/login"        element={<LoginPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />

                    {/* ── All authenticated roles ───────────────── */}
                    <Route element={<ProtectedRoute roles={["Admin", "Taxpayer", "Auditor"]} />}>
                      <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />

                        {/* Partners — /parteneri (frontend) → /partener (backend) */}
                        <Route path="/parteneri"     element={<PartenerPage />} />
                        <Route path="/parteneri/:id" element={<PartenerFormPage />} />
                        <Route path="/parteneri/nou" element={<PartenerFormPage />} />

                        {/* Invoices */}
                        <Route path="/facturi"             element={<InvoicePage />} />
                        <Route path="/facturi/:id"         element={<InvoiceDetailPage />} />
                        <Route path="/facturi/nou"         element={<InvoiceFormPage />} />
                        <Route path="/facturi/:id/editare" element={<InvoiceFormPage />} />
                      </Route>
                    </Route>

                    {/* ── Admin + Auditor ───────────────────────── */}
                    <Route element={<ProtectedRoute roles={["Admin", "Auditor"]} />}>
                      <Route element={<AppLayout />}>
                        <Route path="/persoane-fizice"       element={<PersoanaFizicaPage />} />
                        <Route path="/persoane-fizice/:id"   element={<PersoanaFizicaFormPage />} />
                        <Route path="/persoane-fizice/new"   element={<PersoanaFizicaFormPage />} />
                        <Route path="/persoane-juridice"     element={<PersoanaJuridicaPage />} />
                        <Route path="/persoane-juridice/:id" element={<PersoanaJuridicaFormPage />} />
                        <Route path="/persoane-juridice/new" element={<PersoanaJuridicaFormPage />} />
                      </Route>
                    </Route>

                    {/* ── Fallback ──────────────────────────────── */}
                    <Route path="/"  element={<Navigate to="/dashboard" replace />} />
                    <Route path="*"  element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </BrowserRouter>
              </ToastProvider>
            </AuthProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
