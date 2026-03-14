import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Warehouse, BarChart3, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const features = [
  { icon: Warehouse, title: 'Manajemen Peternakan', description: 'Kelola data peternakan di seluruh Indonesia dengan sistem terstruktur.' },
  { icon: BarChart3, title: 'Harga Terkini', description: 'Pantau harga ayam dan telur secara real-time dari seluruh daerah.' },
  { icon: Shield, title: 'Data Terverifikasi', description: 'Semua data melalui proses verifikasi untuk menjamin akurasi.' },
];

interface BlogItem {
  id: string;
  title: string;
  content: string | null;
  blog_type: string;
  publish_date: string | null;
  created_at: string;
  images: string[] | null;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string;
}

export default function HomePage() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    supabase.from('cms_blogs').select('id, title, content, blog_type, publish_date, created_at, images')
      .eq('status', 'active').order('publish_date', { ascending: false }).limit(6)
      .then(({ data }) => setBlogs((data as BlogItem[]) ?? []));

    supabase.from('cms_partners').select('id, name, logo_url')
      .eq('is_active', true).order('sort_order').limit(10)
      .then(({ data }) => setPartners((data as Partner[]) ?? []));
  }, []);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(0_78%_42%/0.2),transparent_60%)]" />
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-secondary-foreground sm:text-4xl lg:text-5xl">
              Perhimpunan Insan Perunggasan Rakyat Indonesia
            </h1>
            <p className="mt-4 text-lg text-secondary-foreground/80">
              Platform digital untuk memantau harga, mengelola peternakan, dan mendukung industri perunggasan Indonesia.
            </p>
            <div className="mt-8">
              <Link to="/login">
                <Button size="lg" className="font-semibold">
                  Masuk Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl font-bold text-foreground">Tentang PINSAR</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
              PINSAR merupakan wadah bagi para pelaku industri perunggasan rakyat di Indonesia untuk berkoordinasi, berbagi data, dan memperjuangkan kepentingan bersama.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="stat-card text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Berita Section */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">Berita & Kegiatan</h2>
            <Link to="/berita" className="text-sm font-medium text-primary hover:underline">Lihat Semua →</Link>
          </div>
          {blogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada berita.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {blogs.slice(0, 6).map((item) => (
                <Link key={item.id} to={`/berita/${item.id}`} className="group">
                  <article className="stat-card h-full flex flex-col">
                    <div className="mb-3 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {item.images && item.images[0] ? (
                        <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <BarChart3 className="h-8 w-8 text-primary/30" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={item.blog_type === 'news' ? 'default' : 'secondary'} className="text-[10px]">
                        {item.blog_type === 'news' ? 'Berita' : 'Kegiatan'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(item.publish_date || item.created_at)}</span>
                    </div>
                    <h3 className="mt-1 font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2 flex-1">{item.content}</p>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Partners Section */}
      {partners.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">Mitra Kami</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {partners.slice(0, 10).map(p => (
                <div key={p.id} className="stat-card flex flex-col items-center justify-center p-4 text-center">
                  <div className="h-16 w-16 mb-2 flex items-center justify-center">
                    <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
