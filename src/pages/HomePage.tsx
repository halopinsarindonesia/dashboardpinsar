import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Warehouse, BarChart3, Shield } from 'lucide-react';

const stats = [
  { label: 'Ayam Potong', price: 'Rp 19.500/kg', change: '+2.3%', positive: true },
  { label: 'Telur Ayam', price: 'Rp 28.000/kg', change: '-1.1%', positive: false },
  { label: 'Unggas Lainnya', price: 'Rp 35.000/kg', change: '+0.5%', positive: true },
];

const features = [
  {
    icon: Warehouse,
    title: 'Manajemen Peternakan',
    description: 'Kelola data peternakan di seluruh Indonesia dengan sistem terstruktur.',
  },
  {
    icon: BarChart3,
    title: 'Harga Terkini',
    description: 'Pantau harga ayam dan telur secara real-time dari seluruh daerah.',
  },
  {
    icon: Shield,
    title: 'Data Terverifikasi',
    description: 'Semua data melalui proses verifikasi untuk menjamin akurasi.',
  },
];

const mockNews = [
  {
    id: 1,
    title: 'Harga Ayam Stabil di Kuartal Pertama 2026',
    date: '12 Mar 2026',
    excerpt: 'Berdasarkan data agregasi nasional, harga ayam potong menunjukkan stabilitas...',
  },
  {
    id: 2,
    title: 'PINSAR Gelar Pelatihan Manajemen Peternakan',
    date: '10 Mar 2026',
    excerpt: 'Pelatihan ini diikuti oleh 200 peternak dari berbagai provinsi...',
  },
  {
    id: 3,
    title: 'Produksi Telur Nasional Meningkat 15%',
    date: '8 Mar 2026',
    excerpt: 'Data menunjukkan peningkatan produksi telur nasional dibandingkan tahun lalu...',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(164_90%_28%/0.4),transparent_60%)]" />
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl">
              Perhimpunan Insan Perunggasan Rakyat Indonesia
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Platform digital untuk memantau harga, mengelola peternakan, dan mendukung industri perunggasan Indonesia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" variant="secondary" className="font-semibold">
                  Masuk Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/tentang">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 font-semibold text-primary-foreground hover:bg-primary-foreground/10">
                  Pelajari Lebih Lanjut
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Price Stats */}
      <section className="border-b bg-card py-10">
        <div className="container">
          <h2 className="mb-6 text-center font-display text-xl font-bold text-foreground">Harga Nasional Hari Ini</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="stat-card text-center">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">{s.price}</p>
                <p className={`mt-1 text-sm font-medium ${s.positive ? 'text-success' : 'text-destructive'}`}>
                  {s.change} dari kemarin
                </p>
              </div>
            ))}
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

      {/* Latest News */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">Berita Terbaru</h2>
            <Link to="/berita" className="text-sm font-medium text-primary hover:underline">
              Lihat Semua →
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {mockNews.map((news) => (
              <article key={news.id} className="stat-card">
                <div className="mb-3 h-32 rounded-lg bg-muted" />
                <p className="text-xs text-muted-foreground">{news.date}</p>
                <h3 className="mt-1 font-display text-base font-semibold text-foreground">{news.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{news.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
