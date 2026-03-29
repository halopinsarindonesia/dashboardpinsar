import { useState, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Download, Loader2, CalendarIcon, FileSpreadsheet, ClipboardList, DollarSign, Users, CheckCircle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

const ROLE_LABELS: Record<string, string> = { dpp: 'DPP', dpd: 'DPD', dpw: 'DPW', peternak: 'Anggota' };
const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', mixed: 'Ayam Kampung',
  other_cut: 'Ayam Pejantan', other_egg: 'Bebek', other_mixed: 'Puyuh',
};
const FARM_TYPES = Object.keys(FARM_TYPE_LABELS);
const STATUS_LABELS: Record<string, string> = { active: 'Aktif', prapasca: 'Pra/Pasca', inactive: 'Nonaktif' };
const FARM_STATUSES = Object.keys(STATUS_LABELS);

type ExportCategory = 'users' | 'produksi' | 'harga' | 'audit';
type TimeframeType = 'today' | 'week' | 'month';
type DownloadJob = { id: string; category: string; status: 'preparing' | 'ready' | 'error'; filename: string; blob?: Blob; rows: number; createdAt: Date; };

function fmt(d: Date) { return format(d, 'yyyy-MM-dd'); }
function getWeekOptions() { const w = []; for (let i = 0; i < 8; i++) { const d = subWeeks(new Date(), i); const s = startOfWeek(d, { weekStartsOn: 1 }); const e = endOfWeek(d, { weekStartsOn: 1 }); w.push({ label: `${format(s, 'd MMM', { locale: idLocale })} - ${format(e, 'd MMM yyyy', { locale: idLocale })}`, start: fmt(s), end: fmt(e) }); } return w; }
function getMonthOptions() { const m = []; for (let i = 0; i < 12; i++) { const d = subMonths(new Date(), i); const s = startOfMonth(d); const e = endOfMonth(d); m.push({ label: format(d, 'MMMM yyyy', { locale: idLocale }), start: fmt(s), end: fmt(e) }); } return m; }

