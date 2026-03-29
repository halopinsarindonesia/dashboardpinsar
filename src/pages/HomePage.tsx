import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BarChart3, Calendar, MapPin, Users, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface BlogItem { id: string; title: string; content: string | null; blog_type: string; publish_date: string | null; created_at: string; images: string[] | null; }
interface Partner { id: string; name: string; logo_url: string; }
interface BannerData { image_url: string; title: string | null; }
interface GalleryItem { id: string; image_url: string; title: string | null; }

function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = 0;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); } else setValue(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

export default function HomePage() {
  const { t } = useLanguage();
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [overview, setOverview] = useState('');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [stats, setStats] = useState({ regions: 0, members: 0, pengurus: 0 });

  const yearsActive = Math.floor((Date.now() - new Date('1990-03-23').getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    supabase.from('cms_blogs').select('id, title, content, blog_type, publish_date, created_at, images')
      .eq('status', 'active').order('publish_date', { ascending: false }).limit(5)
      .then(({ data }) => setBlogs((data as BlogItem[]) ?? []));

    supabase.from('cms_partners').select('id, name, logo_url')
      .eq('is_active', true).order('sort_order').limit(10)
      .then(({ data }) => setPartners((data as Partner[]) ?? []));

    supabase.from('cms_banners').select('image_url, title')
      .eq('is_active', true).order('sort_order').limit(1).maybeSingle()
      .then(({ data }) => setBanner(data as BannerData | null));

    supabase.from('cms_about').select('content').eq('section', 'overview').maybeSingle()
      .then(({ data }) => setOverview((data as any)?.content || ''));

    supabase.from('cms_gallery' as any).select('id, image_url, title')
      .eq('is_active', true).order('sort_order').limit(5)
      .then(({ data }) => setGallery((data as GalleryItem[]) ?? []));

    Promise.all([
      supabase.from('farms').select('province, status'),
      supabase.from('profiles').select('id, role').eq('status', 'approved' as any).neq('role', 'superadmin' as any),
    ]).then(([farmsRes, profilesRes]) => {
      const activeFarms = (farmsRes.data ?? []).filter((f: any) => f.status === 'active' || f.status === 'prapasca');
      const provinces = new Set(activeFarms.map((f: any) => f.province).filter(Boolean));
      const allMembers = profilesRes.data ?? [];
      const pengurus = allMembers.filter((p: any) => p.role === 'dpp' || p.role === 'dpd' || p.role === 'dpw');
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
          backgroundSize: 'cover', backgroundPosition: 'center',
        } : { background: 'linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(0 0% 8%) 100%)' }}
      >
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
              {t('Perhimpunan Insan Perunggasan Rakyat Indonesia', 'Indonesian People\'s Poultry Association')}
            </h1>
            <p className="mt-4 text-lg text-white/80">
              {t('Platform digital untuk memantau harga, mengelola peternakan, dan mendukung industri perunggasan Indonesia.', 'Digital platform for monitoring prices, managing farms, and supporting Indonesia\'s poultry industry.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" className="font-semibold">
                  {t('Masuk Dashboard', 'Enter Dashboard')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Registration Strip */}
      <section className="bg-primary py-4">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm font-medium text-primary-foreground text-center sm:text-left">
            {t('Daftar sekarang untuk mendapatkan informasi komprehensif mengenai suplai unggas Indonesia', 'Register now to get comprehensive information on Indonesian poultry supply')}
          </p>
          <Link to="/register">
            <Button variant="secondary" size="sm" className="shrink-0 font-semibold">
              {t('Daftar Sekarang', 'Register Now')} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Overview Section */}
      {overview && (
        <section className="py-12 bg-card border-b">
          <div className="container max-w-3xl">
            <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: overview }} />
          </div>
        </section>
      )}

      {/* PINSAR in Numbers */}
      <section className="py-16 bg-card border-b">
        <div className="container">
          <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2">{t('PINSAR dalam Angka', 'PINSAR in Numbers')}</h2>
          <p className="text-muted-foreground text-center mb-10">{t('Data terkini dari seluruh jaringan PINSAR Indonesia', 'Latest data from the PINSAR Indonesia network')}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Calendar, value: animYears, label: t('Tahun Aktif', 'Years Active') },
              { icon: MapPin, value: animRegions, label: t('Wilayah', 'Regions') },
              { icon: Users, value: animMembers, label: t('Anggota', 'Members') },
              { icon: Award, value: animPengurus, label: t('Pengurus', 'Board Members') },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
                <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="font-display text-4xl font-extrabold text-primary">{item.value}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Berita Section */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">{t('Berita & Kegiatan', 'News & Activities')}</h2>
            <Link to="/berita" className="text-sm font-medium text-primary hover:underline">{t('Lihat Semua →', 'View All →')}</Link>
          </div>
          {blogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('Belum ada berita.', 'No news yet.')}</p>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.slice(0, 5).map((item) => (
                <Link key={item.id} to={`/berita/${item.id}`} className="group">
                  <article className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden min-w-0">
                    <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                      {item.images && item.images[0] ? (
                        <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                      ) : (<BarChart3 className="h-8 w-8 text-primary/30" />)}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={item.blog_type === 'news' ? 'default' : 'secondary'} className="text-[10px]">
                          {item.blog_type === 'news' ? t('Berita', 'News') : t('Kegiatan', 'Activity')}
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

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <section className="py-16 bg-card border-b">
          <div className="container">
            <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">{t('Galeri', 'Gallery')}</h2>
            <div className="relative max-w-3xl mx-auto">
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={gallery[galleryIdx]?.image_url} alt={gallery[galleryIdx]?.title || 'Gallery'} className="h-full w-full object-cover" />
              </div>
              {gallery[galleryIdx]?.title && (
                <p className="text-center text-sm text-muted-foreground mt-3">{gallery[galleryIdx].title}</p>
              )}
              {gallery.length > 1 && (
                <>
                  <button onClick={() => setGalleryIdx(i => (i - 1 + gallery.length) % gallery.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setGalleryIdx(i => (i + 1) % gallery.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="flex justify-center gap-2 mt-4">
                    {gallery.map((_, i) => (
                      <button key={i} onClick={() => setGalleryIdx(i)} className={`h-2 w-2 rounded-full transition-colors ${i === galleryIdx ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Partners Section */}
      {partners.length > 0 && (
        <section className="py-16">
          <div className="container">
            <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">{t('Anggota', 'Members')}</h2>
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
