import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExportPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState('');

  async function exportData(type: 'users' | 'supply', format: 'csv' | 'xlsx') {
    setExporting(`${type}-${format}`);
    let rows: any[] = [];
    if (type === 'users') {
      const { data } = await supabase.from('profiles').select('full_name, email, phone, role, status, province, created_at');
      rows = (data ?? []).map((r: any) => ({ Nama: r.full_name, Email: r.email, Telepon: r.phone || '', Role: r.role, Status: r.status, Provinsi: r.province || '', Terdaftar: r.created_at }));
    } else {
      const { data } = await supabase.from('supply_records').select('record_date, broiler_population, broiler_input, broiler_sold, broiler_death, broiler_price_per_kg, layer_population, layer_input, layer_death, layer_egg_production, layer_egg_price_per_kg, farms(name, farm_code, province)').order('record_date', { ascending: false }).limit(1000);
      rows = (data ?? []).map((r: any) => ({
        Tanggal: r.record_date, Kode: r.farms?.farm_code || '', Farm: r.farms?.name || '', Provinsi: r.farms?.province || '',
        'Pop. Broiler': r.broiler_population, 'Masuk Broiler': r.broiler_input, Terjual: r.broiler_sold, 'Kematian Broiler': r.broiler_death, 'Harga Broiler': r.broiler_price_per_kg,
        'Pop. Layer': r.layer_population, 'Masuk Layer': r.layer_input, 'Kematian Layer': r.layer_death, 'Prod. Telur': r.layer_egg_production, 'Harga Telur': r.layer_egg_price_per_kg,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'users' ? 'Pengguna' : 'Panen');
    const filename = `${type === 'users' ? 'pengguna' : 'panen'}_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    } else {
      XLSX.writeFile(wb, filename);
    }

    await logAudit({ action: 'create', module: 'Export', userId: user?.id, userName: profile?.full_name, newValue: { type, format, rows: rows.length } });
    toast({ title: 'Ekspor berhasil', description: `${rows.length} baris diekspor` });
    setExporting('');
  }

  const items = [
    { key: 'users', label: 'Data Pengguna', desc: 'Ekspor daftar semua pengguna terdaftar' },
    { key: 'supply', label: 'Data Panen', desc: 'Ekspor data panen dengan filter aktif' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Ekspor Data</h1>
        <p className="text-sm text-muted-foreground">Unduh data dalam format Excel atau CSV</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="stat-card">
            <h3 className="font-display text-base font-semibold text-foreground">{item.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => exportData(item.key as any, 'xlsx')}
                disabled={!!exporting}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {exporting === `${item.key}-xlsx` ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                Excel
              </button>
              <button
                onClick={() => exportData(item.key as any, 'csv')}
                disabled={!!exporting}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
              >
                {exporting === `${item.key}-csv` ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
