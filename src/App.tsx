import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

import PublicLayout from "@/layouts/PublicLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

import HomePage from "@/pages/HomePage";
import HargaPage from "@/pages/HargaPage";
import BeritaPage from "@/pages/BeritaPage";
import BeritaDetailPage from "@/pages/BeritaDetailPage";
import TentangKamiPage from "@/pages/TentangKamiPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import KontakPage from "@/pages/KontakPage";
import NotFound from "@/pages/NotFound";

import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import FarmsPage from "@/pages/dashboard/FarmsPage";
import SupplyPage from "@/pages/dashboard/SupplyPage";
import MapPage from "@/pages/dashboard/MapPage";
import UsersPage from "@/pages/dashboard/UsersPage";
import CMSPage from "@/pages/dashboard/CMSPage";
import ExportPage from "@/pages/dashboard/ExportPage";
import AuditPage from "@/pages/dashboard/AuditPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/harga" element={<HargaPage />} />
                <Route path="/berita" element={<BeritaPage />} />
                <Route path="/berita/:id" element={<BeritaDetailPage />} />
                <Route path="/tentang/:section" element={<TentangKamiPage />} />
                <Route path="/kontak" element={<KontakPage />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="farms" element={<FarmsPage />} />
                <Route path="supply" element={<SupplyPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="cms" element={<CMSPage />} />
                <Route path="export" element={<ExportPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
