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
  kapasitas_kandang?: number;
}

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', mixed: 'Ayam Kampung',
  other_cut: 'Ayam Pejantan', other_egg: 'Bebek', other_mixed: 'Puyuh',
};

export default function SupplyPage() {
  const { profile, user, isSuperadmin } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [currentPop, setCurrentPop] = useState(0);
  const [inputCount, setInputCount] = useState('');
  const [soldCount, setSoldCount] = useState('');
  const [deathCount, setDeathCount] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [eggProduction, setEggProduction] = useState('');
  const [eggPrice, setEggPrice] = useState('');

  const selectedFarm = useMemo(() => farms.find(f => f.id === selectedFarmId), [farms, selectedFarmId]);
  // Egg types: layer and puyuh produce eggs
  const isEggType = selectedFarm && ['layer', 'other_egg'].includes(selectedFarm.farm_type);

  useEffect(() => { loadData(); }, [user, profile]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    let farmsData: Farm[] = [];

    if (isSuperadmin) {
      const { data } = await supabase.from('farms').select('*').eq('status', 'active');
      farmsData = (data as unknown as Farm[]) ?? [];
    } else {
      // Non-superadmin: only own farms
      const { data: memberData } = await supabase.from('farm_members').select('farm_id').eq('user_id', user.id);
      const farmIds = memberData?.map((m: any) => m.farm_id) ?? [];
      if (farmIds.length > 0) {
        const { data } = await supabase.from('farms').select('*').in('id', farmIds).eq('status', 'active');
        farmsData = (data as unknown as Farm[]) ?? [];
      }
    }
    setFarms(farmsData);

    let recordsQuery = supabase
      .from('supply_records').select('*, farms(name, farm_code, farm_type, province)')
      .order('record_date', { ascending: false }).limit(50);

    if (!isSuperadmin) {
      const farmIds = farmsData.map(f => f.id);
      if (farmIds.length > 0) {
        recordsQuery = recordsQuery.in('farm_id', farmIds);
      } else {
        setRecords([]);
        setLoading(false);
        return;
      }
    }

    const { data: recordsData } = await recordsQuery;
    setRecords(recordsData ?? []);
    setLoading(false);
  }

  async function calcPopulation(farmId: string) {
    const farm = farms.find(f => f.id === farmId);
    if (!farm) return;
    const { data: allRecords } = await supabase.from('supply_records')
      .select('broiler_input, broiler_sold, broiler_death')
      .eq('farm_id', farmId);
    const recs = allRecords ?? [];
    const pop = (farm.broiler_initial_population ?? 0)
      + recs.reduce((s, r) => s + (r.broiler_input ?? 0) - (r.broiler_sold ?? 0) - (r.broiler_death ?? 0), 0);
    setCurrentPop(Math.max(0, pop));
  }

  useEffect(() => { if (selectedFarmId) calcPopulation(selectedFarmId); }, [selectedFarmId, farms]);

  function resetForm() {
    setSelectedFarmId(''); setEditRecord(null);
    setInputCount(''); setSoldCount(''); setDeathCount(''); setPricePerKg('');
    setEggProduction(''); setEggPrice('');
    setCurrentPop(0);
  }

  function openEdit(record: any) {
    setEditRecord(record);
    setSelectedFarmId(record.farm_id);
    setInputCount(String(record.broiler_input ?? ''));
    setSoldCount(String(record.broiler_sold ?? ''));
    setDeathCount(String(record.broiler_death ?? ''));
    setPricePerKg(String(record.broiler_price_per_kg ?? ''));
    setEggProduction(String(record.layer_egg_production ?? ''));
    setEggPrice(String(record.layer_egg_price_per_kg ?? ''));
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmId || !user) return;
    setSubmitting(true);

    const input = Number(inputCount) || 0;
    const sold = Number(soldCount) || 0;
    const death = Number(deathCount) || 0;

    if (sold + death > currentPop + input) {
      toast({ title: 'Validasi gagal', description: 'Terjual + kematian tidak boleh melebihi populasi + input.', variant: 'destructive' });
      setSubmitting(false); return;
    }

    const newPop = currentPop + input - sold - death;

    const payload: any = {
      farm_id: selectedFarmId, submitted_by: user.id,
      broiler_population: newPop,
      broiler_input: input,
      broiler_sold: sold,
      broiler_death: death,
      broiler_price_per_kg: Number(pricePerKg) || null,
      layer_population: 0,
      layer_input: 0,
      layer_death: 0,
      layer_egg_production: isEggType ? (Number(eggProduction) || 0) : 0,
      layer_egg_price_per_kg: isEggType ? (Number(eggPrice) || null) : null,
    };

    if (editRecord) {
      const { error } = await supabase.from('supply_records').update(payload).eq('id', editRecord.id);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else {
        await logAudit({ action: 'edit', module: 'Panen', userId: user.id, userName: profile?.full_name, oldValue: editRecord, newValue: payload });
        toast({ title: 'Data panen berhasil diperbarui' });

        // Auto-trigger prapasca if population hits 0
        if (newPop <= 0) {
          await supabase.from('farms').update({ status: 'prapasca' as any }).eq('id', selectedFarmId).eq('status', 'active');
          toast({ title: 'Status diubah', description: 'Populasi habis, status peternakan diubah ke Pra/Pasca.' });
        }

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

        // Auto-trigger prapasca if population hits 0
        if (newPop <= 0) {
          await supabase.from('farms').update({ status: 'prapasca' as any }).eq('id', selectedFarmId).eq('status', 'active');
          toast({ title: 'Status diubah', description: 'Populasi habis, status peternakan diubah ke Pra/Pasca.' });
        }

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
                        <SelectItem key={f.id} value={f.id}>{f.farm_code} — {f.name} ({FARM_TYPE_LABELS[f.farm_type] || f.farm_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedFarm && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium text-foreground">{selectedFarm.name}</p>
                  <p className="text-muted-foreground">{FARM_TYPE_LABELS[selectedFarm.farm_type] || selectedFarm.farm_type} • {selectedFarm.province}</p>
                </div>
              )}

              {selectedFarm && (
                <fieldset className="space-y-3 rounded-lg border p-4">
                  <legend className="px-2 font-display text-sm font-semibold text-foreground">{FARM_TYPE_LABELS[selectedFarm.farm_type] || selectedFarm.farm_type}</legend>
                  <div>
                    <Label>Populasi Saat Ini</Label>
                    <Input type="number" value={currentPop} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">Dihitung otomatis dari data peternakan</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Masuk</Label><Input type="number" min="0" value={inputCount} onChange={e => setInputCount(e.target.value)} /></div>
                    <div><Label>Terjual</Label><Input type="number" min="0" value={soldCount} onChange={e => setSoldCount(e.target.value)} /></div>
                    <div><Label>Kematian</Label><Input type="number" min="0" value={deathCount} onChange={e => setDeathCount(e.target.value)} /></div>
                    <div><Label>Harga per kg (Rp)</Label><Input type="number" min="0" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} /></div>
                  </div>
                  {isEggType && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div><Label>Produksi Telur</Label><Input type="number" min="0" value={eggProduction} onChange={e => setEggProduction(e.target.value)} /></div>
                      <div><Label>Harga Telur per kg (Rp)</Label><Input type="number" min="0" value={eggPrice} onChange={e => setEggPrice(e.target.value)} /></div>
                    </div>
                  )}
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
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Terjual</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Kematian</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Harga/kg</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => {
                    const farm = r.farms;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(r.record_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{farm?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{farm ? (FARM_TYPE_LABELS[farm.farm_type] || farm.farm_type) : '-'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatNum(r.broiler_population)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatNum(r.broiler_input)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatNum(r.broiler_sold)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatNum(r.broiler_death)}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatPrice(r.broiler_price_per_kg)}</td>
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
