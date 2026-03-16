import { useState, useEffect, useCallback } from 'react';
import { Warehouse, Users, AlertCircle, CheckCircle, ClipboardList, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', ayam_kampung: 'Ayam Kampung',
  ayam_pejantan: 'Ayam Pejantan', bebek: 'Bebek', puyuh: 'Puyuh',
};
const FARM_TYPES = Object.keys(FARM_TYPE_LABELS);

const PROVINCES = [
  'Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung',
  'Kep. Bangka Belitung','Kep. Riau','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta',
  'Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat',
  'Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara',
  'Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku',
  'Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya',
];

export default function DashboardOverview() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState('wtd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
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

    // Users count (all roles except superadmin are peternak)
    const [usersRes, farmsRes, todayRes] = await Promise.all([
      supabase.from('profiles').select('id, status, role').neq('role', 'superadmin' as any),
      supabase.from('farms').select('id, farm_type, status, kapasitas_kandang, broiler_initial_population, province, city'),
      supabase.from('supply_records').select('farm_id').eq('record_date', today),
    ]);

    const allUsers = usersRes.data ?? [];
    const approvedUsers = allUsers.filter(u => u.status === 'approved');
    const pendingOrRejected = allUsers.filter(u => u.status !== 'approved');

    setTotalUsers(allUsers.length);
    setActiveUsers(approvedUsers.length);
    setInactiveUsers(pendingOrRejected.length);

    let allFarms = farmsRes.data ?? [];

    // Apply province filter
    if (provinceFilter !== 'all') {
      allFarms = allFarms.filter((f: any) => f.province === provinceFilter);
    }

    // Farm breakdown
    const active: Record<string, number> = {};
    const prapasca: Record<string, number> = {};
    const inactive: Record<string, number> = {};
    const capByType: Record<string, number> = {};
    let totalCap = 0;
    let totalActive = 0;
    let totalPrapasca = 0;
    let totalInactive = 0;

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

    // Population: initial pop - sold - death + input (from supply records)
    // Simplified: use initial pop for now per farm, adjust with supply
    const popByType: Record<string, number> = {};
    FARM_TYPES.forEach(t => { popByType[t] = 0; });

    // Get supply aggregates for active farms
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
  }, [filter, customStart, customEnd, provinceFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmtNum = (n: number) => n.toLocaleString('id-ID');

  return (
    <div className="space-y-8">
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
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Provinsi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Provinsi</SelectItem>
              {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
          {/* Peternak Stats */}
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Peternak</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Peternak</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent><div className="font-display text-2xl font-bold text-foreground">{fmtNum(totalUsers)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Peternak Aktif</CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent><div className="font-display text-2xl font-bold text-foreground">{fmtNum(activeUsers)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Peternak Tidak Aktif</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent><div className="font-display text-2xl font-bold text-foreground">{fmtNum(inactiveUsers)}</div></CardContent>
              </Card>
            </div>
          </div>

          {/* Peternakan Stats */}
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Peternakan ({fmtNum(farmStats.total)} total)</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Active */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Aktif ({fmtNum(farmStats.totalActive)})</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {FARM_TYPES.map(t => (
                    <div key={t} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{FARM_TYPE_LABELS[t]}</span>
                      <span className="font-medium text-foreground">{fmtNum(farmStats.active[t] || 0)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {/* Pra/Pasca */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pra/Pasca ({fmtNum(farmStats.totalPrapasca)})</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {FARM_TYPES.map(t => (
                    <div key={t} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{FARM_TYPE_LABELS[t]}</span>
                      <span className="font-medium text-foreground">{fmtNum(farmStats.prapasca[t] || 0)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {/* Inactive */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tidak Aktif ({fmtNum(farmStats.totalInactive)})</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {FARM_TYPES.map(t => (
                    <div key={t} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{FARM_TYPE_LABELS[t]}</span>
                      <span className="font-medium text-foreground">{fmtNum(farmStats.inactive[t] || 0)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {/* Capacity & Population */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Kapasitas & Populasi</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Kapasitas: {fmtNum(capacityStats.total)}</p>
                    {FARM_TYPES.map(t => (
                      <div key={t} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{FARM_TYPE_LABELS[t]}</span>
                        <span>{fmtNum(capacityStats.byType[t] || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-xs font-medium text-foreground mb-1">Populasi: {fmtNum(populationStats.total)}</p>
                    {FARM_TYPES.map(t => (
                      <div key={t} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{FARM_TYPE_LABELS[t]}</span>
                        <span>{fmtNum(populationStats.byType[t] || 0)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Status Input Hari Ini */}
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Status Input Panen Hari Ini</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Sudah Submit</CardTitle>
                  <CheckCircle className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent><div className="font-display text-3xl font-bold text-foreground leading-none">{fmtNum(submittedToday)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Belum Submit</CardTitle>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent><div className="font-display text-3xl font-bold text-foreground leading-none">{fmtNum(Math.max(0, totalActiveFarms - submittedToday))}</div></CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
