export default function CMSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">CMS</h1>
        <p className="text-sm text-muted-foreground">Kelola konten landing page</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['Banner', 'Tentang Kami', 'Kontak', 'Media Sosial', 'Blog / Berita'].map((item) => (
          <div key={item} className="stat-card cursor-pointer hover:border-primary/30 transition-colors">
            <h3 className="font-display text-base font-semibold text-foreground">{item}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Kelola konten {item.toLowerCase()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
