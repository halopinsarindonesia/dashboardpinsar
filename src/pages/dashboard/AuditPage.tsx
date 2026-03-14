import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false); });
  }, []);

  const actionLabel = (a: string) => a === 'create' ? 'Create' : a === 'edit' ? 'Edit' : 'Delete';
  const actionClass = (a: string) => a === 'create' ? 'status-badge-submitted' : a === 'edit' ? 'status-badge-pending' : 'status-badge-not-submitted';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Riwayat semua perubahan data</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Log Aktivitas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada log aktivitas.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
