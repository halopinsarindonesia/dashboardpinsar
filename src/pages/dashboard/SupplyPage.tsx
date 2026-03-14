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

interface Farm {
  id: string; name: string; farm_code: string; farm_type: string; status: string;
  province: string; city: string | null;
  broiler_initial_population?: number; layer_initial_population?: number;
}

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Potong', layer: 'Ayam Petelur', mixed: 'Potong & Petelur',
  other_cut: 'Unggas Potong Lain', other_egg: 'Unggas Petelur Lain', other_mixed: 'Unggas Campuran Lain',
};

export default function SupplyPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [currentBroilerPop, setCurrentBroilerPop] = useState(0);
  const [currentLayerPop, setCurrentLayerPop] = useState(0);
  const [broilerInput, setBroilerInput] = useState('');
  const [broilerSold, setBroilerSold] = useState('');
  const [broilerDeath, setBroilerDeath] = useState('');
  const [broilerPrice, setBroilerPrice] = useState('');
  const [layerInput, setLayerInput] = useState('');
  const [layerDeath, setLayerDeath] = useState('');
  const [layerEggProduction, setLayerEggProduction] = useState('');
  const [layerEggPrice, setLayerEggPrice] = useState('');

  const selectedFarm = useMemo(() => farms.find(f => f.id === selectedFarmId), [farms, selectedFarmId]);
  const isBroiler = selectedFarm && ['broiler', 'mixed', 'other_cut', 'other_mixed'].includes(selectedFarm.farm_type);
  const isLayer = selectedFarm && ['layer', 'mixed', 'other_egg', 'other_mixed'].includes(selectedFarm.farm_type);

  useEffect(() => { loadData(); }, [user, profile]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    let farmsData: Farm[] = [];
    if (profile?.role === 'peternak') {
      const { data: memberData } = await supabase.from('farm_members').select('farm_id').eq('user_id', user.id);
      const farmIds = memberData?.map((m: any) => m.farm_id) ?? [];
      if (farmIds.length > 0) {
        const { data } = await supabase.from('farms').select('*').in('id', farmIds).eq('status', 'active');
        farmsData = (data as Farm[]) ?? [];
      }
    } else {
      const { data } = await supabase.from('farms').select('*').eq('status', 'active');
      farmsData = (data as Farm[]) ?? [];
    }
    setFarms(farmsData);

    const { data: recordsData } = await supabase
      .from('supply_records').select('*, farms(name, farm_code, farm_type, province)')
      .order('record_date', { ascending: false }).limit(50);
    setRecords(recordsData ?? []);
    setLoading(false);
  }

  // Calculate current population for a farm
  async function calcPopulation(farmId: string) {
    const farm = farms.find(f => f.id === farmId);
    if (!farm) return;
    const { data: allRecords } = await supabase.from('supply_records')
      .select('broiler_input, broiler_sold, broiler_death, layer_input, layer_death')
      .eq('farm_id', farmId);
    const recs = allRecords ?? [];
    const bPop = (farm.broiler_initial_population ?? 0) + recs.reduce((s, r) => s + (r.broiler_input ?? 0) - (r.broiler_sold ?? 0) - (r.broiler_death ?? 0), 0);
    const lPop = (farm.layer_initial_population ?? 0) + recs.reduce((s, r) => s + (r.layer_input ?? 0) - (r.layer_death ?? 0), 0);
    setCurrentBroilerPop(Math.max(0, bPop));
    setCurrentLayerPop(Math.max(0, lPop));
  }

  useEffect(() => { if (selectedFarmId) calcPopulation(selectedFarmId); }, [selectedFarmId, farms]);

  function resetForm() {
    setSelectedFarmId(''); setEditRecord(null);
    setBroilerInput(''); setBroilerSold(''); setBroilerDeath(''); setBroilerPrice('');
    setLayerInput(''); setLayerDeath(''); setLayerEggProduction(''); setLayerEggPrice('');
    setCurrentBroilerPop(0); setCurrentLayerPop(0);
  }

  function openEdit(record: any) {
    setEditRecord(record);
    setSelectedFarmId(record.farm_id);
    setBroilerInput(String(record.broiler_input ?? ''));
    setBroilerSold(String(record.broiler_sold ?? ''));
    setBroilerDeath(String(record.broiler_death ?? ''));
    setBroilerPrice(String(record.broiler_price_per_kg ?? ''));
    setLayerInput(String(record.layer_input ?? ''));
    setLayerDeath(String(record.layer_death ?? ''));
    setLayerEggProduction(String(record.layer_egg_production ?? ''));
    setLayerEggPrice(String(record.layer_egg_price_per_kg ?? ''));
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmId || !user) return;
    setSubmitting(true);

    const bInput = Number(broilerInput) || 0;
    const bSold = Number(broilerSold) || 0;
    const bDeath = Number(broilerDeath) || 0;
    const lInput = Number(layerInput) || 0;
    const lDeath = Number(layerDeath) || 0;

    if (isBroiler && (bSold + bDeath > currentBroilerPop + bInput)) {
      toast({ title: 'Validasi gagal', description: 'Terjual + kematian tidak boleh melebihi populasi + input.', variant: 'destructive' });
      setSubmitting(false); return;
    }
    if (isLayer && lDeath > currentLayerPop + lInput) {
      toast({ title: 'Validasi gagal', description: 'Kematian tidak boleh melebihi populasi + input.', variant: 'destructive' });
      setSubmitting(false); return;
    }

    const newBroilerPop = isBroiler ? currentBroilerPop + bInput - bSold - bDeath : 0;
    const newLayerPop = isLayer ? currentLayerPop + lInput - lDeath : 0;

    const payload: any = {
      farm_id: selectedFarmId, submitted_by: user.id,
      broiler_population: isBroiler ? newBroilerPop : 0,
      broiler_input: isBroiler ? bInput : 0,
      broiler_sold: isBroiler ? bSold : 0,
      broiler_death: isBroiler ? bDeath : 0,
      broiler_price_per_kg: isBroiler ? (Number(broilerPrice) || null) : null,
      layer_population: isLayer ? newLayerPop : 0,
      layer_input: isLayer ? lInput : 0,
      layer_death: isLayer ? lDeath : 0,
      layer_egg_production: isLayer ? (Number(layerEggProduction) || 0) : 0,
      layer_egg_price_per_kg: isLayer ? (Number(layerEggPrice) || null) : null,
    };

    if (editRecord) {
      const { error } = await supabase.from('supply_records').update(payload).eq('id', editRecord.id);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else {
        await logAudit({ action: 'edit', module: 'Panen', userId: user.id, userName: profile?.full_name, oldValue: editRecord, newValue: payload });
        toast({ title: 'Data panen berhasil diperbarui' });
        resetForm(); setDialogOpen(false); loadData();
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('supply_records').select('id').eq('farm_id', selectedFarmId).eq('record_date', today).maybeSingle();
      if (existing) { toast({ title: 'Sudah ada data', description: 'Farm ini sudah submit hari ini.', variant: 'destructive' }); setSubmitting(false); return; }

      payload.record_date = today;
      const { error } = await supabase.from('supply_records').insert(payload);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else {
        await logAudit({ action: 'create', module: 'Panen', userId: user.id, userName: profile?.full_name, newValue: payload });
        toast({ title: 'Berhasil', description: 'Data panen berhasil disimpan.' });
        resetForm(); setDialogOpen(false); loadData();
      }
    }
    setSubmitting(false);
  }

  const formatNum = (n: number | null) => n != null ? n.toLocaleString('id-ID') : '-';
  const formatPrice = (n: number | null) => n != null ? `Rp ${n.toLocaleString('id-ID')}` : '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Input Panen Harian</h1>
          <p className="text-sm text-muted-foreground">Catat data panen peternakan hari ini</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Input Panen Baru</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editRecord ? 'Edit Data Panen' : 'Input Panen Harian'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Peternakan</Label>
                {farms.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">Belum ada peternakan aktif.</p>
                ) : (
                  <Select value={selectedFarmId} onValueChange={setSelectedFarmId} disabled={!!editRecord}>
                    <SelectTrigger><SelectValue placeholder="Pilih peternakan" /></SelectTrigger>
                    <SelectContent>
                      {farms.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.farm_code} — {f.name} ({FARM_TYPE_LABELS[f.farm_type]})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedFarm && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium text-foreground">{selectedFarm.name}</p>
                  <p className="text-muted-foreground">{FARM_TYPE_LABELS[selectedFarm.farm_type]} • {selectedFarm.province}</p>
                </div>
              )}

              {isBroiler && (
                <fieldset className="space-y-3 rounded-lg border p-4">
                  <legend className="px-2 font-display text-sm font-semibold text-foreground">Ayam Potong (Broiler)</legend>
                  <div>
                    <Label>Populasi Saat Ini</Label>
                    <Input type="number" value={currentBroilerPop} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">Dihitung otomatis dari data peternakan</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Ayam Masuk</Label><Input type="number" min="0" value={broilerInput} onChange={e => setBroilerInput(e.target.value)} /></div>
                    <div><Label>Ayam Terjual</Label><Input type="number" min="0" value={broilerSold} onChange={e => setBroilerSold(e.target.value)} /></div>
                    <div><Label>Kematian</Label><Input type="number" min="0" value={broilerDeath} onChange={e => setBroilerDeath(e.target.value)} /></div>
                    <div><Label>Harga per kg (Rp)</Label><Input type="number" min="0" value={broilerPrice} onChange={e => setBroilerPrice(e.target.value)} /></div>
                  </div>
                </fieldset>
              )}

              {isLayer && (
                <fieldset className="space-y-3 rounded-lg border p-4">
                  <legend className="px-2 font-display text-sm font-semibold text-foreground">Ayam Petelur (Layer)</legend>
                  <div>
                    <Label>Populasi Saat Ini</Label>
                    <Input type="number" value={currentLayerPop} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">Dihitung otomatis dari data peternakan</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Ayam Masuk</Label><Input type="number" min="0" value={layerInput} onChange={e => setLayerInput(e.target.value)} /></div>
                    <div><Label>Kematian</Label><Input type="number" min="0" value={layerDeath} onChange={e => setLayerDeath(e.target.value)} /></div>
                    <div><Label>Produksi Telur</Label><Input type="number" min="0" value={layerEggProduction} onChange={e => setLayerEggProduction(e.target.value)} /></div>
                    <div><Label>Harga Telur per kg (Rp)</Label><Input type="number" min="0" value={layerEggPrice} onChange={e => setLayerEggPrice(e.target.value)} /></div>
                  </div>
                </fieldset>
              )}

              <Button type="submit" className="w-full" disabled={submitting || !selectedFarmId}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : editRecord ? 'Simpan Perubahan' : 'Simpan Data Panen'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Panen</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data panen.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Peternakan</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Populasi</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Masuk</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Terjual/Telur</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Harga/kg</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => {
                    const farm = r.farms;
                    const isBroilerRec = farm?.farm_type && ['broiler', 'mixed', 'other_cut', 'other_mixed'].includes(farm.farm_type);
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(r.record_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{farm?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{farm ? FARM_TYPE_LABELS[farm.farm_type] : '-'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatNum(isBroilerRec ? r.broiler_population : r.layer_population)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatNum(isBroilerRec ? r.broiler_input : r.layer_input)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{isBroilerRec ? formatNum(r.broiler_sold) : formatNum(r.layer_egg_production)}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatPrice(isBroilerRec ? r.broiler_price_per_kg : r.layer_egg_price_per_kg)}</td>
                        <td className="px-4 py-3">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
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
