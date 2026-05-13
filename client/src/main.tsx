import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";

import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

import { AuthProvider } from "./auth/AuthContext";
import { EntityProvider } from "./auth/EntityContext";
import { ToastProvider } from "./components/ui/Toast";
import { ProtectedRoute } from "./auth/ProtectedRoute";

// Public
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

// Onboarding
import { OnboardingPage } from "./pages/OnboardingPage";

// Accountant workspace (Taxpayer + Admin + Auditor)
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { InvoiceFormPage } from "./pages/InvoiceFormPage";
import { InvoiceUploadPage } from "./pages/InvoiceUploadPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { PartnersPage } from "./pages/PartnersPage";
import { PartnerFormPage } from "./pages/PartnerFormPage";
import { ReportsPage } from "./pages/ReportsPage";

// Entity management
import { EntitiesPage } from "./pages/EntitiesPage";

// Public entity compliance profile
import ProfilePage from "./pages/ProfilePage";
import AuditorPage from "./pages/AuditorPage";
import AuditPage from "./pages/AuditPage";

// Admin-only entity management
import PersoanaFizicaPage from "./pages/PersoanaFizicaPage";
import PersoanaFizicaFormPage from "./pages/PersoanaFizicaFormPage";
import PersoanaJuridicaPage from "./pages/PersoanaJuridicaPage";
import PersoanaJuridicaFormPage from "./pages/PersoanaJuridicaFormPage";

const wagmiConfig = getDefaultConfig({
  appName: "TaxChain",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID",
  chains: [sepolia],
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#007FFF",
              borderRadius: "medium",
            })}
          >
            <AuthProvider>
              <EntityProvider>
              <ToastProvider>
                <BrowserRouter>
                  <Routes>
                    {/* ── Public ─────────────────────────────────────────── */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    {/* Public entity compliance profile — no auth required */}
                    <Route path="/profil/:fiscalCode" element={<ProfilePage />} />

                    {/* ── Onboarding (authenticated but unlinked Taxpayer) ─ */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/onboarding" element={<OnboardingPage />} />
                    </Route>

                    {/* ── Entity management (all authenticated roles) ─────── */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/entities" element={<EntitiesPage />} />
                    </Route>

                    {/* ── All authenticated roles ─────────────────────────── */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<DashboardPage />} />

                      {/* Invoice workspace */}
                      <Route path="/invoices" element={<InvoicesPage />} />
                      <Route
                        path="/invoices/:id"
                        element={<InvoiceDetailPage />}
                      />

                      {/* Partner workspace */}
                      <Route path="/partners" element={<PartnersPage />} />
                      <Route
                        path="/partners/:id"
                        element={<PartnerFormPage />}
                      />

                      {/* Reports */}
                      <Route path="/reports" element={<ReportsPage />} />

                      {/* Auditor dashboard (Admin + Auditor see all proofs) */}
                      <Route path="/panou-auditor" element={<AuditorPage />} />

                      {/* Audit log (Admin + Auditor) */}
                      <Route path="/jurnal-audit" element={<AuditPage />} />
                    </Route>

                    {/* ── Admin + Taxpayer: create & edit ────────────────── */}
                    <Route
                      element={
                        <ProtectedRoute allowedRoles={["Admin", "Taxpayer"]} />
                      }
                    >
                      <Route
                        path="/invoices/new"
                        element={<InvoiceFormPage />}
                      />
                      <Route
                        path="/invoices/upload"
                        element={<InvoiceUploadPage />}
                      />
                      <Route
                        path="/invoices/:id/edit"
                        element={<InvoiceFormPage />}
                      />
                      <Route
                        path="/partners/new"
                        element={<PartnerFormPage />}
                      />
                    </Route>

                    {/* ── Admin + Auditor: entity management ─────────────── */}
                    <Route
                      element={
                        <ProtectedRoute allowedRoles={["Admin", "Auditor"]} />
                      }
                    >
                      <Route
                        path="/persoane-fizice"
                        element={<PersoanaFizicaPage />}
                      />
                      <Route
                        path="/persoane-fizice/:id"
                        element={<PersoanaFizicaFormPage />}
                      />
                      <Route
                        path="/persoane-juridice"
                        element={<PersoanaJuridicaPage />}
                      />
                      <Route
                        path="/persoane-juridice/:id"
                        element={<PersoanaJuridicaFormPage />}
                      />
                    </Route>

                    {/* ── Admin only: entity create ───────────────────────── */}
                    <Route
                      element={<ProtectedRoute allowedRoles={["Admin"]} />}
                    >
                      <Route
                        path="/persoane-fizice/new"
                        element={<PersoanaFizicaFormPage />}
                      />
                      <Route
                        path="/persoane-juridice/new"
                        element={<PersoanaJuridicaFormPage />}
                      />
                    </Route>

                    {/* ── Landing (public) ───────────────────────────────── */}
                    <Route path="/" element={<LandingPage />} />

                    {/* ── Fallback ────────────────────────────────────────── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </ToastProvider>
              </EntityProvider>
            </AuthProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
