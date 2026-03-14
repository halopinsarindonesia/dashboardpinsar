import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Bird,
  Warehouse,
  ClipboardList,
  Users,
  FileText,
  Settings,
  LogOut,
  Map,
  BarChart3,
  ScrollText,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['dpp', 'dpw'] },
  { label: 'Peternakan', href: '/dashboard/farms', icon: Warehouse, roles: ['dpp', 'dpw', 'peternak'] },
  { label: 'Input Suplai', href: '/dashboard/supply', icon: ClipboardList, roles: ['dpp', 'dpw', 'peternak'] },
  { label: 'Peta Peternakan', href: '/dashboard/map', icon: Map, roles: ['dpp', 'dpw'] },
  { label: 'Harga', href: '/dashboard/prices', icon: BarChart3, roles: ['dpp', 'dpw'] },
  { label: 'Pengguna', href: '/dashboard/users', icon: Users, roles: ['dpp', 'dpw'] },
  { label: 'CMS', href: '/dashboard/cms', icon: FileText, roles: ['dpp'] },
  { label: 'Ekspor Data', href: '/dashboard/export', icon: Download, roles: ['dpp', 'dpw'] },
  { label: 'Audit Log', href: '/dashboard/audit', icon: ScrollText, roles: ['dpp', 'dpw'] },
  { label: 'Pengaturan', href: '/dashboard/settings', icon: Settings, roles: ['dpp', 'dpw', 'peternak'] },
];

export default function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = profile?.role ?? 'peternak';

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  const roleLabel = userRole === 'dpp' ? 'DPP (Superadmin)' : userRole === 'dpw' ? 'DPW (Provincial)' : 'Peternak';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const roleLabel = userRole === 'dpp' ? 'DPP (Superadmin)' : userRole === 'dpw' ? 'DPW (Provincial)' : 'Peternak';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Bird className="h-7 w-7 text-sidebar-primary" />
          <span className="font-display text-lg font-bold text-sidebar-primary">PINSAR</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'nav-item-active'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-sidebar-foreground">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <Bird className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-foreground">PINSAR</span>
          </div>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
