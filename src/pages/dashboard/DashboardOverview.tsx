import { useState, useEffect, useCallback } from 'react';
import { Warehouse, Users, ClipboardList, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIndonesiaRegions } from '@/hooks/use-indonesia-regions';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', mixed: 'Ayam Kampung',
  other_cut: 'Ayam Pejantan', other_egg: 'Bebek', other_mixed: 'Puyuh',
};
const FARM_TYPES = Object.keys(FARM_TYPE_LABELS);

// ── Reusable status-row component ──────────────────────────────────
interface StatusRowProps {
  label: string;
  total: number;
  byType: Record<string, number>;
  colorClass: string; // tailwind bg class for the main badge
  lightClass: string; // tailwind bg class for the type badges
  borderClass: string;
}

function StatusRow({ label, total, byType, colorClass, lightClass, borderClass }: StatusRowProps) {
  const fmtNum = (n: number) => n.toLocaleString('id-ID');
  return (
    <div className="grid grid-cols-[minmax(120px,1fr)_repeat(6,1fr)] gap-2">
      <div className={`rounded-lg border-2 ${borderClass} ${colorClass} p-3 flex flex-col justify-center`}>
        <span className="text-sm font-bold">{label}</span>
        <span className="text-lg font-bold">{fmtNum(total)}</span>
      </div>
      {FARM_TYPES.map(t => (
        <div key={t} className={`rounded-lg border ${borderClass} ${lightClass} p-3 flex flex-col justify-center`}>
          <span className="text-xs font-semibold text-foreground">{FARM_TYPE_LABELS[t]}</span>
          <span className="text-base font-bold text-foreground">{fmtNum(byType[t] || 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { profile } = useAuth();
  const { provinces: regionProvinces, cities: regionCities, fetchCities } = useIndonesiaRegions();
  const [filter, setFilter] = useState('wtd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0);
  const [farmStats, setFarmStats] = useState<{ total: number; active: Record<string, number>; prapasca: Record<string, number>; inactive: Record<string, number>; totalActive: number; totalPrapasca: number; totalInactive: number }>({
    total: 0, active: {}, prapasca: {}, inactive: {}, totalActive: 0, totalPrapasca: 0, totalInactive: 0,
  });
  const [capacityStats, setCapacityStats] = useState<{ total: number; byType: Record<string, number> }>({ total: 0, byType: {} });
  const [populationStats, setPopulationStats] = useState<{ total: number; byType: Record<string, number> }>({ total: 0, byType: {} });
  const [submittedToday, setSubmittedToday] = useState(0);
  const [totalActiveFarms, setTotalActiveFarms] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const today = fmt(new Date());

    await supabase.rpc('auto_inactivate_farms' as any);

    const [usersRes, farmsRes, todayRes] = await Promise.all([
      supabase.from('profiles').select('id, status, role').neq('role', 'superadmin' as any),
      supabase.from('farms').select('id, farm_type, status, kapasitas_kandang, broiler_initial_population, province, city, owner_id'),
      supabase.from('supply_records').select('farm_id').eq('record_date', today),
    ]);

    const allUsers = usersRes.data ?? [];
    const approvedUsers = allUsers.filter(u => u.status === 'approved');
    const pendingOrRejected = allUsers.filter(u => u.status !== 'approved');

    setTotalUsers(allUsers.length);
    setActiveUsers(approvedUsers.length);
    setInactiveUsers(pendingOrRejected.length);

    let allFarms = farmsRes.data ?? [];
    if (provinceFilter !== 'all') allFarms = allFarms.filter((f: any) => f.province === provinceFilter);
    if (cityFilter !== 'all') allFarms = allFarms.filter((f: any) => f.city === cityFilter);

    const active: Record<string, number> = {};
    const prapasca: Record<string, number> = {};
    const inactive: Record<string, number> = {};
    const capByType: Record<string, number> = {};
    let totalCap = 0, totalActive = 0, totalPrapasca = 0, totalInactive = 0;

    FARM_TYPES.forEach(t => { active[t] = 0; prapasca[t] = 0; inactive[t] = 0; capByType[t] = 0; });

    allFarms.forEach((f: any) => {
      const ft = f.farm_type;
      if (f.status === 'active') { active[ft] = (active[ft] || 0) + 1; totalActive++; }
      else if (f.status === 'prapasca') { prapasca[ft] = (prapasca[ft] || 0) + 1; totalPrapasca++; }
      else { inactive[ft] = (inactive[ft] || 0) + 1; totalInactive++; }
      const cap = f.kapasitas_kandang ?? 0;
      capByType[ft] = (capByType[ft] || 0) + cap;
      totalCap += cap;
    });

    setFarmStats({ total: allFarms.length, active, prapasca, inactive, totalActive, totalPrapasca, totalInactive });
    setCapacityStats({ total: totalCap, byType: capByType });

    // Population
    const popByType: Record<string, number> = {};
    FARM_TYPES.forEach(t => { popByType[t] = 0; });
    const activeFarmIds = allFarms.filter((f: any) => f.status === 'active').map((f: any) => f.id);

    if (activeFarmIds.length > 0) {
      const { data: supplyData } = await supabase.from('supply_records')
        .select('farm_id, broiler_input, broiler_sold, broiler_death')
        .in('farm_id', activeFarmIds);

      const supplyByFarm: Record<string, { input: number; sold: number; death: number }> = {};
      (supplyData ?? []).forEach((s: any) => {
        if (!supplyByFarm[s.farm_id]) supplyByFarm[s.farm_id] = { input: 0, sold: 0, death: 0 };
        supplyByFarm[s.farm_id].input += s.broiler_input ?? 0;
        supplyByFarm[s.farm_id].sold += s.broiler_sold ?? 0;
        supplyByFarm[s.farm_id].death += s.broiler_death ?? 0;
      });

      let totalPop = 0;
      allFarms.filter((f: any) => f.status === 'active').forEach((f: any) => {
        const initial = f.broiler_initial_population ?? 0;
        const supply = supplyByFarm[f.id] || { input: 0, sold: 0, death: 0 };
        const pop = Math.max(0, initial + supply.input - supply.sold - supply.death);
        popByType[f.farm_type] = (popByType[f.farm_type] || 0) + pop;
        totalPop += pop;
      });
      setPopulationStats({ total: totalPop, byType: popByType });
    } else {
      setPopulationStats({ total: 0, byType: popByType });
    }

    const todayFarms = new Set((todayRes.data ?? []).map((r: any) => r.farm_id));
    setSubmittedToday(todayFarms.size);
    setTotalActiveFarms(totalActive);
    setLoading(false);
  }, [filter, customStart, customEnd, provinceFilter, cityFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmtNum = (n: number) => n.toLocaleString('id-ID');

  // Chart data
  const capPopChartData = FARM_TYPES.map(t => ({
    name: FARM_TYPE_LABELS[t],
    Kapasitas: capacityStats.byType[t] || 0,
    Populasi: populationStats.byType[t] || 0,
  }));

  const statusChartData = FARM_TYPES.map(t => ({
    name: FARM_TYPE_LABELS[t],
    Aktif: farmStats.active[t] || 0,
    'Pra/Pasca': farmStats.prapasca[t] || 0,
    'Tidak Aktif': farmStats.inactive[t] || 0,
  }));

  return (
    <div className="space-y-8">
      {/* Header + filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan data perunggasan</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FILTER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={provinceFilter} onValueChange={(val) => {
            setProvinceFilter(val);
            setCityFilter('all');
            if (val !== 'all') {
              const prov = regionProvinces.find(p => p.name === val);
              if (prov) fetchCities(prov.id);
            }
          }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Provinsi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Provinsi</SelectItem>
              {regionProvinces.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {provinceFilter !== 'all' && (
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Kota" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kota</SelectItem>
                {regionCities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
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
          {/* Top row: Peternak + Status Input */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold">Peternak</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-0 pt-0">
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">Total Peternak</span>
                    <span className="font-display text-lg font-bold text-foreground">{fmtNum(totalUsers)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm text-muted-foreground">Aktif (Approved)</span>
                    </div>
                    <span className="font-display text-lg font-bold text-foreground">{fmtNum(activeUsers)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-sm text-muted-foreground">Tidak Aktif</span>
                    </div>
                    <span className="font-display text-lg font-bold text-foreground">{fmtNum(inactiveUsers)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold">Status Input Hari Ini</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-0 pt-0">
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">Total Farm Aktif</span>
                    <span className="font-display text-lg font-bold text-foreground">{fmtNum(totalActiveFarms)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm text-muted-foreground">Sudah Submit</span>
                    </div>
                    <span className="font-display text-lg font-bold text-foreground">{fmtNum(submittedToday)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-sm text-muted-foreground">Belum Submit</span>
                    </div>
                    <span className="font-display text-lg font-bold text-foreground">{fmtNum(Math.max(0, totalActiveFarms - submittedToday))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Kapasitas vs Populasi Graph ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">Grafik Kapasitas vs Populasi</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={capPopChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('id-ID')} />
                  <Legend />
                  <Line type="monotone" dataKey="Kapasitas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Populasi" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ── Kapasitas vs Populasi Data ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">Kapasitas & Populasi</CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{fmtNum(farmStats.total)} total farm</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Kapasitas row */}
              <StatusRow
                label="Kapasitas"
                total={capacityStats.total}
                byType={capacityStats.byType}
                colorClass="bg-[hsl(var(--primary))] text-primary-foreground"
                lightClass="bg-[hsl(var(--primary)/0.15)]"
                borderClass="border-[hsl(var(--primary)/0.4)]"
              />
              {/* Populasi row */}
              <StatusRow
                label="Populasi"
                total={populationStats.total}
                byType={populationStats.byType}
                colorClass="bg-[hsl(var(--success))] text-success-foreground"
                lightClass="bg-[hsl(var(--success)/0.15)]"
                borderClass="border-[hsl(var(--success)/0.4)]"
              />
            </CardContent>
          </Card>

          {/* ── Status Peternakan Graph ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">Grafik Status Peternakan</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('id-ID')} />
                  <Legend />
                  <Line type="monotone" dataKey="Aktif" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Pra/Pasca" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Tidak Aktif" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ── Status Peternakan Data ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">Status Peternakan</CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{fmtNum(farmStats.total)} total</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusRow
                label="Aktif"
                total={farmStats.totalActive}
                byType={farmStats.active}
                colorClass="bg-[hsl(var(--success))] text-success-foreground"
                lightClass="bg-[hsl(var(--success)/0.15)]"
                borderClass="border-[hsl(var(--success)/0.4)]"
              />
              <StatusRow
                label="Pra / Pasca"
                total={farmStats.totalPrapasca}
                byType={farmStats.prapasca}
                colorClass="bg-[hsl(var(--warning))] text-warning-foreground"
                lightClass="bg-[hsl(var(--warning)/0.15)]"
                borderClass="border-[hsl(var(--warning)/0.4)]"
              />
              <StatusRow
                label="Tidak Aktif"
                total={farmStats.totalInactive}
                byType={farmStats.inactive}
                colorClass="bg-[hsl(var(--destructive))] text-destructive-foreground"
                lightClass="bg-[hsl(var(--destructive)/0.15)]"
                borderClass="border-[hsl(var(--destructive)/0.4)]"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
