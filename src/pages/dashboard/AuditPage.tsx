import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Riwayat semua perubahan data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Aktivitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
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
                {[
                  { time: '14:23', user: 'Ahmad F.', action: 'Create', module: 'Supply Data', detail: 'Input suplai FRM-JBR-BDG-0001' },
                  { time: '13:45', user: 'Admin DPP', action: 'Edit', module: 'Farm', detail: 'Update status peternakan' },
                  { time: '12:10', user: 'Admin DPP', action: 'Create', module: 'User', detail: 'Approve user Sri Wahyuni' },
                ].map((log, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{log.time}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{log.user}</td>
                    <td className="px-4 py-3">
                      <span className={
                        log.action === 'Create' ? 'status-badge-submitted' :
                        log.action === 'Edit' ? 'status-badge-pending' : 'status-badge-not-submitted'
                      }>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.module}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