function DatePickerField({ date, onSelect, label }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; label: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'd MMMM yyyy', { locale: idLocale }) : 'Pilih tanggal'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function ExportPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [dialogCategory, setDialogCategory] = useState<ExportCategory | null>(null);
  const [timeframeType, setTimeframeType] = useState<TimeframeType>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedWeek, setSelectedWeek] = useState('0');
  const [selectedMonth, setSelectedMonth] = useState('0');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [jobs, setJobs] = useState<DownloadJob[]>([]);

  // Filters for produksi & harga
  const [filterFarmTypes, setFilterFarmTypes] = useState<string[]>([...FARM_TYPES]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([...FARM_STATUSES]);

  const weekOptions = getWeekOptions();
  const monthOptions = getMonthOptions();

  function getDateRange(): { start: string; end: string } {
    if (timeframeType === 'today') { const d = selectedDate ? fmt(selectedDate) : fmt(new Date()); return { start: d, end: d }; }
    if (timeframeType === 'week') return weekOptions[parseInt(selectedWeek)] || weekOptions[0];
    return monthOptions[parseInt(selectedMonth)] || monthOptions[0];
  }

  function openDialog(cat: ExportCategory) {
    setDialogCategory(cat); setTimeframeType('today'); setSelectedDate(new Date());
    setSelectedWeek('0'); setSelectedMonth('0');
    setFilterFarmTypes([...FARM_TYPES]); setFilterStatuses([...FARM_STATUSES]);
  }

  const addJob = useCallback((cat: string, filename: string): string => {
    const id = crypto.randomUUID();
    setJobs(prev => [{ id, category: cat, status: 'preparing', filename, rows: 0, createdAt: new Date() }, ...prev]);
    return id;
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<DownloadJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  }, []);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function makeFile(rows: any[], sheetName: string, filename: string): Blob {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    if (exportFormat === 'csv') { const csv = XLSX.utils.sheet_to_csv(ws); return new Blob([csv], { type: 'text/csv' }); }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function toggleFarmType(t: string) {
    setFilterFarmTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function toggleStatus(s: string) {
    setFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function exportUsers() {
    const filename = `pengguna_peternakan_${fmt(new Date())}.${exportFormat}`;
    const jobId = addJob('Pengguna & Peternakan', filename);
    setDialogCategory(null);
    try {
      const [usersRes, farmsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role, status, province, house_address, work_address, ktp, kk'),
        supabase.from('farms').select('id, name, farm_type, province, city, district, status, owner_id, address'),
      ]);
      const users = usersRes.data ?? []; const farms = farmsRes.data ?? [];
      const rows: any[] = [];
      users.forEach((u: any) => {
        const userFarms = farms.filter((f: any) => f.owner_id === u.id);
        if (userFarms.length === 0) {
          rows.push({ Nama: u.full_name, Jabatan: ROLE_LABELS[u.role] || u.role, Email: u.email, KTP: u.ktp || '-', KK: u.kk || '-', Alamat: u.province || '-', 'Nama Peternakan': '-', 'Tipe Peternakan': '-', 'Status Peternakan': '-', 'Status User': u.status === 'approved' ? 'Aktif' : 'Tidak Aktif' });
        } else {
          userFarms.forEach((f: any) => {
            rows.push({ Nama: u.full_name, Jabatan: ROLE_LABELS[u.role] || u.role, Email: u.email, KTP: u.ktp || '-', KK: u.kk || '-', Alamat: u.province || '-', 'Nama Peternakan': f.name, 'Tipe Peternakan': FARM_TYPE_LABELS[f.farm_type] || f.farm_type, 'Status Peternakan': STATUS_LABELS[f.status] || f.status, 'Status User': u.status === 'approved' ? 'Aktif' : 'Tidak Aktif' });
          });
        }
      });
      const blob = makeFile(rows, 'Pengguna', filename);
      updateJob(jobId, { status: 'ready', blob, rows: rows.length });
      await logAudit({ action: 'create', module: 'Export', userId: user?.id, userName: profile?.full_name, newValue: { type: 'users', rows: rows.length } });
      toast({ title: 'Data siap diunduh', description: `${rows.length} baris` });
    } catch { updateJob(jobId, { status: 'error' }); toast({ title: 'Gagal mengekspor', variant: 'destructive' }); }
  }

  async function exportProduksi() {
    const { start, end } = getDateRange();
    const filename = `produksi_${start}_${end}.${exportFormat}`;
    const jobId = addJob('Data Produksi', filename);
    setDialogCategory(null);
    try {
      // Get farms matching filter
      let farmsQuery = supabase.from('farms').select('id, farm_type, status');
      const { data: farmsData } = await farmsQuery;
      const filteredFarmIds = (farmsData ?? [])
        .filter((f: any) => filterFarmTypes.includes(f.farm_type) && filterStatuses.includes(f.status))
        .map((f: any) => f.id);

      let query = supabase.from('supply_records')
        .select('record_date, broiler_population, broiler_input, broiler_sold, broiler_death, broiler_price_per_kg, layer_population, layer_input, layer_death, layer_egg_production, layer_egg_price_per_kg, layer_sold, layer_price_per_unit, farms(name, farm_code, farm_type, province)')
        .gte('record_date', start).lte('record_date', end)
        .order('record_date', { ascending: false }).limit(5000);

      if (filteredFarmIds.length > 0) query = query.in('farm_id', filteredFarmIds);

      const { data } = await query;
      const rows = (data ?? []).map((r: any) => ({
        Tanggal: r.record_date, Kode: r.farms?.farm_code || '', Farm: r.farms?.name || '', Provinsi: r.farms?.province || '',
        Tipe: FARM_TYPE_LABELS[r.farms?.farm_type] || '',
        'Pop. Broiler': r.broiler_population, 'Masuk Broiler': r.broiler_input, 'Terjual Broiler': r.broiler_sold,
        'Kematian Broiler': r.broiler_death, 'Harga Broiler/kg': r.broiler_price_per_kg,
        'Pop. Layer': r.layer_population, 'Masuk Layer': r.layer_input, 'Kematian Layer': r.layer_death,
        'Telur Terjual': r.layer_egg_production, 'Ayam Layer Terjual': r.layer_sold, 'Harga Telur/kg': r.layer_egg_price_per_kg,
        'Harga Ayam/ekor': r.layer_price_per_unit,
      }));
      const blob = makeFile(rows, 'Produksi', filename);
      updateJob(jobId, { status: 'ready', blob, rows: rows.length });
      await logAudit({ action: 'create', module: 'Export', userId: user?.id, userName: profile?.full_name, newValue: { type: 'produksi', start, end, rows: rows.length } });
      toast({ title: 'Data siap diunduh', description: `${rows.length} baris` });
    } catch { updateJob(jobId, { status: 'error' }); toast({ title: 'Gagal mengekspor', variant: 'destructive' }); }
  }

  async function exportHarga() {
    const { start, end } = getDateRange();
    const filename = `harga_${start}_${end}.${exportFormat}`;
    const jobId = addJob('Harga Per Daerah', filename);
    setDialogCategory(null);
    try {
      const { data } = await supabase.from('price_aggregation').select('*').gte('price_date', start).lte('price_date', end).order('price_date', { ascending: false });
      const rows = (data ?? []).map((r: any) => ({
        Tanggal: r.price_date, Region: r.region, Provinsi: r.province || '-',
        'Rata-rata Harga Broiler': r.avg_broiler_price, 'Rata-rata Harga Telur': r.avg_egg_price, 'Jumlah Farm': r.farm_count,
      }));
      const blob = makeFile(rows, 'Harga', filename);
      updateJob(jobId, { status: 'ready', blob, rows: rows.length });
      await logAudit({ action: 'create', module: 'Export', userId: user?.id, userName: profile?.full_name, newValue: { type: 'harga', start, end, rows: rows.length } });
      toast({ title: 'Data siap diunduh', description: `${rows.length} baris` });
    } catch { updateJob(jobId, { status: 'error' }); toast({ title: 'Gagal mengekspor', variant: 'destructive' }); }
  }

  async function exportAudit() {
    const { start, end } = getDateRange();
    const filename = `audit_log_${start}_${end}.${exportFormat}`;
    const jobId = addJob('Audit Log', filename);
    setDialogCategory(null);
    try {
      const { data } = await supabase.from('audit_logs').select('*').gte('created_at', start + 'T00:00:00').lte('created_at', end + 'T23:59:59').order('created_at', { ascending: false }).limit(5000);
      const rows = (data ?? []).map((r: any) => ({ Waktu: new Date(r.created_at).toLocaleString('id-ID'), Pengguna: r.user_name || '-', Aksi: r.action, Modul: r.module, 'Nilai Lama': r.old_value ? JSON.stringify(r.old_value) : '-', 'Nilai Baru': r.new_value ? JSON.stringify(r.new_value) : '-' }));
      const blob = makeFile(rows, 'Audit', filename);
      updateJob(jobId, { status: 'ready', blob, rows: rows.length });
      await logAudit({ action: 'create', module: 'Export', userId: user?.id, userName: profile?.full_name, newValue: { type: 'audit', start, end, rows: rows.length } });
      toast({ title: 'Data siap diunduh', description: `${rows.length} baris` });
    } catch { updateJob(jobId, { status: 'error' }); toast({ title: 'Gagal mengekspor', variant: 'destructive' }); }
  }

  function handleExport() {
    if (dialogCategory === 'users') exportUsers();
    else if (dialogCategory === 'produksi') exportProduksi();
    else if (dialogCategory === 'harga') exportHarga();
    else if (dialogCategory === 'audit') exportAudit();
  }

  const categories = [
    { key: 'users' as ExportCategory, label: 'Data Pengguna & Peternakan', desc: 'Ekspor semua data pengguna beserta peternakan mereka', icon: Users, noTimeframe: true, noFarmFilter: true },
    { key: 'produksi' as ExportCategory, label: 'Data Produksi', desc: 'Ekspor data produksi berdasarkan periode waktu', icon: FileSpreadsheet, noTimeframe: false, noFarmFilter: false },
    { key: 'harga' as ExportCategory, label: 'Harga Per Daerah', desc: 'Ekspor rata-rata harga per wilayah', icon: DollarSign, noTimeframe: false, noFarmFilter: false },
    { key: 'audit' as ExportCategory, label: 'Audit Log', desc: 'Ekspor log aktivitas sistem', icon: ClipboardList, noTimeframe: false, noFarmFilter: true },
  ];
  const currentCat = categories.find(c => c.key === dialogCategory);
  const showFarmFilter = currentCat && !currentCat.noFarmFilter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Ekspor Data</h1>
        <p className="text-sm text-muted-foreground">Unduh data dalam format Excel atau CSV</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map(cat => (
          <Card key={cat.key} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openDialog(cat.key)}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <cat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{cat.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{cat.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!dialogCategory} onOpenChange={(o) => { if (!o) setDialogCategory(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Ekspor {currentCat?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {currentCat && !currentCat.noTimeframe && (
              <>
                <div>
                  <Label>Periode Waktu</Label>
                  <Select value={timeframeType} onValueChange={(v) => setTimeframeType(v as TimeframeType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Harian</SelectItem>
                      <SelectItem value="week">Mingguan</SelectItem>
                      <SelectItem value="month">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {timeframeType === 'today' && <DatePickerField date={selectedDate} onSelect={setSelectedDate} label="Pilih Tanggal" />}
                {timeframeType === 'week' && (
                  <div><Label>Pilih Minggu</Label>
                    <Select value={selectedWeek} onValueChange={setSelectedWeek}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{weekOptions.map((w, i) => <SelectItem key={i} value={String(i)}>{w.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {timeframeType === 'month' && (
                  <div><Label>Pilih Bulan</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{monthOptions.map((m, i) => <SelectItem key={i} value={String(i)}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {showFarmFilter && (
              <>
                <div>
                  <Label className="mb-2 block">Tipe Peternakan</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FARM_TYPES.map(t => (
                      <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={filterFarmTypes.includes(t)} onCheckedChange={() => toggleFarmType(t)} />
                        {FARM_TYPE_LABELS[t]}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Status Peternakan</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FARM_STATUSES.map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={filterStatuses.includes(s)} onCheckedChange={() => toggleStatus(s)} />
                        {STATUS_LABELS[s]}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Format File</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'xlsx' | 'csv')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Siapkan Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {jobs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Download Manager</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{job.filename}</p>
                  <p className="text-xs text-muted-foreground">{job.category} • {format(job.createdAt, 'HH:mm:ss')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {job.status === 'preparing' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Menyiapkan...</span>}
                  {job.status === 'ready' && (
                    <>
                      <span className="flex items-center gap-1 text-xs text-primary"><CheckCircle className="h-3 w-3" /> {job.rows} baris</span>
                      <Button size="sm" variant="outline" onClick={() => job.blob && downloadBlob(job.blob, job.filename)}><Download className="mr-1 h-3 w-3" /> Unduh</Button>
                    </>
                  )}
                  {job.status === 'error' && <span className="text-xs text-destructive">Gagal</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
