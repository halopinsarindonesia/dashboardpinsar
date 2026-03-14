export default function PricesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Agregasi Harga</h1>
        <p className="text-sm text-muted-foreground">Harga rata-rata per wilayah dan nasional</p>
      </div>
      <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
        <p className="text-muted-foreground">Grafik harga akan ditampilkan di sini</p>
      </div>
    </div>
  );
}
