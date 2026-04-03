import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import logo from '@/assets/pinsar-logo.png';

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tentangOpen, setTentangOpen] = useState(false);
  const tentangRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tentangRef.current && !tentangRef.current.contains(e.target as Node)) setTentangOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const tentangLinks = [
    { label: t('Sejarah', 'History'), href: '/tentang/sejarah' },
    { label: t('Visi & Misi', 'Vision & Mission'), href: '/tentang/visi-misi' },
    { label: t('Struktur Organisasi', 'Organization Structure'), href: '/tentang/struktur' },
    { label: t('Legalitas', 'Legality'), href: '/tentang/legalitas' },
  ];

  const links = [
    { label: t('Beranda', 'Home'), href: '/' },
    { label: t('Informasi', 'Information'), href: '/harga' },
    { label: t('Berita', 'News'), href: '/berita' },
  ];

  const handleMasuk = () => {
    if (session) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="PINSAR Indonesia" className="h-16 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}

          <div ref={tentangRef} className="relative">
            <button
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onMouseEnter={() => setTentangOpen(true)}
              onClick={() => setTentangOpen(!tentangOpen)}
            >
              {t('Tentang Kami', 'About Us')} <ChevronDown className="h-3 w-3" />
            </button>
            {tentangOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border bg-card shadow-lg py-1 z-50"
                onMouseLeave={() => setTentangOpen(false)}
                onMouseEnter={() => setTentangOpen(true)}
              >
                {tentangLinks.map(l => (
                  <Link key={l.href} to={l.href} className="block px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => setTentangOpen(false)}>
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/kontak" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('Kontak', 'Contact')}
          </Link>

          <LanguageToggle variant="ghost" />

          <Button size="sm" className="ml-2" onClick={handleMasuk}>
            {session ? t('Dashboard', 'Dashboard') : t('Masuk', 'Login')}
          </Button>
        </nav>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-card p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <Link key={link.href} to={link.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-foreground mb-1">{t('Tentang Kami', 'About Us')}</p>
              <div className="flex flex-col gap-1 pl-2">
                {tentangLinks.map(l => (
                  <Link key={l.href} to={l.href} className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link to="/kontak" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
              {t('Kontak', 'Contact')}
            </Link>
            <div className="px-3 py-1"><LanguageToggle variant="outline" /></div>
            <div className="px-3" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full" onClick={handleMasuk}>
                {session ? t('Dashboard', 'Dashboard') : t('Masuk', 'Login')}
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
