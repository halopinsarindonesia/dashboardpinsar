import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/pinsar-logo.png';

interface ContactInfo {
  email: string | null;
  phone: string | null;
  address: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
}

export default function PublicFooter() {
  const [contact, setContact] = useState<ContactInfo | null>(null);

  useEffect(() => {
    supabase.from('cms_contact').select('*').limit(1).maybeSingle()
      .then(({ data }) => setContact(data as ContactInfo | null));
  }, []);

  return (
    <footer className="border-t bg-background text-foreground">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="PINSAR" className="h-24 w-auto object-contain rounded" />
            </div>
            <p className="text-sm text-muted-foreground">
              Membangun Industri Perunggasan Nasional Berkelanjutan, dengan semangat kolaborasi dan gotong – royong demi kemajuan Peternak Indonesia.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">Beranda</Link></li>
              <li><Link to="/harga" className="hover:text-foreground">Harga</Link></li>
              <li><Link to="/berita" className="hover:text-foreground">Berita</Link></li>
              <li><Link to="/tentang/sejarah" className="hover:text-foreground">Tentang Kami</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{contact?.email || 'info@pinsar.or.id'}</li>
              <li>{contact?.phone || '-'}</li>
              <li>{contact?.address || 'Jakarta, Indonesia'}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4">Ikuti Kami</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {contact?.facebook && <li><a href={contact.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Facebook</a></li>}
              {contact?.instagram && <li><a href={contact.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Instagram</a></li>}
              {contact?.twitter && <li><a href={contact.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Twitter</a></li>}
              {contact?.youtube && <li><a href={contact.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">YouTube</a></li>}
              {!contact?.facebook && !contact?.instagram && !contact?.twitter && !contact?.youtube && (
                <li className="text-muted-foreground/50">Belum ada data</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} PINSAR Indonesia. Hak Cipta Dilindungi.
        </div>
      </div>
    </footer>
  );
}
