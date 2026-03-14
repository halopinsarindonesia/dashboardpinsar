import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { Plus, Loader2, Pencil } from 'lucide-react';

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Potong', layer: 'Ayam Petelur', mixed: 'Potong & Petelur',
  other_cut: 'Unggas Potong Lain', other_egg: 'Unggas Petelur Lain', other_mixed: 'Unggas Campuran Lain',
};
const STATUS_LABELS: Record<string, string> = { active: 'Aktif', renovation: 'Renovasi', inactive: 'Nonaktif' };

const PROVINCES = [
  'Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung',
  'Kep. Bangka Belitung','Kep. Riau','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta',
  'Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat',
  'Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara',
  'Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku',
  'Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya',
];

interface Farm {
  id: string; farm_code: string; name: string; province: string; city: string | null;
  farm_type: string; status: string; owner_id?: string | null;
  broiler_initial_population?: number; layer_initial_population?: number;
}
interface Peternak { id: string; full_name: string; province: string | null; }

export default function FarmsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [peternakList, setPeternakList] = useState<Peternak[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFarm, setEditFarm] = useState<Farm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [ownerId, setOwnerId] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [farmType, setFarmType] = useState('broiler');
  const [status, setStatus] = useState('active');
  const [broilerPop, setBroilerPop] = useState('0');
  const [layerPop, setLayerPop] = useState('0');

  const isBroiler = ['broiler', 'mixed', 'other_cut', 'other_mixed'].includes(farmType);
  const isLayer = ['layer', 'mixed', 'other_egg', 'other_mixed'].includes(farmType);
  const isPeternak = profile?.role === 'peternak';

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    // Load peternak list for selector (only DPP/DPW need this)
    if (!isPeternak) {
      const { data: pts } = await supabase.from('profiles').select('id, full_name, province')
        .eq('role', 'peternak').eq('status', 'approved');
      setPeternakList((pts as Peternak[]) ?? []);
    }

    let query = supabase.from('farms').select('*').order('created_at', { ascending: false });
    if (isPeternak && user) {
      const { data: memberFarms } = await supabase.from('farm_members').select('farm_id').eq('user_id', user.id);
      const farmIds = memberFarms?.map((m: any) => m.farm_id) ?? [];
      if (farmIds.length > 0) query = query.in('id', farmIds);
      else { setFarms([]); setLoading(false); return; }
    }
    const { data } = await query;
    setFarms((data as Farm[]) ?? []);
    setLoading(false);
  }

  function generateFarmCode(prov: string, ct: string) {
    const p = prov.substring(0, 3).toUpperCase();
    const c = ct ? ct.substring(0, 3).toUpperCase() : 'XXX';
    return `FRM-${p}-${c}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
  }

  function resetForm() {
    setOwnerId(''); setName(''); setProvince(''); setCity(''); setFarmType('broiler');
    setStatus('active'); setBroilerPop('0'); setLayerPop('0'); setEditFarm(null);
  }

  function openEdit(farm: Farm) {
    setEditFarm(farm);
    setOwnerId(farm.owner_id || '');
    setName(farm.name);
    setProvince(farm.province);
    setCity(farm.city || '');
    setFarmType(farm.farm_type);
    setStatus(farm.status);
    setBroilerPop(String(farm.broiler_initial_population ?? 0));
    setLayerPop(String(farm.layer_initial_population ?? 0));
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const selectedOwner = isPeternak ? user.id : ownerId;
    if (!selectedOwner) { toast({ title: 'Pilih peternak terlebih dahulu', variant: 'destructive' }); setSubmitting(false); return; }

    const payload: any = {
      name, province, city: city || null, farm_type: farmType as any, status: status as any,
      owner_id: selectedOwner,
      broiler_initial_population: isBroiler ? Number(broilerPop) || 0 : 0,
      layer_initial_population: isLayer ? Number(layerPop) || 0 : 0,
    };

    if (editFarm) {
      const { error } = await supabase.from('farms').update(payload).eq('id', editFarm.id);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else {
        await logAudit({ action: 'edit', module: 'Farm', userId: user.id, userName: profile?.full_name, oldValue: editFarm, newValue: { ...payload, id: editFarm.id } });
        toast({ title: 'Peternakan berhasil diperbarui' });
        resetForm(); setDialogOpen(false); loadData();
      }
    } else {
      payload.farm_code = generateFarmCode(province, city);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Peternakan</h1>
          <p className="text-sm text-muted-foreground">Kelola data peternakan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Tambah Peternakan</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editFarm ? 'Edit Peternakan' : 'Tambah Peternakan Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Peternak selector */}
              <div>
                <Label>Peternak (Pemilik)</Label>
                {isPeternak ? (
                  <Input value={profile?.full_name || ''} disabled className="bg-muted" />
                ) : (
                  <Select value={ownerId} onValueChange={setOwnerId}>
                    <SelectTrigger><SelectValue placeholder="Pilih peternak" /></SelectTrigger>
                    <SelectContent>
                      {peternakList.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name} {p.province ? `(${p.province})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Nama Peternakan</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Peternakan Sejahtera" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Provinsi</Label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                    <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Kota/Kabupaten</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Bandung" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipe Peternakan</Label>
                  <Select value={farmType} onValueChange={setFarmType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(FARM_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {editFarm && (
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Population fields */}
              {isBroiler && (
                <div><Label>Populasi Awal Ayam Potong</Label><Input type="number" min="0" value={broilerPop} onChange={e => setBroilerPop(e.target.value)} /></div>
              )}
              {isLayer && (
                <div><Label>Populasi Awal Ayam Petelur</Label><Input type="number" min="0" value={layerPop} onChange={e => setLayerPop(e.target.value)} /></div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : editFarm ? 'Simpan Perubahan' : 'Simpan Peternakan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kode</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Provinsi</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pop. Broiler</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pop. Layer</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map((farm) => (
                    <tr key={farm.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{farm.farm_code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{farm.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{farm.province}{farm.city ? `, ${farm.city}` : ''}</td>
                      <td className="px-4 py-3 text-muted-foreground">{FARM_TYPE_LABELS[farm.farm_type] || farm.farm_type}</td>
                      <td className="px-4 py-3 text-right text-foreground">{(farm.broiler_initial_population ?? 0).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right text-foreground">{(farm.layer_initial_population ?? 0).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">
                        <span className={farm.status === 'active' ? 'status-badge-submitted' : 'status-badge-pending'}>
                          {STATUS_LABELS[farm.status] || farm.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(farm)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
