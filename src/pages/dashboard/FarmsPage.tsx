import { useState, useEffect } from 'react';
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

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Potong',
  layer: 'Ayam Petelur',
  mixed: 'Potong & Petelur',
  other_cut: 'Unggas Potong Lain',
  other_egg: 'Unggas Petelur Lain',
  other_mixed: 'Unggas Campuran Lain',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  renovation: 'Renovasi',
  inactive: 'Nonaktif',
};

interface Farm {
  id: string;
  farm_code: string;
  name: string;
  province: string;
  city: string | null;
  farm_type: string;
  status: string;
}

export default function FarmsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [farmType, setFarmType] = useState('broiler');

  useEffect(() => { loadFarms(); }, []);

  async function loadFarms() {
    setLoading(true);
    let query = supabase.from('farms').select('id, farm_code, name, province, city, farm_type, status').order('created_at', { ascending: false });
    
    // Peternak only sees their own farms
    if (profile?.role === 'peternak' && user) {
      const { data: memberFarms } = await supabase.from('farm_members').select('farm_id').eq('user_id', user.id);
      const farmIds = memberFarms?.map(m => m.farm_id) ?? [];
      if (farmIds.length > 0) {
        query = query.in('id', farmIds);
      } else {
        setFarms([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await query;
    setFarms((data as Farm[]) ?? []);
    setLoading(false);
  }

  function generateFarmCode(prov: string, ct: string) {
    const provCode = prov.substring(0, 3).toUpperCase();
    const cityCode = ct ? ct.substring(0, 3).toUpperCase() : 'XXX';
    const num = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    return `FRM-${provCode}-${cityCode}-${num}`;
  }

  function resetForm() {
    setName(''); setProvince(''); setCity(''); setFarmType('broiler');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const farmCode = generateFarmCode(province, city);

    const { data: farm, error } = await supabase.from('farms').insert({
      name,
      province,
      city: city || null,
      farm_type: farmType as any,
      farm_code: farmCode,
      status: 'active' as any,
    }).select('id').single();

    if (error) {
      toast({ title: 'Gagal menambah peternakan', description: error.message, variant: 'destructive' });
    } else if (farm) {
      // Add current user as farm member
      await supabase.from('farm_members').insert({ farm_id: farm.id, user_id: user.id });
      toast({ title: 'Peternakan berhasil ditambahkan', description: `Kode: ${farmCode}` });
      resetForm();
      setDialogOpen(false);
      loadFarms();
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Tambah Peternakan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <Label>Nama Peternakan</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Peternakan Sejahtera" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Provinsi</Label>
                  <Input value={province} onChange={e => setProvince(e.target.value)} required placeholder="Jawa Barat" />
                </div>
                <div>
                  <Label>Kota/Kabupaten</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Bandung" />
                </div>
              </div>
              <div>
                <Label>Tipe Peternakan</Label>
                <Select value={farmType} onValueChange={setFarmType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FARM_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Peternakan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Peternakan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : farms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada peternakan. Klik "Tambah Peternakan" untuk memulai.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kode</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Provinsi</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map((farm) => (
                    <tr key={farm.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{farm.farm_code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{farm.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{farm.province}{farm.city ? `, ${farm.city}` : ''}</td>
                      <td className="px-4 py-3 text-muted-foreground">{FARM_TYPE_LABELS[farm.farm_type] || farm.farm_type}</td>
                      <td className="px-4 py-3">
                        <span className={farm.status === 'active' ? 'status-badge-submitted' : 'status-badge-pending'}>
                          {STATUS_LABELS[farm.status] || farm.status}
                        </span>
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
