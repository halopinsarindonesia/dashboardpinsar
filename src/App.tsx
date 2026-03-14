import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";

import PublicLayout from "@/layouts/PublicLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

import HomePage from "@/pages/HomePage";
import HargaPage from "@/pages/HargaPage";
import BeritaPage from "@/pages/BeritaPage";
import BeritaDetailPage from "@/pages/BeritaDetailPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFound from "@/pages/NotFound";

import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import FarmsPage from "@/pages/dashboard/FarmsPage";
import SupplyPage from "@/pages/dashboard/SupplyPage";
import MapPage from "@/pages/dashboard/MapPage";
import PricesPage from "@/pages/dashboard/PricesPage";
import UsersPage from "@/pages/dashboard/UsersPage";
import CMSPage from "@/pages/dashboard/CMSPage";
import ExportPage from "@/pages/dashboard/ExportPage";
import AuditPage from "@/pages/dashboard/AuditPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/harga" element={<HargaPage />} />
              <Route path="/berita" element={<BeritaPage />} />
              <Route path="/berita/:id" element={<BeritaDetailPage />} />
              <Route path="/tentang" element={<PlaceholderPage title="Tentang Kami" />} />
              <Route path="/kontak" element={<PlaceholderPage title="Kontak" />} />
            </Route>

            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Dashboard routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="farms" element={<FarmsPage />} />
              <Route path="supply" element={<SupplyPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="prices" element={<PricesPage />} />
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
  </QueryClientProvider>
);

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="container py-16">
      <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-muted-foreground">Halaman ini akan segera tersedia.</p>
    </div>
  );
}

export default App;
