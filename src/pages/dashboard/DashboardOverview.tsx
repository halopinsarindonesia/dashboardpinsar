import { useState, useEffect, useCallback } from 'react';
import { Warehouse, TrendingUp, Users, AlertCircle, CheckCircle, ClipboardList, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

function getDateRange(filter: string, cs?: string, ce?: string) {
  const t = new Date();
  const dow = t.getDay();
  const mo = dow === 0 ? 6 : dow - 1;
  switch (filter) {
    case 'wtd': { const m = new Date(t); m.setDate(t.getDate() - mo); return { start: fmt(m), end: fmt(t) }; }
    case 'last_week': { const m = new Date(t); m.setDate(t.getDate() - mo - 7); const s = new Date(m); s.setDate(m.getDate() + 6); return { start: fmt(m), end: fmt(s) }; }
    case 'mtd': return { start: fmt(new Date(t.getFullYear(), t.getMonth(), 1)), end: fmt(t) };
    case 'last_month': return { start: fmt(new Date(t.getFullYear(), t.getMonth() - 1, 1)), end: fmt(new Date(t.getFullYear(), t.getMonth(), 0)) };
    case 'ytd': return { start: fmt(new Date(t.getFullYear(), 0, 1)), end: fmt(t) };
    case 'custom': return { start: cs || fmt(t), end: ce || fmt(t) };
    default: return { start: fmt(t), end: fmt(t) };
  }
}

const FILTER_LABELS: Record<string, string> = {
  wtd: 'Minggu Ini (WTD)', last_week: 'Minggu Lalu', mtd: 'Bulan Ini (MTD)',
  last_month: 'Bulan Lalu', ytd: 'Tahun Ini (YTD)', custom: 'Custom',
};

interface Stats {
  activeFarms: number;
  totalChickens: number;
  avgPrice: number;
  totalPeternak: number;
  submittedToday: number;
  totalActive: number;
}

interface PricePoint {
  date: string;
  broiler: number | null;
  egg: number | null;
}

export default function DashboardOverview() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState('wtd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ activeFarms: 0, totalChickens: 0, avgPrice: 0, totalPeternak: 0, submittedToday: 0, totalActive: 0 });
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [broilerStats, setBroilerStats] = useState({ price: 0, avgPrice: 0, population: 0, sold: 0, activeFarms: 0, inactive: 0 });
  const [layerStats, setLayerStats] = useState({ price: 0, avgPrice: 0, population: 0, eggProd: 0, activeFarms: 0, inactive: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange(filter, customStart, customEnd);
    const today = fmt(new Date());

    const [farmsRes, peternakRes, supplyRes, todayRes, allFarmsRes] = await Promise.all([
      supabase.from('farms').select('id, farm_type, status', { count: 'exact' }).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'peternak').eq('status', 'approved'),
      supabase.from('supply_records').select('record_date, broiler_population, broiler_price_per_kg, broiler_sold, broiler_death, layer_population, layer_egg_price_per_kg, layer_egg_production, layer_death, farm_id').gte('record_date', start).lte('record_date', end),
      supabase.from('supply_records').select('farm_id').eq('record_date', today),
      supabase.from('farms').select('id, farm_type, status', { count: 'exact' }),
    ]);

    const activeFarms = farmsRes.count ?? 0;
    const totalPeternak = peternakRes.count ?? 0;
    const records = supplyRes.data ?? [];
    const todayFarms = new Set((todayRes.data ?? []).map((r: any) => r.farm_id));
    const allFarms = allFarmsRes.data ?? [];

    // Calculate stats from records
    let totalPop = 0, totalBroilerPrice = 0, broilerPriceCount = 0;
    let totalBroilerPop = 0, totalBroilerSold = 0, totalLayerPop = 0, totalEggProd = 0;
    let totalEggPrice = 0, eggPriceCount = 0;
    const dailyPrices: Record<string, { broilerPrices: number[]; eggPrices: number[] }> = {};

    records.forEach((r: any) => {
      totalPop += (r.broiler_population ?? 0) + (r.layer_population ?? 0);
      if (r.broiler_price_per_kg) { totalBroilerPrice += r.broiler_price_per_kg; broilerPriceCount++; }
      if (r.layer_egg_price_per_kg) { totalEggPrice += r.layer_egg_price_per_kg; eggPriceCount++; }
      totalBroilerPop += r.broiler_population ?? 0;
      totalBroilerSold += r.broiler_sold ?? 0;
      totalLayerPop += r.layer_population ?? 0;
      totalEggProd += r.layer_egg_production ?? 0;

      if (!dailyPrices[r.record_date]) dailyPrices[r.record_date] = { broilerPrices: [], eggPrices: [] };
      if (r.broiler_price_per_kg) dailyPrices[r.record_date].broilerPrices.push(r.broiler_price_per_kg);
      if (r.layer_egg_price_per_kg) dailyPrices[r.record_date].eggPrices.push(r.layer_egg_price_per_kg);
    });

    const avgBroiler = broilerPriceCount > 0 ? Math.round(totalBroilerPrice / broilerPriceCount) : 0;
    const avgEgg = eggPriceCount > 0 ? Math.round(totalEggPrice / eggPriceCount) : 0;

    const broilerFarms = allFarms.filter((f: any) => ['broiler', 'mixed', 'other_cut', 'other_mixed'].includes(f.farm_type));
    const layerFarms = allFarms.filter((f: any) => ['layer', 'mixed', 'other_egg', 'other_mixed'].includes(f.farm_type));

    setStats({
      activeFarms,
      totalChickens: totalPop,
      avgPrice: avgBroiler,
      totalPeternak,
      submittedToday: todayFarms.size,
      totalActive: activeFarms,
    });

    setBroilerStats({
      price: avgBroiler,
      avgPrice: avgBroiler,
      population: totalBroilerPop,
      sold: totalBroilerSold,
      activeFarms: broilerFarms.filter((f: any) => f.status === 'active').length,
      inactive: broilerFarms.filter((f: any) => f.status !== 'active').length,
    });

    setLayerStats({
      price: avgEgg,
      avgPrice: avgEgg,
      population: totalLayerPop,
      eggProd: totalEggProd,
      activeFarms: layerFarms.filter((f: any) => f.status === 'active').length,
      inactive: layerFarms.filter((f: any) => f.status !== 'active').length,
    });

    const chartData = Object.entries(dailyPrices)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        broiler: v.broilerPrices.length > 0 ? Math.round(v.broilerPrices.reduce((a, b) => a + b, 0) / v.broilerPrices.length) : null,
        egg: v.eggPrices.length > 0 ? Math.round(v.eggPrices.reduce((a, b) => a + b, 0) / v.eggPrices.length) : null,
      }));
    setPriceData(chartData);
    setLoading(false);
  }, [filter, customStart, customEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  if (profile?.role === 'peternak') return <Navigate to="/dashboard/farms" replace />;

  const fmtNum = (n: number) => n.toLocaleString('id-ID');
  const fmtPrice = (n: number) => n > 0 ? `Rp ${fmtNum(n)}` : '-';

  const generalStats = [
    { label: 'Total Peternakan Aktif', value: fmtNum(stats.activeFarms), icon: Warehouse, color: 'text-primary' },
    { label: 'Total Ayam Tersedia', value: fmtNum(stats.totalChickens), icon: ClipboardList, color: 'text-secondary' },
    { label: 'Rata-rata Harga Ayam', value: fmtPrice(stats.avgPrice), icon: TrendingUp, color: 'text-accent' },
    { label: 'Total Peternak', value: fmtNum(stats.totalPeternak), icon: Users, color: 'text-primary' },
  ];

  const submissionStats = [
    { label: 'Sudah Submit Hari Ini', value: fmtNum(stats.submittedToday), icon: CheckCircle, color: 'text-success' },
    { label: 'Belum Submit', value: fmtNum(Math.max(0, stats.totalActive - stats.submittedToday)), icon: AlertCircle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan data perunggasan nasional</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FILTER_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filter === 'custom' && (
        <div className="flex gap-3">
          <div><Label>Dari</Label><Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} /></div>
          <div><Label>Sampai</Label><Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {generalStats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Status Input Panen Hari Ini</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {submissionStats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="font-display text-3xl font-bold text-foreground leading-none">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Price Chart */}
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Grafik Harga</CardTitle></CardHeader>
            <CardContent>
              {priceData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Belum ada data harga pada periode ini.</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 88%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(0 0% 40%)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(0 0% 40%)" tickFormatter={(v) => `Rp ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `Rp ${v.toLocaleString('id-ID')}`} />
                      <Legend />
                      <Line type="monotone" dataKey="broiler" name="Ayam Potong" stroke="hsl(0 78% 42%)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="egg" name="Telur" stroke="hsl(38 92% 50%)" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Statistik Ayam Potong</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Harga Rata-rata', value: fmtPrice(broilerStats.avgPrice) + '/kg' },
                    { label: 'Populasi Tersedia', value: fmtNum(broilerStats.population) },
                    { label: 'Terjual (Periode)', value: fmtNum(broilerStats.sold) },
                    { label: 'Peternakan Aktif', value: fmtNum(broilerStats.activeFarms) },
                    { label: 'Tidak Aktif', value: fmtNum(broilerStats.inactive) },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-display text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Statistik Telur Ayam</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Harga Rata-rata', value: fmtPrice(layerStats.avgPrice) + '/kg' },
                    { label: 'Populasi Petelur', value: fmtNum(layerStats.population) },
                    { label: 'Produksi Telur (Periode)', value: fmtNum(layerStats.eggProd) },
                    { label: 'Peternakan Aktif', value: fmtNum(layerStats.activeFarms) },
                    { label: 'Tidak Aktif', value: fmtNum(layerStats.inactive) },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-display text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
