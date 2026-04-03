import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { useIndonesiaRegions } from '@/hooks/use-indonesia-regions';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', mixed: 'Ayam Kampung',
  other_cut: 'Ayam Pejantan', other_egg: 'Bebek', other_mixed: 'Puyuh',
};
const FARM_TYPES = Object.keys(FARM_TYPE_LABELS);
const LAYER_TYPES = ['layer', 'other_egg'];
const STATUS_LABELS: Record<string, string> = { active: 'Aktif', prapasca: 'Pra/Pasca', inactive: 'Nonaktif' };

interface Farm {
  id: string; farm_code: string; name: string; province: string; city: string | null;
  district?: string | null; kelurahan?: string | null;
  farm_type: string; status: string; owner_id?: string | null;
  broiler_initial_population?: number; layer_initial_population?: number;
  kapasitas_kandang?: number; created_at?: string;
}
interface UserOption { id: string; full_name: string; }

export default function FarmsPage() {
  const { profile, user, isSuperadmin } = useAuth();
  const { toast } = useToast();
  const regions = useIndonesiaRegions();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [userList, setUserList] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFarm, setEditFarm] = useState<Farm | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Farm | null>(null);
  const [currentPopulations, setCurrentPopulations] = useState<Record<string, number>>({});

  const [ownerId, setOwnerId] = useState('');
  const [name, setName] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityName, setCityName] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [villageId, setVillageId] = useState('');
  const [villageName, setVillageName] = useState('');
  const [farmType, setFarmType] = useState('broiler');
  const [status, setStatus] = useState('active');
  const [kapasitas, setKapasitas] = useState('0');
  const [initialPop, setInitialPop] = useState('0');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    if (isSuperadmin) {
      const { data: users } = await supabase.from('profiles').select('id, full_name').eq('status', 'approved');
      setUserList((users as UserOption[]) ?? []);
    }

    let farmData: Farm[] = [];
    if (isSuperadmin) {
      const { data } = await supabase.from('farms').select('*').order('created_at', { ascending: false });
      farmData = (data as unknown as Farm[]) ?? [];
    } else if (user) {
      const { data: memberFarms } = await supabase.from('farm_members').select('farm_id').eq('user_id', user.id);
      const farmIds = memberFarms?.map((m: any) => m.farm_id) ?? [];
      if (farmIds.length > 0) {
        const { data } = await supabase.from('farms').select('*').in('id', farmIds).order('created_at', { ascending: false });
        farmData = (data as unknown as Farm[]) ?? [];
      }
    }
    setFarms(farmData);

    // Calculate populations - separate logic for layer vs non-layer
    const farmIds = farmData.map(f => f.id);
    if (farmIds.length > 0) {
      const { data: supplyData } = await supabase.from('supply_records')
        .select('farm_id, broiler_input, broiler_sold, broiler_death, layer_input, layer_death, layer_sold')
        .in('farm_id', farmIds);

      const pops: Record<string, number> = {};
      const supplyByFarm: Record<string, any[]> = {};
      (supplyData ?? []).forEach((s: any) => {
        if (!supplyByFarm[s.farm_id]) supplyByFarm[s.farm_id] = [];
        supplyByFarm[s.farm_id].push(s);
      });

      farmData.forEach(f => {
        const recs = supplyByFarm[f.id] || [];
        if (LAYER_TYPES.includes(f.farm_type)) {
          const initial = f.layer_initial_population ?? f.broiler_initial_population ?? 0;
          const totalInput = recs.reduce((s: number, r: any) => s + (r.layer_input ?? 0), 0);
          const totalSold = recs.reduce((s: number, r: any) => s + ((r as any).layer_sold ?? 0), 0);
          const totalDeath = recs.reduce((s: number, r: any) => s + (r.layer_death ?? 0), 0);
          pops[f.id] = Math.max(0, initial + totalInput - totalSold - totalDeath);
        } else {
          const initial = f.broiler_initial_population ?? 0;
          const totalInput = recs.reduce((s: number, r: any) => s + (r.broiler_input ?? 0), 0);
          const totalSold = recs.reduce((s: number, r: any) => s + (r.broiler_sold ?? 0), 0);
          const totalDeath = recs.reduce((s: number, r: any) => s + (r.broiler_death ?? 0), 0);
          pops[f.id] = Math.max(0, initial + totalInput - totalSold - totalDeath);
        }
      });
      setCurrentPopulations(pops);

      // Auto-correct layer farm statuses based on population
      for (const f of farmData) {
        if (LAYER_TYPES.includes(f.farm_type)) {
          const pop = pops[f.id] ?? 0;
          const shouldBe = pop <= 0 ? 'prapasca' : 'active';
          if (f.status !== shouldBe && (f.status === 'active' || f.status === 'prapasca')) {
            await supabase.from('farms').update({ status: shouldBe as any }).eq('id', f.id);
            f.status = shouldBe;
          }
        }
      }
      setFarms([...farmData]);
    }
    setLoading(false);
  }

  function generateFarmCode(prov: string, ct: string) {
    const p = prov.substring(0, 3).toUpperCase();
    const c = ct ? ct.substring(0, 3).toUpperCase() : 'XXX';
    return `FRM-${p}-${c}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
  }

  function resetForm() {
    setOwnerId(''); setName('');
    setProvinceId(''); setProvinceName('');
    setCityId(''); setCityName('');
    setDistrictId(''); setDistrictName('');
    setVillageId(''); setVillageName('');
    setFarmType('broiler'); setStatus('active'); setKapasitas('0'); setInitialPop('0'); setEditFarm(null);
  }

  function openEdit(farm: Farm) {
    setEditFarm(farm);
    setOwnerId(farm.owner_id || '');
    setName(farm.name);
    setProvinceName(farm.province); setCityName(farm.city || '');
    setDistrictName(farm.district || ''); setVillageName(farm.kelurahan || '');
    setFarmType(farm.farm_type); setStatus(farm.status);
    setKapasitas(String(farm.kapasitas_kandang ?? 0));
    const isLayer = LAYER_TYPES.includes(farm.farm_type);
    setInitialPop(String(isLayer ? (farm.layer_initial_population ?? farm.broiler_initial_population ?? 0) : (farm.broiler_initial_population ?? 0)));
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget || !user) return;
    const { error } = await supabase.from('farms').delete().eq('id', deleteTarget.id);
    if (error) { toast({ title: 'Gagal menghapus', description: error.message, variant: 'destructive' }); }
    else {
      await logAudit({ action: 'delete', module: 'Farm', userId: user.id, userName: profile?.full_name, oldValue: deleteTarget });
      toast({ title: 'Peternakan berhasil dihapus' }); loadData();
    }
    setDeleteTarget(null);
  }

  function handleProvinceChange(id: string) {
    const prov = regions.provinces.find(p => p.id === id);
    setProvinceId(id); setProvinceName(prov?.name || '');
    setCityId(''); setCityName(''); setDistrictId(''); setDistrictName(''); setVillageId(''); setVillageName('');
    regions.fetchCities(id);
  }
  function handleCityChange(id: string) {
    const c = regions.cities.find(c => c.id === id);
    setCityId(id); setCityName(c?.name || '');
    setDistrictId(''); setDistrictName(''); setVillageId(''); setVillageName('');
    regions.fetchDistricts(id);
  }
  function handleDistrictChange(id: string) {
    const d = regions.districts.find(d => d.id === id);
    setDistrictId(id); setDistrictName(d?.name || '');
    setVillageId(''); setVillageName('');
    regions.fetchVillages(id);
  }
  function handleVillageChange(id: string) {
    const v = regions.villages.find(v => v.id === id);
    setVillageId(id); setVillageName(v?.name || '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const selectedOwner = isSuperadmin ? ownerId : user.id;
    if (!selectedOwner) { toast({ title: 'Pilih pemilik terlebih dahulu', variant: 'destructive' }); setSubmitting(false); return; }
    if (!editFarm && (!provinceName || !cityName || !districtName || !villageName)) {
      toast({ title: 'Validasi gagal', description: 'Semua lokasi wajib diisi.', variant: 'destructive' }); setSubmitting(false); return;
    }

    const numKapasitas = Number(kapasitas) || 0;
    const numInitialPop = Number(initialPop) || 0;
    const isLayer = LAYER_TYPES.includes(farmType);

    // For layer types, auto-determine status based on population
    let effectiveStatus = status;
    if (isLayer && editFarm) {
      const pop = currentPopulations[editFarm.id] ?? 0;
      effectiveStatus = pop <= 0 ? 'prapasca' : 'active';
    }

    const payload: any = {
      name, province: provinceName, city: cityName || null, district: districtName || null, kelurahan: villageName || null,
      farm_type: farmType as any, status: effectiveStatus as any, owner_id: selectedOwner,
      kapasitas_kandang: numKapasitas,
      broiler_initial_population: isLayer ? 0 : numInitialPop,
      layer_initial_population: isLayer ? numInitialPop : 0,
    };

    if (editFarm) {
      const { error } = await supabase.from('farms').update(payload).eq('id', editFarm.id);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else {
        await logAudit({ action: 'edit', module: 'Farm', userId: user.id, userName: profile?.full_name, oldValue: editFarm, newValue: { ...payload, id: editFarm.id } });
        toast({ title: 'Peternakan berhasil diperbarui' }); resetForm(); setDialogOpen(false); loadData();
      }
    } else {
      payload.farm_code = generateFarmCode(provinceName, cityName);
      const { data: farm, error } = await supabase.from('farms').insert(payload).select('id').single();
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else if (farm) {
        await supabase.from('farm_members').insert({ farm_id: farm.id, user_id: selectedOwner });
        await logAudit({ action: 'create', module: 'Farm', userId: user.id, userName: profile?.full_name, newValue: { ...payload, id: farm.id } });
        toast({ title: 'Peternakan berhasil ditambahkan', description: `Kode: ${payload.farm_code}` });
        resetForm(); setDialogOpen(false); loadData();
      }
    }
    setSubmitting(false);
  }

  const isEditing = !!editFarm;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Peternakan</h1>
          <p className="text-sm text-muted-foreground">Kelola data peternakan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Tambah Peternakan</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{isEditing ? 'Edit Peternakan' : 'Tambah Peternakan Baru'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Pemilik</Label>
                {isSuperadmin ? (
                  <Select value={ownerId} onValueChange={setOwnerId}>
                    <SelectTrigger><SelectValue placeholder="Pilih pemilik" /></SelectTrigger>
                    <SelectContent>{userList.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (<Input value={profile?.full_name || ''} disabled className="bg-muted" />)}
              </div>
              <div><Label>Nama Peternakan</Label><Input value={name} onChange={e => setName(e.target.value)} required placeholder="Peternakan Sejahtera" /></div>

              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Provinsi</Label><Input value={provinceName} onChange={e => setProvinceName(e.target.value)} /></div>
                    <div><Label>Kota/Kabupaten</Label><Input value={cityName} onChange={e => setCityName(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Kecamatan</Label><Input value={districtName} onChange={e => setDistrictName(e.target.value)} /></div>
                    <div><Label>Kelurahan</Label><Input value={villageName} onChange={e => setVillageName(e.target.value)} /></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Provinsi</Label>
                      <Select value={provinceId} onValueChange={handleProvinceChange}>
                        <SelectTrigger><SelectValue placeholder={regions.loadingProvinces ? 'Memuat...' : 'Pilih Provinsi'} /></SelectTrigger>
                        <SelectContent>{regions.provinces.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Kota/Kabupaten</Label>
                      <Select value={cityId} onValueChange={handleCityChange} disabled={!provinceId}>
                        <SelectTrigger><SelectValue placeholder={regions.loadingCities ? 'Memuat...' : 'Pilih Kota'} /></SelectTrigger>
                        <SelectContent>{regions.cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Kecamatan</Label>
                      <Select value={districtId} onValueChange={handleDistrictChange} disabled={!cityId}>
                        <SelectTrigger><SelectValue placeholder={regions.loadingDistricts ? 'Memuat...' : 'Pilih Kecamatan'} /></SelectTrigger>
                        <SelectContent>{regions.districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Kelurahan</Label>
                      <Select value={villageId} onValueChange={handleVillageChange} disabled={!districtId}>
                        <SelectTrigger><SelectValue placeholder={regions.loadingVillages ? 'Memuat...' : 'Pilih Kelurahan'} /></SelectTrigger>
                        <SelectContent>{regions.villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipe Peternakan</Label>
                  <Select value={farmType} onValueChange={setFarmType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FARM_TYPES.map(k => <SelectItem key={k} value={k}>{FARM_TYPE_LABELS[k]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {isEditing && (
                  <div><Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div><Label>Kapasitas Kandang</Label><Input type="number" min="0" value={kapasitas} onChange={e => setKapasitas(e.target.value)} required /></div>
              <div><Label>Populasi Awal</Label><Input type="number" min="0" value={initialPop} onChange={e => setInitialPop(e.target.value)} required /></div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : isEditing ? 'Simpan Perubahan' : 'Simpan Peternakan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Peternakan?</AlertDialogTitle>
            <AlertDialogDescription>Anda yakin ingin menghapus peternakan <strong>{deleteTarget?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Peternakan</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : farms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada peternakan.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Kode</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Nama</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Lokasi</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Tipe</th>
                    <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Kapasitas</th>
                    <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Pop. Awal</th>
                    <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Pop. Sekarang</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Tgl. Registrasi</th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map((farm) => {
                    const isLayer = LAYER_TYPES.includes(farm.farm_type);
                    const initPop = isLayer ? (farm.layer_initial_population ?? farm.broiler_initial_population ?? 0) : (farm.broiler_initial_population ?? 0);
                    return (
                      <tr key={farm.id} className="border-b last:border-0">
                        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{farm.farm_code}</td>
                        <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{farm.name}</td>
                        <td className="px-3 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{[farm.province, farm.city].filter(Boolean).join(', ')}</td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{FARM_TYPE_LABELS[farm.farm_type] || farm.farm_type}</td>
                        <td className="px-3 py-3 text-right text-foreground whitespace-nowrap">{(farm.kapasitas_kandang ?? 0).toLocaleString('id-ID')}</td>
                        <td className="px-3 py-3 text-right text-foreground whitespace-nowrap">{initPop.toLocaleString('id-ID')}</td>
                        <td className="px-3 py-3 text-right font-semibold text-foreground whitespace-nowrap">{(currentPopulations[farm.id] ?? 0).toLocaleString('id-ID')}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {(() => {
                            const pop = currentPopulations[farm.id] ?? 0;
                            // For layer types: status is determined by population
                            const effectiveStatus = isLayer
                              ? (pop <= 0 ? 'prapasca' : 'active')
                              : farm.status;
                            return (
                              <span className={effectiveStatus === 'active' ? 'status-badge-submitted' : effectiveStatus === 'prapasca' ? 'status-badge-pending' : 'status-badge-not-submitted'}>
                                {STATUS_LABELS[effectiveStatus] || effectiveStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {farm.created_at ? new Date(farm.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(farm)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(farm)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
