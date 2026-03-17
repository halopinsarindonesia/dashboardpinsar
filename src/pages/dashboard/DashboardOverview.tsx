import { useState, useEffect, useCallback, useMemo } from 'react';
import { Warehouse, Users, AlertCircle, CheckCircle, ClipboardList, Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIndonesiaRegions } from '@/hooks/use-indonesia-regions';

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
  const [usersByFarmType, setUsersByFarmType] = useState<Record<string, { active: number; inactive: number }>>({});
  const [peternakOpen, setPeternakOpen] = useState(false);
  const [peternakanOpen, setPeternakanOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const today = fmt(new Date());

    // Auto-inactivate farms with no panen for 30 days
    await supabase.rpc('auto_inactivate_farms' as any);

    // Users count (all roles except superadmin are peternak)
    const [usersRes, farmsRes, todayRes, membersRes] = await Promise.all([
      supabase.from('profiles').select('id, status, role').neq('role', 'superadmin' as any),
      supabase.from('farms').select('id, farm_type, status, kapasitas_kandang, broiler_initial_population, province, city, owner_id'),
      supabase.from('supply_records').select('farm_id').eq('record_date', today),
      supabase.from('farm_members').select('user_id, farm_id'),
    ]);

    const allUsers = usersRes.data ?? [];
    const approvedUsers = allUsers.filter(u => u.status === 'approved');
    const pendingOrRejected = allUsers.filter(u => u.status !== 'approved');
    const approvedSet = new Set(approvedUsers.map(u => u.id));

    setTotalUsers(allUsers.length);
    setActiveUsers(approvedUsers.length);
    setInactiveUsers(pendingOrRejected.length);

    let allFarms = farmsRes.data ?? [];

    // Apply province filter
    if (provinceFilter !== 'all') {
      allFarms = allFarms.filter((f: any) => f.province === provinceFilter);
    }
    // Apply city filter
    if (cityFilter !== 'all') {
      allFarms = allFarms.filter((f: any) => f.city === cityFilter);
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

    // Count unique users per farm type
    const farmById = new Map(allFarms.map((f: any) => [f.id, f]));
    const members = membersRes.data ?? [];
    const uByType: Record<string, { activeSet: Set<string>; inactiveSet: Set<string> }> = {};
    FARM_TYPES.forEach(t => { uByType[t] = { activeSet: new Set(), inactiveSet: new Set() }; });
    members.forEach((m: any) => {
      const farm = farmById.get(m.farm_id);
      if (!farm) return;
      const ft = farm.farm_type;
      if (!uByType[ft]) uByType[ft] = { activeSet: new Set(), inactiveSet: new Set() };
      if (approvedSet.has(m.user_id)) {
        uByType[ft].activeSet.add(m.user_id);
      } else {
        uByType[ft].inactiveSet.add(m.user_id);
      }
    });
    const uByTypeResult: Record<string, { active: number; inactive: number }> = {};
    FARM_TYPES.forEach(t => { uByTypeResult[t] = { active: uByType[t].activeSet.size, inactive: uByType[t].inactiveSet.size }; });
    setUsersByFarmType(uByTypeResult);

    setLoading(false);
  }, [filter, customStart, customEnd, provinceFilter, cityFilter]);

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
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Peternak Card */}
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

          {/* Status Input Hari Ini Card */}
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

        {/* Status Peternakan */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Status Peternakan</CardTitle>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{fmtNum(farmStats.total)} total</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">Aktif</span>
                </div>
                <span className="font-display text-lg font-bold text-foreground">{fmtNum(farmStats.totalActive)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  <span className="text-sm text-muted-foreground">Pra / Pasca</span>
                </div>
                <span className="font-display text-lg font-bold text-foreground">{fmtNum(farmStats.totalPrapasca)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="text-sm text-muted-foreground">Tidak Aktif</span>
                </div>
                <span className="font-display text-lg font-bold text-foreground">{fmtNum(farmStats.totalInactive)}</span>
              </div>
            </div>
            <Collapsible open={peternakanOpen} onOpenChange={setPeternakanOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border">
                <span>{peternakanOpen ? 'Sembunyikan' : 'Lihat'} detail per tipe produk</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${peternakanOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 pt-2">
                  {FARM_TYPES.map((t) => {
                    const a = farmStats.active[t] || 0;
                    const p = farmStats.prapasca[t] || 0;
                    const ia = farmStats.inactive[t] || 0;
                    const total = a + p + ia;
                    if (total === 0) return null;
                    return (
                      <div key={t} className="rounded-lg border border-border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{FARM_TYPE_LABELS[t]}</span>
                          <span className="text-xs text-muted-foreground">{fmtNum(total)} farm</span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 text-sm">
                          <div className="flex justify-between sm:flex-col sm:gap-0">
                            <span className="text-xs text-muted-foreground">Aktif</span>
                            <span className="font-medium text-foreground">{fmtNum(a)}</span>
                          </div>
                          <div className="flex justify-between sm:flex-col sm:gap-0">
                            <span className="text-xs text-muted-foreground">Pra/Pasca</span>
                            <span className="font-medium text-foreground">{fmtNum(p)}</span>
                          </div>
                          <div className="flex justify-between sm:flex-col sm:gap-0">
                            <span className="text-xs text-muted-foreground">Tidak Aktif</span>
                            <span className="font-medium text-foreground">{fmtNum(ia)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Kapasitas & Populasi */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Kapasitas & Populasi</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Total Kapasitas Kandang</span>
                <span className="font-display text-lg font-bold text-foreground">{fmtNum(capacityStats.total)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Total Populasi</span>
                <span className="font-display text-lg font-bold text-foreground">{fmtNum(populationStats.total)}</span>
              </div>
            </div>
            <Collapsible open={kapPopOpen} onOpenChange={setKapPopOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border">
                <span>{kapPopOpen ? 'Sembunyikan' : 'Lihat'} detail per tipe produk</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${kapPopOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 pt-2">
                  {FARM_TYPES.map((t) => {
                    const cap = capacityStats.byType[t] || 0;
                    const pop = populationStats.byType[t] || 0;
                    if (cap === 0 && pop === 0) return null;
                    return (
                      <div key={t} className="rounded-lg border border-border p-3">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-foreground">{FARM_TYPE_LABELS[t]}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-sm">
                          <div className="flex justify-between sm:flex-col sm:gap-0">
                            <span className="text-xs text-muted-foreground">Kapasitas</span>
                            <span className="font-medium text-foreground">{fmtNum(cap)}</span>
                          </div>
                          <div className="flex justify-between sm:flex-col sm:gap-0">
                            <span className="text-xs text-muted-foreground">Populasi</span>
                            <span className="font-medium text-foreground">{fmtNum(pop)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}
