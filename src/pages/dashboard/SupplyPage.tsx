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
import { Plus, Loader2, Pencil, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

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

type FlowStep = 'select-farm' | 'select-type' | 'form-masuk' | 'form-keluar';
type InputType = 'masuk' | 'keluar';

export default function SupplyPage() {
  const { profile, user, isSuperadmin } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  // Flow state
  const [step, setStep] = useState<FlowStep>('select-farm');
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [inputType, setInputType] = useState<InputType | ''>('');
  const [currentPop, setCurrentPop] = useState(0);

  // Form fields
  const [ayamMasuk, setAyamMasuk] = useState('');
  const [ayamTerjual, setAyamTerjual] = useState('');
  const [kematian, setKematian] = useState('');
  const [hargaJual, setHargaJual] = useState('');

  const selectedFarm = useMemo(() => farms.find(f => f.id === selectedFarmId), [farms, selectedFarmId]);
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
    setStep('select-farm');
    setSelectedFarmId(''); setEditRecord(null); setInputType('');
    setAyamMasuk(''); setAyamTerjual(''); setKematian(''); setHargaJual('');
    setCurrentPop(0);
  }

  function openEdit(record: any) {
    setEditRecord(record);
    setSelectedFarmId(record.farm_id);
    const isMasuk = (record.broiler_input ?? 0) > 0 && (record.broiler_sold ?? 0) === 0 && (record.broiler_death ?? 0) === 0;
    if (isMasuk) {
      setInputType('masuk');
      setAyamMasuk(String(record.broiler_input ?? ''));
      setStep('form-masuk');
    } else {
      setInputType('keluar');
      setAyamTerjual(String(record.broiler_sold ?? ''));
      setKematian(String(record.broiler_death ?? ''));
      setHargaJual(String(record.broiler_price_per_kg ?? ''));
      setStep('form-keluar');
    }
    setDialogOpen(true);
  }

  function handleFarmSelected(farmId: string) {
    setSelectedFarmId(farmId);
    setStep('select-type');
  }

  function handleTypeSelected(type: InputType) {
    setInputType(type);
    setStep(type === 'masuk' ? 'form-masuk' : 'form-keluar');
  }

  async function handleSubmitMasuk(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmId || !user) return;
    setSubmitting(true);

    const masuk = Number(ayamMasuk) || 0;
    const kapasitas = selectedFarm?.kapasitas_kandang ?? 0;

    // Validation: population must be 0 to add new chickens
    if (!editRecord && currentPop > 0) {
      toast({ title: 'Validasi gagal', description: 'Masih ada populasi ayam, harap update ayam keluar hingga populasi 0 baru menambahkan ayam masuk', variant: 'destructive' });
      setSubmitting(false); return;
    }

    // Validation: cannot exceed capacity
    if (masuk > kapasitas) {
      toast({ title: 'Validasi gagal', description: 'Jumlah ayam masuk melebihi kapasitas kandang, harap tambah data kapasitas kandang dalam database peternakan atau kurangi jumlah ayam masuk', variant: 'destructive' });
      setSubmitting(false); return;
    }

    const newPop = currentPop + masuk;
    const payload: any = {
      farm_id: selectedFarmId, submitted_by: user.id,
      broiler_population: newPop, broiler_input: masuk,
      broiler_sold: 0, broiler_death: 0, broiler_price_per_kg: null,
      layer_population: 0, layer_input: 0, layer_death: 0,
      layer_egg_production: 0, layer_egg_price_per_kg: null,
    };

    await saveRecord(payload, newPop);
  }

  async function handleSubmitKeluar(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmId || !user) return;
    setSubmitting(true);

    const sold = Number(ayamTerjual) || 0;
    const death = Number(kematian) || 0;
    const price = Number(hargaJual) || null;

    if (sold + death > currentPop) {
      toast({ title: 'Validasi gagal', description: 'Ayam terjual + kematian tidak boleh melebihi populasi saat ini.', variant: 'destructive' });
      setSubmitting(false); return;
    }

    const newPop = currentPop - sold - death;
    const payload: any = {
      farm_id: selectedFarmId, submitted_by: user.id,
      broiler_population: newPop, broiler_input: 0,
      broiler_sold: sold, broiler_death: death, broiler_price_per_kg: price,
      layer_population: 0, layer_input: 0, layer_death: 0,
      layer_egg_production: isEggType ? sold : 0,
      layer_egg_price_per_kg: isEggType ? price : null,
    };

    await saveRecord(payload, newPop);
  }

  async function saveRecord(payload: any, newPop: number) {
    if (editRecord) {
      const { error } = await supabase.from('supply_records').update(payload).eq('id', editRecord.id);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else {
        await logAudit({ action: 'edit', module: 'Produksi', userId: user!.id, userName: profile?.full_name, oldValue: editRecord, newValue: payload });
        toast({ title: 'Data produksi berhasil diperbarui' });
        if (newPop <= 0) {
          await supabase.from('farms').update({ status: 'inactive' as any }).eq('id', selectedFarmId).eq('status', 'active');
          toast({ title: 'Status diubah', description: 'Populasi habis, status peternakan diubah.' });
        }
        resetForm(); setDialogOpen(false); loadData();
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('supply_records').select('id').eq('farm_id', selectedFarmId).eq('record_date', today).maybeSingle();
      if (existing) { toast({ title: 'Sudah ada data', description: 'Peternakan ini sudah submit hari ini.', variant: 'destructive' }); setSubmitting(false); return; }

      payload.record_date = today;
      const { error } = await supabase.from('supply_records').insert(payload);
      if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
      else {
        await logAudit({ action: 'create', module: 'Produksi', userId: user!.id, userName: profile?.full_name, newValue: payload });
        toast({ title: 'Berhasil', description: 'Data produksi berhasil disimpan.' });
        if (newPop <= 0) {
          await supabase.from('farms').update({ status: 'inactive' as any }).eq('id', selectedFarmId).eq('status', 'active');
          toast({ title: 'Status diubah', description: 'Populasi habis, status peternakan diubah.' });
        }
        resetForm(); setDialogOpen(false); loadData();
      }
    }
    setSubmitting(false);
  }

  const formatNum = (n: number | null) => n != null ? n.toLocaleString('id-ID') : '-';
  const formatPrice = (n: number | null) => n != null ? `Rp ${n.toLocaleString('id-ID')}` : '-';

  function renderDialogContent() {
    if (step === 'select-farm') {
      return (
        <div className="space-y-4">
          <DialogHeader><DialogTitle className="font-display">Pilih Peternakan</DialogTitle></DialogHeader>
          {farms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada peternakan aktif.</p>
          ) : (
            <div className="space-y-2">
              {farms.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleFarmSelected(f.id)}
                  className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                >
                  <p className="font-medium text-foreground">{f.farm_code} — {f.name}</p>
                  <p className="text-sm text-muted-foreground">{FARM_TYPE_LABELS[f.farm_type] || f.farm_type} • {f.province}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (step === 'select-type') {
      return (
        <div className="space-y-4">
          <DialogHeader><DialogTitle className="font-display">Pilih Jenis Input</DialogTitle></DialogHeader>
          {selectedFarm && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{selectedFarm.farm_code} — {selectedFarm.name}</p>
              <p className="text-muted-foreground">{FARM_TYPE_LABELS[selectedFarm.farm_type] || selectedFarm.farm_type} • {selectedFarm.province}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTypeSelected('masuk')}
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                <ArrowDownToLine className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Ayam Masuk</p>
                <p className="text-xs text-muted-foreground">Tambah populasi baru</p>
              </div>
            </button>
            <button
              onClick={() => handleTypeSelected('keluar')}
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                <ArrowUpFromLine className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Ayam Keluar</p>
                <p className="text-xs text-muted-foreground">Terjual atau kematian</p>
              </div>
            </button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setStep('select-farm')}>← Kembali pilih peternakan</Button>
        </div>
      );
    }

    if (step === 'form-masuk') {
      return (
        <div className="space-y-4">
          <DialogHeader><DialogTitle className="font-display">{editRecord ? 'Edit Ayam Masuk' : 'Input Ayam Masuk'}</DialogTitle></DialogHeader>
          {selectedFarm && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{selectedFarm.farm_code} — {selectedFarm.name}</p>
              <p className="text-muted-foreground">{FARM_TYPE_LABELS[selectedFarm.farm_type] || selectedFarm.farm_type}</p>
            </div>
          )}
          <form onSubmit={handleSubmitMasuk} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">Tipe Ayam</Label>
                <Input value={FARM_TYPE_LABELS[selectedFarm?.farm_type ?? ''] || ''} disabled className="bg-muted" />
              </div>
              <div>
                <Label className="text-muted-foreground">Kapasitas Kandang</Label>
                <Input value={formatNum(selectedFarm?.kapasitas_kandang ?? 0)} disabled className="bg-muted" />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Populasi Sekarang</Label>
              <Input value={formatNum(currentPop)} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Ayam Masuk <span className="text-destructive">*</span></Label>
              <Input type="number" min="1" required value={ayamMasuk} onChange={e => setAyamMasuk(e.target.value)} placeholder="Jumlah ayam masuk" />
            </div>
            <div className="flex gap-2">
              {!editRecord && <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep('select-type')}>← Kembali</Button>}
              <Button type="submit" className="flex-1" disabled={submitting || !ayamMasuk}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
              </Button>
            </div>
          </form>
        </div>
      );
    }

    if (step === 'form-keluar') {
      return (
        <div className="space-y-4">
          <DialogHeader><DialogTitle className="font-display">{editRecord ? 'Edit Ayam Keluar' : 'Input Ayam Keluar'}</DialogTitle></DialogHeader>
          {selectedFarm && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{selectedFarm.farm_code} — {selectedFarm.name}</p>
              <p className="text-muted-foreground">{FARM_TYPE_LABELS[selectedFarm?.farm_type ?? ''] || selectedFarm?.farm_type}</p>
            </div>
          )}
          <form onSubmit={handleSubmitKeluar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">Tipe Ayam</Label>
                <Input value={FARM_TYPE_LABELS[selectedFarm?.farm_type ?? ''] || ''} disabled className="bg-muted" />
              </div>
              <div>
                <Label className="text-muted-foreground">Kapasitas Kandang</Label>
                <Input value={formatNum(selectedFarm?.kapasitas_kandang ?? 0)} disabled className="bg-muted" />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Populasi Sekarang</Label>
              <Input value={formatNum(currentPop)} disabled className="bg-muted" />
            </div>
            <div>
              <Label>{isEggType ? 'Telur Terjual (kg)' : 'Ayam Terjual'}</Label>
              <Input type="number" min="0" value={ayamTerjual} onChange={e => setAyamTerjual(e.target.value)} placeholder={isEggType ? 'Jumlah telur terjual (kg)' : 'Jumlah ayam terjual'} />
            </div>
            <div>
              <Label>Kematian Ayam</Label>
              <Input type="number" min="0" value={kematian} onChange={e => setKematian(e.target.value)} placeholder="Jumlah kematian" />
            </div>
            <div>
              <Label>Harga Jual (per kg, Rp)</Label>
              <Input type="number" min="0" value={hargaJual} onChange={e => setHargaJual(e.target.value)} placeholder="Harga per kg" />
            </div>
            <div className="flex gap-2">
              {!editRecord && <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep('select-type')}>← Kembali</Button>}
              <Button type="submit" className="flex-1" disabled={submitting || (!ayamTerjual && !kematian)}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
              </Button>
            </div>
          </form>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Input Produksi</h1>
          <p className="text-sm text-muted-foreground">Catat data produksi peternakan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Input Produksi Baru</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            {renderDialogContent()}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Produksi</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data produksi.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Peternakan</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jenis</th>
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
                    const isMasuk = (r.broiler_input ?? 0) > 0 && (r.broiler_sold ?? 0) === 0 && (r.broiler_death ?? 0) === 0;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(r.record_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{farm?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{farm ? (FARM_TYPE_LABELS[farm.farm_type] || farm.farm_type) : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isMasuk ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isMasuk ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                            {isMasuk ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
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
