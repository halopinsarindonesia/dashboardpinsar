export default function MapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Peta Peternakan</h1>
        <p className="text-sm text-muted-foreground">Visualisasi distribusi peternakan di Indonesia</p>
      </div>
      <div className="flex h-[500px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-muted-foreground">Peta Interaktif Indonesia</p>
          <p className="mt-1 text-sm text-muted-foreground">Peta akan menampilkan marker untuk setiap peternakan</p>
        </div>
      </div>
    </div>
  );
}
