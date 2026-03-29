import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, Warehouse, ClipboardList, Users, FileText,
  LogOut, Map, ScrollText, Download, Menu, X, UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import LanguageToggle from '@/components/LanguageToggle';
import logo from '@/assets/logopinsar.jpg';

interface NavItem {
  label: string; labelEn: string; href: string; icon: React.ElementType;
  superadminOnly?: boolean; allRoles?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', labelEn: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, allRoles: true },
  { label: 'Peternakan', labelEn: 'Farms', href: '/dashboard/farms', icon: Warehouse, allRoles: true },
  { label: 'Produksi', labelEn: 'Production', href: '/dashboard/supply', icon: ClipboardList, allRoles: true },
  { label: 'Peta Peternakan', labelEn: 'Farm Map', href: '/dashboard/map', icon: Map, allRoles: true },
  { label: 'Pengguna', labelEn: 'Users', href: '/dashboard/users', icon: Users, superadminOnly: true },
  { label: 'CMS', labelEn: 'CMS', href: '/dashboard/cms', icon: FileText, superadminOnly: true },
  { label: 'Ekspor Data', labelEn: 'Export Data', href: '/dashboard/export', icon: Download, superadminOnly: true },
  { label: 'Audit Log', labelEn: 'Audit Log', href: '/dashboard/audit', icon: ScrollText, superadminOnly: true },
  { label: 'Profile', labelEn: 'Profile', href: '/dashboard/settings', icon: UserCircle, allRoles: true },
];

export default function DashboardLayout() {
  const { profile, signOut, isSuperadmin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = profile?.role ?? 'peternak';

  const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Superadmin', dpp: 'DPP', dpd: 'DPD', dpw: 'DPW', peternak: t('Anggota', 'Member'),
  };

  const filteredNav = navItems.filter((item) => {
    if (item.superadminOnly) return isSuperadmin;
    return true;
  });

  const roleLabel = ROLE_LABELS[userRole] || userRole;

  const handleLogout = async () => {
    try { await signOut(); } catch {}
    navigate('/login', { replace: true });
  };

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'nav-item-active' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.label, item.labelEn)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-2">
        <LanguageToggle variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        <div className="mb-1">
          <p className="text-sm font-medium text-sidebar-foreground">{profile?.full_name ?? 'User'}</p>
          <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
        </div>
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" /> {t('Keluar', 'Logout')}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Link to="/">
            <img src={logo} alt="PINSAR" className="h-8 w-8 object-contain cursor-pointer" />
          </Link>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[999] lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground z-[1000]">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
              <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt="PINSAR" className="h-8 w-8 object-contain" />
              </Link>
              <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5 text-sidebar-foreground" /></button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)}><Menu className="h-6 w-6 text-foreground" /></button>
            <Link to="/"><img src={logo} alt="PINSAR" className="h-7 w-7 object-contain" /></Link>
          </div>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
