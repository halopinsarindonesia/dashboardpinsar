import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SupplyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Input Suplai Harian</h1>
          <p className="text-sm text-muted-foreground">Catat data suplai peternakan hari ini</p>
        </div>
        <Button>Input Suplai Baru</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Suplai</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Peternakan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Populasi</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Masuk</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Terjual</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Harga/kg</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: '14 Mar 2026', farm: 'Peternakan Sejahtera', type: 'Broiler', pop: '5,200', input: '500', sold: '300', price: 'Rp 19.500' },
                  { date: '13 Mar 2026', farm: 'Peternakan Sejahtera', type: 'Broiler', pop: '5,000', input: '600', sold: '400', price: 'Rp 19.200' },
                ].map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.farm}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                    <td className="px-4 py-3 text-foreground">{row.pop}</td>
                    <td className="px-4 py-3 text-foreground">{row.input}</td>
                    <td className="px-4 py-3 text-foreground">{row.sold}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.price}</td>
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
