import { Link } from 'react-router-dom';
import { Bird, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: 'Beranda', href: '/' },
    { label: 'Berita', href: '/berita' },
    { label: 'Kegiatan', href: '/kegiatan' },
    { label: 'Tentang Kami', href: '/tentang' },
    { label: 'Kontak', href: '/kontak' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Bird className="h-8 w-8 text-primary" />
          <span className="font-display text-lg font-bold text-foreground">
            PINSAR
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link to="/login">
            <Button size="sm" className="ml-4">
              Masuk
            </Button>
          </Link>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-card p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full">Masuk</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
