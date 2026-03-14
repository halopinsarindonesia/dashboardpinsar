import { Warehouse, TrendingUp, Users, AlertCircle, CheckCircle, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const generalStats = [
  { label: 'Total Peternakan Aktif', value: '1,247', icon: Warehouse, color: 'text-primary' },
  { label: 'Total Ayam Tersedia', value: '3.2M', icon: ClipboardList, color: 'text-secondary' },
  { label: 'Rata-rata Harga Ayam', value: 'Rp 19.500', icon: TrendingUp, color: 'text-accent' },
  { label: 'Total Peternak', value: '856', icon: Users, color: 'text-primary' },
];

const submissionStats = [
  { label: 'Sudah Submit Hari Ini', value: '892', icon: CheckCircle, color: 'text-success' },
  { label: 'Belum Submit', value: '355', icon: AlertCircle, color: 'text-destructive' },
];

export default function DashboardOverview() {
  const { profile } = useAuth();

  // Peternak doesn't have dashboard overview, redirect to farms
  if (profile?.role === 'peternak') {
    return <Navigate to="/dashboard/farms" replace />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan data perunggasan nasional</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {generalStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Status Input Suplai Hari Ini</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {submissionStats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Statistik Ayam Potong</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Harga Hari Ini', value: 'Rp 19.500/kg' },
                { label: 'Rata-rata Harga', value: 'Rp 19.200/kg' },
                { label: 'Populasi Tersedia', value: '2.1M' },
                { label: 'Terjual (MTD)', value: '450K' },
                { label: 'Peternakan Aktif', value: '784' },
                { label: 'Tidak Aktif', value: '45' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-display text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Statistik Telur Ayam</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Harga Hari Ini', value: 'Rp 28.000/kg' },
                { label: 'Rata-rata Harga', value: 'Rp 27.500/kg' },
                { label: 'Populasi Petelur', value: '1.1M' },
                { label: 'Produksi Telur (MTD)', value: '12.5M' },
                { label: 'Peternakan Aktif', value: '463' },
                { label: 'Tidak Aktif', value: '22' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-display text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
