import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, MessageSquare } from 'lucide-react';

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

interface ProvincePrice {
  province: string;
  avgBroiler: number | null;
  avgEgg: number | null;
}

function formatPrice(val: number | null): string {
  if (val === null || val === 0) return '-';
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(val))}`;
}

export default function HargaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProvincePrice[]>([]);

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    setLoading(true);
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Get MTD supply records aggregated by province through farms
    const { data: records } = await supabase
      .from('supply_records')
      .select('broiler_price_per_kg, layer_egg_price_per_kg, farm_id, record_date')
      .gte('record_date', startOfMonth);

    // Get farm provinces
    const { data: farms } = await supabase
      .from('farms')
      .select('id, province');

    const farmProvinceMap = new Map<string, string>();
    (farms ?? []).forEach(f => farmProvinceMap.set(f.id, f.province));

    // Aggregate per province
    const provinceAgg = new Map<string, { broilerSum: number; broilerCount: number; eggSum: number; eggCount: number }>();

    (records ?? []).forEach(r => {
      const prov = farmProvinceMap.get(r.farm_id);
      if (!prov) return;
      if (!provinceAgg.has(prov)) provinceAgg.set(prov, { broilerSum: 0, broilerCount: 0, eggSum: 0, eggCount: 0 });
      const agg = provinceAgg.get(prov)!;
      if (r.broiler_price_per_kg && r.broiler_price_per_kg > 0) {
        agg.broilerSum += Number(r.broiler_price_per_kg);
        agg.broilerCount++;
      }
      if (r.layer_egg_price_per_kg && r.layer_egg_price_per_kg > 0) {
        agg.eggSum += Number(r.layer_egg_price_per_kg);
        agg.eggCount++;
      }
    });

    const result: ProvincePrice[] = ALL_PROVINCES.map(p => {
      const agg = provinceAgg.get(p);
      return {
        province: p,
        avgBroiler: agg && agg.broilerCount > 0 ? agg.broilerSum / agg.broilerCount : null,
        avgEgg: agg && agg.eggCount > 0 ? agg.eggSum / agg.eggCount : null,
      };
    });

    setData(result);
    setLoading(false);
  }

  function downloadCSV() {
    const header = 'Provinsi,Rata-rata Ayam (Rp/kg),Rata-rata Telur (Rp/kg)\n';
    const rows = data.map(d =>
      `"${d.province}",${d.avgBroiler ? Math.round(d.avgBroiler) : ''},${d.avgEgg ? Math.round(d.avgEgg) : ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harga-provinsi-mtd-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Harga Per Provinsi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Data rata-rata harga bulan berjalan (MTD) berdasarkan input peternakan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV} disabled={loading}>
            <Download className="mr-2 h-4 w-4" /> Unduh CSV
          </Button>
          <Link to="/kontak">
            <Button variant="secondary">
              <MessageSquare className="mr-2 h-4 w-4" /> Minta Data Lainnya
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Ayam Potong */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Ayam Potong (per kg)</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.map(d => (
                <Card key={`broiler-${d.province}`} className="border">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{d.province}</p>
                    <p className="mt-1 font-display text-lg font-bold text-foreground">
                      {formatPrice(d.avgBroiler)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Telur Ayam */}
          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Telur Ayam (per kg)</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.map(d => (
                <Card key={`egg-${d.province}`} className="border">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{d.province}</p>
                    <p className="mt-1 font-display text-lg font-bold text-foreground">
                      {formatPrice(d.avgEgg)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
