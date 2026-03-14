import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Manajemen Pengguna</h1>
        <p className="text-sm text-muted-foreground">Kelola dan verifikasi pengguna</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendaftaran Menunggu Persetujuan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Ahmad Fauzi', role: 'Peternak', province: 'Jawa Barat', date: '14 Mar 2026' },
              { name: 'Sri Wahyuni', role: 'DPW', province: 'Jawa Tengah', date: '13 Mar 2026' },
              { name: 'Budi Santoso', role: 'Peternak', province: 'Jawa Timur', date: '13 Mar 2026' },
            ].map((user) => (
              <div key={user.name} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.role} • {user.province} • {user.date}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Setujui
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                    <XCircle className="mr-1 h-4 w-4" />
                    Tolak
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
