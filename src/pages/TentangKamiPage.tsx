import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const SECTION_LABELS: Record<string, string> = {
  sejarah: 'Sejarah', visi_misi: 'Visi & Misi', struktur: 'Struktur Organisasi', legalitas: 'Legalitas',
};
const SECTION_ORDER = ['sejarah', 'visi_misi', 'struktur', 'legalitas'];

export default function TentangKamiPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('cms_about').select('*').then(({ data }) => {
      const sorted = (data ?? []).sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));
      setSections(sorted);
      setLoading(false);
    });
  }, []);

  return (
    <div className="container py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Tentang Kami</h1>
        <p className="text-muted-foreground mb-10">Perhimpunan Insan Perunggasan Rakyat Indonesia</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : sections.length === 0 ? (
          <p className="text-muted-foreground">Konten belum tersedia.</p>
        ) : (
          <div className="space-y-12">
            {sections.map(s => (
              <section key={s.id}>
                <h2 className="font-display text-xl font-bold text-foreground mb-4 pb-2 border-b">{SECTION_LABELS[s.section] || s.section}</h2>
                {s.content ? (
                  <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: s.content }} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Belum ada konten.</p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
