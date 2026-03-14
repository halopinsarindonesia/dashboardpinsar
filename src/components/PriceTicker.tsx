import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ALL_PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 'Sumatera Selatan',
  'Bengkulu', 'Lampung', 'Kep. Bangka Belitung', 'Kep. Riau', 'DKI Jakarta',
  'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten',
  'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
  'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat',
  'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
];

interface ProvPrice { province: string; broiler: string; egg: string; }

function formatP(val: number | null): string {
  if (!val || val === 0) return '-';
  return `Rp${new Intl.NumberFormat('id-ID').format(Math.round(val))}`;
}

export default function PriceTicker() {
  const [prices, setPrices] = useState<ProvPrice[]>([]);

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: records } = await supabase
      .from('supply_records')
      .select('broiler_price_per_kg, layer_egg_price_per_kg, farm_id')
      .gte('record_date', startOfMonth);

    const { data: farms } = await supabase
      .from('farms')
      .select('id, province');

    const farmProv = new Map<string, string>();
    (farms ?? []).forEach(f => farmProv.set(f.id, f.province));

    const agg = new Map<string, { bS: number; bC: number; eS: number; eC: number }>();
    (records ?? []).forEach(r => {
      const p = farmProv.get(r.farm_id);
      if (!p) return;
      if (!agg.has(p)) agg.set(p, { bS: 0, bC: 0, eS: 0, eC: 0 });
      const a = agg.get(p)!;
      if (r.broiler_price_per_kg && Number(r.broiler_price_per_kg) > 0) { a.bS += Number(r.broiler_price_per_kg); a.bC++; }
      if (r.layer_egg_price_per_kg && Number(r.layer_egg_price_per_kg) > 0) { a.eS += Number(r.layer_egg_price_per_kg); a.eC++; }
    });

    const result: ProvPrice[] = ALL_PROVINCES.map(prov => {
      const a = agg.get(prov);
      return {
        province: prov,
        broiler: formatP(a && a.bC > 0 ? a.bS / a.bC : null),
        egg: formatP(a && a.eC > 0 ? a.eS / a.eC : null),
      };
    });

    setPrices(result);
  }

  if (prices.length === 0) return null;

  // Duplicate for seamless scroll
  const items = [...prices, ...prices];

  return (
    <div className="overflow-hidden bg-primary text-primary-foreground">
      <div className="flex animate-[ticker-scroll_120s_linear_infinite] whitespace-nowrap py-2">
        {items.map((p, i) => (
          <div key={`${p.province}-${i}`} className="flex shrink-0 items-center gap-2 px-4 border-r border-primary-foreground/20 last:border-0">
            <span className="text-xs font-semibold">{p.province}</span>
            <span className="text-xs">Ayam: {p.broiler}</span>
            <span className="text-xs">Telur: {p.egg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
