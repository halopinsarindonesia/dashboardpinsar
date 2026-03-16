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
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', ayam_kampung: 'Ayam Kampung',
  ayam_pejantan: 'Ayam Pejantan', bebek: 'Bebek', puyuh: 'Puyuh',
};
const FARM_TYPES = Object.keys(FARM_TYPE_LABELS);

const STATUS_LABELS: Record<string, string> = { active: 'Aktif', prapasca: 'Pra/Pasca', inactive: 'Nonaktif' };

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
  district?: string | null; kelurahan?: string | null;
  farm_type: string; status: string; owner_id?: string | null;
  broiler_initial_population?: number; layer_initial_population?: number;
  kapasitas_kandang?: number;
}
interface UserOption { id: string; full_name: string; }

export default function FarmsPage() {
  const { profile, user, isSuperadmin } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [userList, setUserList] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFarm, setEditFarm] = useState<Farm | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Farm | null>(null);

  const [ownerId, setOwnerId] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [farmType, setFarmType] = useState('broiler');
  const [status, setStatus] = useState('active');
  const [kapasitas, setKapasitas] = useState('0');
  const [initialPop, setInitialPop] = useState('0');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    // Superadmin can pick any user as owner
    if (isSuperadmin) {
      const { data: users } = await supabase.from('profiles').select('id, full_name').eq('status', 'approved');
      setUserList((users as UserOption[]) ?? []);
    }

    if (isSuperadmin) {
      // Superadmin sees all farms
      const { data } = await supabase.from('farms').select('*').order('created_at', { ascending: false });
      setFarms((data as Farm[]) ?? []);
    } else if (user) {
      // Non-superadmin only sees own farms
      const { data: memberFarms } = await supabase.from('farm_members').select('farm_id').eq('user_id', user.id);
      const farmIds = memberFarms?.map((m: any) => m.farm_id) ?? [];
      if (farmIds.length > 0) {
        const { data } = await supabase.from('farms').select('*').in('id', farmIds).order('created_at', { ascending: false });
        setFarms((data as Farm[]) ?? []);
      } else {
        setFarms([]);
      }
    }
    setLoading(false);
  }

  function generateFarmCode(prov: string, ct: string) {
    const p = prov.substring(0, 3).toUpperCase();
    const c = ct ? ct.substring(0, 3).toUpperCase() : 'XXX';
    return `FRM-${p}-${c}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
  }

  function resetForm() {
    setOwnerId(''); setName(''); setProvince(''); setCity(''); setDistrict(''); setKelurahan('');
    setFarmType('broiler'); setStatus('active'); setKapasitas('0'); setInitialPop('0'); setEditFarm(null);
  }

  function openEdit(farm: Farm) {
    setEditFarm(farm);
    setOwnerId(farm.owner_id || '');
    setName(farm.name);
    setProvince(farm.province);
    setCity(farm.city || '');
    setDistrict(farm.district || '');
    setKelurahan(farm.kelurahan || '');
    setFarmType(farm.farm_type);
    setStatus(farm.status);
    setKapasitas(String(farm.kapasitas_kandang ?? 0));
    setInitialPop(String(farm.broiler_initial_population ?? farm.layer_initial_population ?? 0));
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget || !user) return;
    const { error } = await supabase.from('farms').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Gagal menghapus', description: error.message, variant: 'destructive' });
    } else {
      await logAudit({ action: 'delete', module: 'Farm', userId: user.id, userName: profile?.full_name, oldValue: deleteTarget });
      toast({ title: 'Peternakan berhasil dihapus' });
      loadData();
    }
    setDeleteTarget(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const selectedOwner = isSuperadmin ? ownerId : user.id;
    if (!selectedOwner) { toast({ title: 'Pilih pemilik terlebih dahulu', variant: 'destructive' }); setSubmitting(false); return; }

    const numKapasitas = Number(kapasitas) || 0;
    const numInitialPop = Number(initialPop) || 0;

    if (numInitialPop > numKapasitas) {
      toast({ title: 'Validasi gagal', description: 'Populasi awal tidak boleh melebihi kapasitas kandang.', variant: 'destructive' });
      setSubmitting(false); return;
    }

    const payload: any = {
      name, province, city: city || null, district: district || null, kelurahan: kelurahan || null,
      farm_type: farmType as any, status: status as any,
      owner_id: selectedOwner,
      kapasitas_kandang: numKapasitas,
      broiler_initial_population: numInitialPop,
      layer_initial_population: 0,
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
              {/* Owner selector */}
              <div>
                <Label>Pemilik</Label>
                {isSuperadmin ? (
                  <Select value={ownerId} onValueChange={setOwnerId}>
                    <SelectTrigger><SelectValue placeholder="Pilih pemilik" /></SelectTrigger>
                    <SelectContent>
                      {userList.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={profile?.full_name || ''} disabled className="bg-muted" />
                )}
              </div>

              <div>
                <Label>Nama Peternakan</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Peternakan Sejahtera" />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Provinsi</Label>
                  <Select value={province} onValueChange={(v) => { setProvince(v); setCity(''); setDistrict(''); setKelurahan(''); }}>
                    <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                    <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kota/Kabupaten</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Bandung" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kecamatan</Label>
                  <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Kecamatan" required />
                </div>
                <div>
                  <Label>Kelurahan</Label>
                  <Input value={kelurahan} onChange={e => setKelurahan(e.target.value)} placeholder="Kelurahan" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipe Peternakan</Label>
                  <Select value={farmType} onValueChange={setFarmType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FARM_TYPES.map(k => <SelectItem key={k} value={k}>{FARM_TYPE_LABELS[k]}</SelectItem>)}</SelectContent>
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
              <div>
                <Label>Kapasitas Kandang</Label>
                <Input type="number" min="0" value={kapasitas} onChange={e => setKapasitas(e.target.value)} required />
              </div>
              <div>
                <Label>Populasi Awal</Label>
                <Input type="number" min="0" max={kapasitas} value={initialPop} onChange={e => setInitialPop(e.target.value)} required />
                <p className="text-xs text-muted-foreground mt-1">Tidak boleh melebihi kapasitas kandang</p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : editFarm ? 'Simpan Perubahan' : 'Simpan Peternakan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Peternakan?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus peternakan <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kode</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lokasi</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Kapasitas</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Populasi Awal</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map((farm) => (
                    <tr key={farm.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{farm.farm_code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{farm.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {farm.province}{farm.city ? `, ${farm.city}` : ''}{farm.district ? `, ${farm.district}` : ''}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{FARM_TYPE_LABELS[farm.farm_type] || farm.farm_type}</td>
                      <td className="px-4 py-3 text-right text-foreground">{((farm as any).kapasitas_kandang ?? 0).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right text-foreground">{(farm.broiler_initial_population ?? 0).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">
                        <span className={farm.status === 'active' ? 'status-badge-submitted' : farm.status === 'prapasca' ? 'status-badge-pending' : 'status-badge-not-submitted'}>
                          {STATUS_LABELS[farm.status] || farm.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(farm)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(farm)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
