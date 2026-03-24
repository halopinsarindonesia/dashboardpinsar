import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BarChart3, Calendar, MapPin, Users, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface BannerData {
  image_url: string;
  title: string | null;
}

function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = 0;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

export default function HomePage() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [stats, setStats] = useState({ regions: 0, members: 0, pengurus: 0 });

  const yearsActive = Math.floor((Date.now() - new Date('1990-03-23').getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    // Fetch blogs
    supabase.from('cms_blogs').select('id, title, content, blog_type, publish_date, created_at, images')
      .eq('status', 'active').order('publish_date', { ascending: false }).limit(6)
      .then(({ data }) => setBlogs((data as BlogItem[]) ?? []));

    // Fetch partners
    supabase.from('cms_partners').select('id, name, logo_url')
      .eq('is_active', true).order('sort_order').limit(10)
      .then(({ data }) => setPartners((data as Partner[]) ?? []));

    // Fetch active banner (latest active one)
    supabase.from('cms_banners').select('image_url, title')
      .eq('is_active', true).order('sort_order').limit(1).maybeSingle()
      .then(({ data }) => setBanner(data as BannerData | null));

    // Fetch stats
    Promise.all([
      supabase.from('farms').select('province, status'),
      supabase.from('profiles').select('id, role').eq('status', 'approved' as any).neq('role', 'superadmin' as any),
    ]).then(([farmsRes, profilesRes]) => {
      const activeFarms = (farmsRes.data ?? []).filter((f: any) => f.status === 'active' || f.status === 'prapasca');
      const provinces = new Set(activeFarms.map((f: any) => f.province).filter(Boolean));
      const allMembers = profilesRes.data ?? [];
      const pengurus = allMembers.filter((p: any) => p.role === 'dpp' || p.role === 'dpw');
      setStats({ regions: provinces.size, members: allMembers.length, pengurus: pengurus.length });
    });
  }, []);

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const animYears = useCountUp(yearsActive);
  const animRegions = useCountUp(stats.regions);
  const animMembers = useCountUp(stats.members);
  const animPengurus = useCountUp(stats.pengurus);

  return (
    <div>
      {/* Hero Banner */}
      <section
        className="relative overflow-hidden py-24 lg:py-32"
        style={banner ? {
          backgroundImage: `linear-gradient(to right, hsl(0 0% 0% / 0.7), hsl(0 0% 0% / 0.4)), url(${banner.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {
          background: 'linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(0 0% 8%) 100%)',
        }}
      >
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
              Perhimpunan Insan Perunggasan Rakyat Indonesia
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Platform digital untuk memantau harga, mengelola peternakan, dan mendukung industri perunggasan Indonesia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" className="font-semibold">
                  Masuk Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/tentang/sejarah">
                <Button size="lg" variant="outline" className="font-semibold border-white/30 text-white hover:bg-white/10">
                  Tentang Kami
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
      </section>

      {/* PINSAR in Numbers */}
      <section className="py-16 bg-card border-b">
        <div className="container">
          <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2">PINSAR dalam Angka</h2>
          <p className="text-muted-foreground text-center mb-10">Data terkini dari seluruh jaringan PINSAR Indonesia</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-display text-4xl font-extrabold text-primary">{animYears}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Tahun Aktif</p>
            </div>
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-display text-4xl font-extrabold text-primary">{animRegions}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Wilayah</p>
            </div>
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-display text-4xl font-extrabold text-primary">{animMembers}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Anggota</p>
            </div>
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-display text-4xl font-extrabold text-primary">{animPengurus}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">Pengurus</p>
            </div>
          </div>
        </div>
      </section>

      {/* Berita Section */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">Berita & Kegiatan</h2>
            <Link to="/berita" className="text-sm font-medium text-primary hover:underline">Lihat Semua →</Link>
          </div>
          {blogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada berita.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.slice(0, 6).map((item) => (
                <Link key={item.id} to={`/berita/${item.id}`} className="group">
                  <article className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden">
                    <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                      {item.images && item.images[0] ? (
                        <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <BarChart3 className="h-8 w-8 text-primary/30" />
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={item.blog_type === 'news' ? 'default' : 'secondary'} className="text-[10px]">
                          {item.blog_type === 'news' ? 'Berita' : 'Kegiatan'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(item.publish_date || item.created_at)}</span>
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 flex-1">{item.content}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Anggota Section */}
      {partners.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">Anggota</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {partners.slice(0, 10).map(p => (
                <div key={p.id} className="rounded-xl border bg-card p-4 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
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
