import { Outlet } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import PriceTicker from '@/components/PriceTicker';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <PriceTicker />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
