import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceData {
  label: string;
  todayPrice: number | null;
  avgPrice: number | null;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

const mockPrices: PriceData[] = [
  { label: 'Ayam Potong', todayPrice: 19500, avgPrice: 19200, unit: 'Rp/kg', trend: 'up' },
  { label: 'Telur Ayam', todayPrice: 28000, avgPrice: 27500, unit: 'Rp/kg', trend: 'down' },
  { label: 'Unggas Lainnya', todayPrice: 35000, avgPrice: 34800, unit: 'Rp/kg', trend: 'stable' },
];

function formatPrice(price: number | null): string {
  if (price === null) return 'Belum Ada Data';
  return new Intl.NumberFormat('id-ID').format(price);
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function PriceTicker() {
  return (
    <div className="overflow-hidden bg-primary text-primary-foreground">
      <div className="container flex items-center gap-8 py-2 overflow-x-auto">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
          Harga Hari Ini
        </span>
        {mockPrices.map((p) => (
          <div key={p.label} className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-medium">{p.label}</span>
            <span className="font-display text-sm font-bold">
              {formatPrice(p.todayPrice)} {p.unit}
            </span>
            <TrendIcon trend={p.trend} />
            <span className="text-xs text-primary-foreground/60">
              Rata-rata: {formatPrice(p.avgPrice)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
