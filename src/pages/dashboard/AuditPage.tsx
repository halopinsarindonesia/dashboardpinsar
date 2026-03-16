import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 30;

function getFilterDates(filter: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  switch (filter) {
    case 'today': return { start: now.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    case 'week': {
      const dow = now.getDay();
      const mo = dow === 0 ? 6 : dow - 1;
      const s = new Date(now); s.setDate(now.getDate() - mo);
      return { start: s.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    }
    case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    case 'custom': return { start: customStart || now.toISOString().split('T')[0], end: customEnd || now.toISOString().split('T')[0] };
    default: return null;
  }
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => { setPage(0); }, [filter, customStart, customEnd]);

  useEffect(() => {
    loadLogs();
  }, [page, filter, customStart, customEnd]);

  async function loadLogs() {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);

    const dates = getFilterDates(filter, customStart, customEnd);
    if (dates) {
      query = query.gte('created_at', dates.start + 'T00:00:00').lte('created_at', dates.end + 'T23:59:59');
    }

    const { data, count } = await query;
    setLogs(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const actionLabel = (a: string) => a === 'create' ? 'Create' : a === 'edit' ? 'Edit' : 'Delete';
  const actionClass = (a: string) => a === 'create' ? 'status-badge-submitted' : a === 'edit' ? 'status-badge-pending' : 'status-badge-not-submitted';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Riwayat semua perubahan data</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filter === 'custom' && (
        <div className="flex gap-3">
          <div><Label>Dari</Label><Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} /></div>
          <div><Label>Sampai</Label><Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Log Aktivitas</CardTitle>
          <p className="text-xs text-muted-foreground">{totalCount} total log</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada log aktivitas.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Waktu</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pengguna</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Modul</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{log.user_name || '-'}</td>
                        <td className="px-4 py-3"><span className={actionClass(log.action)}>{actionLabel(log.action)}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{log.module}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[300px] truncate">{log.new_value ? JSON.stringify(log.new_value).substring(0, 100) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Halaman {page + 1} dari {totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
