import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function FarmsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Peternakan</h1>
          <p className="text-sm text-muted-foreground">Kelola data peternakan</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Peternakan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Peternakan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Provinsi</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submit</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'FRM-JBR-BDG-0001', name: 'Peternakan Sejahtera', province: 'Jawa Barat', type: 'Broiler', status: 'Aktif', submitted: true },
                  { id: 'FRM-JTG-SMG-0002', name: 'Mandiri Farm', province: 'Jawa Tengah', type: 'Layer', status: 'Aktif', submitted: false },
                  { id: 'FRM-JTM-SBY-0003', name: 'Berkah Unggas', province: 'Jawa Timur', type: 'Mixed', status: 'Renovasi', submitted: false },
                ].map((farm) => (
                  <tr key={farm.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{farm.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{farm.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{farm.province}</td>
                    <td className="px-4 py-3 text-muted-foreground">{farm.type}</td>
                    <td className="px-4 py-3">
                      <span className={farm.status === 'Aktif' ? 'status-badge-submitted' : 'status-badge-pending'}>
                        {farm.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={farm.submitted ? 'status-badge-submitted' : 'status-badge-not-submitted'}>
                        {farm.submitted ? '✓ Submitted' : '✗ Belum'}
                      </span>
                    </td>
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
