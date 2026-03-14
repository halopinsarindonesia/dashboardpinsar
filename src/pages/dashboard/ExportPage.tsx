export default function ExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Ekspor Data</h1>
        <p className="text-sm text-muted-foreground">Unduh data dalam format Excel atau CSV</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'Data Pengguna', desc: 'Ekspor daftar semua pengguna terdaftar' },
          { label: 'Data Suplai Ayam', desc: 'Ekspor data suplai dengan filter aktif' },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <h3 className="font-display text-base font-semibold text-foreground">{item.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Excel</button>
              <button className="rounded-md border px-3 py-1.5 text-xs font-medium text-foreground">CSV</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
