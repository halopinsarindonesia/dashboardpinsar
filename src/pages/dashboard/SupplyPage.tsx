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
import { Plus, Loader2 } from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  farm_code: string;
  farm_type: string;
  status: string;
  province: string;
  city: string | null;
  district: string | null;
}

interface SupplyRecord {
  id: string;
  record_date: string;
  farm_id: string;
  broiler_population: number | null;
  broiler_input: number | null;
  broiler_sold: number | null;
  broiler_death: number | null;
  broiler_price_per_kg: number | null;
  layer_population: number | null;
  layer_input: number | null;
  layer_death: number | null;
  layer_egg_production: number | null;
  layer_egg_price_per_kg: number | null;
  farms?: Farm;
}

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Potong',
  layer: 'Ayam Petelur',
  mixed: 'Potong & Petelur',
  other_cut: 'Unggas Potong Lain',
  other_egg: 'Unggas Petelur Lain',
  other_mixed: 'Unggas Campuran Lain',
};

export default function SupplyPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [records, setRecords] = useState<SupplyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [broilerPopulation, setBroilerPopulation] = useState('');
  const [broilerInput, setBroilerInput] = useState('');
  const [broilerSold, setBroilerSold] = useState('');
  const [broilerDeath, setBroilerDeath] = useState('');
  const [broilerPrice, setBroilerPrice] = useState('');
  const [layerPopulation, setLayerPopulation] = useState('');
  const [layerInput, setLayerInput] = useState('');
  const [layerDeath, setLayerDeath] = useState('');
  const [layerEggProduction, setLayerEggProduction] = useState('');
  const [layerEggPrice, setLayerEggPrice] = useState('');

  const selectedFarm = useMemo(() => farms.find(f => f.id === selectedFarmId), [farms, selectedFarmId]);
  const isBroiler = selectedFarm && ['broiler', 'mixed', 'other_cut', 'other_mixed'].includes(selectedFarm.farm_type);
  const isLayer = selectedFarm && ['layer', 'mixed', 'other_egg', 'other_mixed'].includes(selectedFarm.farm_type);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [farmsRes, recordsRes] = await Promise.all([
      supabase.from('farms').select('id, name, farm_code, farm_type, status, province, city, district').eq('status', 'active'),
      supabase.from('supply_records').select('*, farms(name, farm_code, farm_type, province)').order('record_date', { ascending: false }).limit(50),
    ]);
    if (farmsRes.data) setFarms(farmsRes.data as Farm[]);
    if (recordsRes.data) setRecords(recordsRes.data as any[]);
    setLoading(false);
  }

  function resetForm() {
    setSelectedFarmId('');
    setBroilerPopulation(''); setBroilerInput(''); setBroilerSold(''); setBroilerDeath(''); setBroilerPrice('');
    setLayerPopulation(''); setLayerInput(''); setLayerDeath(''); setLayerEggProduction(''); setLayerEggPrice('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmId) return;
    setSubmitting(true);

    const today = new Date().toISOString().split('T')[0];

    // Check if record exists for today
    const { data: existing } = await supabase
      .from('supply_records')
      .select('id')
      .eq('farm_id', selectedFarmId)
      .eq('record_date', today)
      .maybeSingle();

    if (existing) {
      toast({ title: 'Sudah ada data', description: 'Farm ini sudah submit hari ini. Silakan edit data yang sudah ada.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Validate populations
    const bPop = Number(broilerPopulation) || 0;
    const bSold = Number(broilerSold) || 0;
    const bDeath = Number(broilerDeath) || 0;
    const lPop = Number(layerPopulation) || 0;
    const lDeath = Number(layerDeath) || 0;

    if (isBroiler && (bSold > bPop || bDeath > bPop || bPop - bSold - bDeath < 0)) {
      toast({ title: 'Validasi gagal', description: 'Terjual + kematian tidak boleh melebihi populasi ayam potong.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }
    if (isLayer && (lDeath > lPop)) {
      toast({ title: 'Validasi gagal', description: 'Kematian tidak boleh melebihi populasi ayam petelur.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const payload: any = {
      farm_id: selectedFarmId,
      record_date: today,
      submitted_by: profile?.id,
    };

    if (isBroiler) {
      payload.broiler_population = bPop;
      payload.broiler_input = Number(broilerInput) || 0;
      payload.broiler_sold = bSold;
      payload.broiler_death = bDeath;
      payload.broiler_price_per_kg = Number(broilerPrice) || null;
    }
    if (isLayer) {
      payload.layer_population = lPop;
      payload.layer_input = Number(layerInput) || 0;
      payload.layer_death = lDeath;
      payload.layer_egg_production = Number(layerEggProduction) || 0;
      payload.layer_egg_price_per_kg = Number(layerEggPrice) || null;
    }

    const { error } = await supabase.from('supply_records').insert(payload);

    if (error) {
      toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil', description: 'Data suplai berhasil disimpan.' });
      resetForm();
      setDialogOpen(false);
      loadData();
    }
    setSubmitting(false);
  }

  const formatNum = (n: number | null) => n != null ? n.toLocaleString('id-ID') : '-';
  const formatPrice = (n: number | null) => n != null ? `Rp ${n.toLocaleString('id-ID')}` : '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Input Suplai Harian</h1>
          <p className="text-sm text-muted-foreground">Catat data suplai peternakan hari ini</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Input Suplai Baru</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Input Suplai Harian</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Peternakan</Label>
                <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
                  <SelectTrigger><SelectValue placeholder="Pilih peternakan" /></SelectTrigger>
                  <SelectContent>
                    {farms.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.farm_code} — {f.name} ({FARM_TYPE_LABELS[f.farm_type]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFarm && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium text-foreground">{selectedFarm.name}</p>
                  <p className="text-muted-foreground">{FARM_TYPE_LABELS[selectedFarm.farm_type]} • {selectedFarm.province}{selectedFarm.city ? `, ${selectedFarm.city}` : ''}</p>
                </div>
              )}

              {isBroiler && (
                <fieldset className="space-y-3 rounded-lg border p-4">
                  <legend className="px-2 font-display text-sm font-semibold text-foreground">Ayam Potong (Broiler)</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Populasi Saat Ini</Label><Input type="number" min="0" value={broilerPopulation} onChange={e => setBroilerPopulation(e.target.value)} required /></div>
                    <div><Label>Ayam Masuk</Label><Input type="number" min="0" value={broilerInput} onChange={e => setBroilerInput(e.target.value)} /></div>
                    <div><Label>Ayam Terjual</Label><Input type="number" min="0" value={broilerSold} onChange={e => setBroilerSold(e.target.value)} /></div>
                    <div><Label>Kematian</Label><Input type="number" min="0" value={broilerDeath} onChange={e => setBroilerDeath(e.target.value)} /></div>
                  </div>
                  <div><Label>Harga per kg (Rp)</Label><Input type="number" min="0" value={broilerPrice} onChange={e => setBroilerPrice(e.target.value)} /></div>
                </fieldset>
              )}

              {isLayer && (
                <fieldset className="space-y-3 rounded-lg border p-4">
                  <legend className="px-2 font-display text-sm font-semibold text-foreground">Ayam Petelur (Layer)</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Populasi Saat Ini</Label><Input type="number" min="0" value={layerPopulation} onChange={e => setLayerPopulation(e.target.value)} required /></div>
                    <div><Label>Ayam Masuk</Label><Input type="number" min="0" value={layerInput} onChange={e => setLayerInput(e.target.value)} /></div>
                    <div><Label>Kematian</Label><Input type="number" min="0" value={layerDeath} onChange={e => setLayerDeath(e.target.value)} /></div>
                    <div><Label>Produksi Telur</Label><Input type="number" min="0" value={layerEggProduction} onChange={e => setLayerEggProduction(e.target.value)} /></div>
                  </div>
                  <div><Label>Harga Telur per kg (Rp)</Label><Input type="number" min="0" value={layerEggPrice} onChange={e => setLayerEggPrice(e.target.value)} /></div>
                </fieldset>
              )}

              <Button type="submit" className="w-full" disabled={submitting || !selectedFarmId}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Data Suplai'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Suplai</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data suplai.</p>
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
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Harga/kg</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const farm = r.farms as any;
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
