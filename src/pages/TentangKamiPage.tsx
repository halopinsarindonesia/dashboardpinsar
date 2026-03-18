import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft } from 'lucide-react';

const SECTION_MAP: Record<string, { key: string; label: string }> = {
  sejarah: { key: 'sejarah', label: 'Sejarah' },
  'visi-misi': { key: 'visi_misi', label: 'Visi & Misi' },
  struktur: { key: 'struktur', label: 'Struktur Organisasi' },
  legalitas: { key: 'legalitas', label: 'Legalitas' },
};

export default function TentangKamiPage() {
  const { section } = useParams<{ section: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mapped = section ? SECTION_MAP[section] : null;

  useEffect(() => {
    if (!mapped) { setLoading(false); return; }
    supabase.from('cms_about').select('content').eq('section', mapped.key).maybeSingle()
      .then(({ data }) => {
        setContent(data?.content ?? null);
        setLoading(false);
      });
  }, [mapped?.key]);

  if (!mapped) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Halaman tidak ditemukan.</p>
        <Link to="/" className="text-primary mt-4 inline-block">← Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Tentang Kami</p>
            <h1 className="font-display text-3xl font-bold text-foreground">{mapped.label}</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : content ? (
          <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p className="text-muted-foreground">Konten belum tersedia.</p>
        )}

        {/* Navigation between sections */}
        <div className="mt-12 border-t pt-8">
          <p className="text-sm font-semibold text-foreground mb-3">Tentang Kami Lainnya</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SECTION_MAP).filter(([k]) => k !== section).map(([k, v]) => (
              <Link key={k} to={`/tentang/${k}`} className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                {v.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
