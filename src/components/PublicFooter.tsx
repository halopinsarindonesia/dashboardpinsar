import { Link } from 'react-router-dom';
import { Bird } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="border-t bg-foreground text-primary-foreground">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bird className="h-6 w-6" />
              <span className="font-display text-lg font-bold">PINSAR</span>
            </div>
            <p className="text-sm text-primary-foreground/70">
              Perhimpunan Insan Perunggasan Rakyat Indonesia. Membangun industri perunggasan yang berkelanjutan.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/" className="hover:text-primary-foreground">Beranda</Link></li>
              <li><Link to="/berita" className="hover:text-primary-foreground">Berita</Link></li>
              <li><Link to="/kegiatan" className="hover:text-primary-foreground">Kegiatan</Link></li>
              <li><Link to="/tentang" className="hover:text-primary-foreground">Tentang Kami</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>info@pinsar.or.id</li>
              <li>+62 21 1234 5678</li>
              <li>Jakarta, Indonesia</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">Ikuti Kami</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="#" className="hover:text-primary-foreground">Facebook</a></li>
              <li><a href="#" className="hover:text-primary-foreground">Instagram</a></li>
              <li><a href="#" className="hover:text-primary-foreground">YouTube</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/20 pt-8 text-center text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} PINSAR Indonesia. Hak Cipta Dilindungi.
        </div>
      </div>
    </footer>
  );
}
