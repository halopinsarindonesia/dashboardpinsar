import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bird } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 'Sumatera Selatan',
  'Bengkulu', 'Lampung', 'Kep. Bangka Belitung', 'Kep. Riau', 'DKI Jakarta',
  'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten',
  'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat',
  'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat',
  'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
];

type Role = 'dpp' | 'dpw' | 'peternak';

export default function RegisterPage() {
  const [role, setRole] = useState<Role>('peternak');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [province, setProvince] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('register-user', {
      body: {
        email,
        password,
        full_name: name,
        phone,
        role,
        province: role !== 'dpp' ? province : null,
        house_address: role === 'peternak' ? houseAddress : null,
        work_address: role === 'peternak' ? workAddress : null,
      },
    });

    if (error || data?.error) {
      toast({ title: 'Registrasi gagal', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Registrasi berhasil',
        description: 'Akun Anda menunggu persetujuan admin.',
      });
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:justify-center lg:px-16">
        <Bird className="mb-6 h-12 w-12 text-primary-foreground" />
        <h1 className="font-display text-3xl font-extrabold text-primary-foreground">Daftar Akun</h1>
        <p className="mt-4 text-lg text-primary-foreground/70">
          Bergabunglah dengan PINSAR untuk mengakses data perunggasan nasional.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Bird className="h-8 w-8 text-primary" />
              <span className="font-display text-xl font-bold text-foreground">PINSAR</span>
            </Link>
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              ← Kembali
            </Link>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">Registrasi</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pilih jenis akun dan lengkapi data Anda</p>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <Label>Daftar Sebagai</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dpp">DPP (Superadmin)</SelectItem>
                  <SelectItem value="dpw">DPW (Admin Provinsi)</SelectItem>
                  <SelectItem value="peternak">Peternak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-phone">Nomor Telepon</Label>
              <Input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-password">Kata Sandi</Label>
              <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {role !== 'dpp' && (
              <div>
                <Label>Provinsi</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === 'peternak' && (
              <>
                <div>
                  <Label htmlFor="house-addr">Alamat Rumah (opsional)</Label>
                  <Input id="house-addr" value={houseAddress} onChange={(e) => setHouseAddress(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="work-addr">Alamat Kerja (opsional)</Label>
                  <Input id="work-addr" value={workAddress} onChange={(e) => setWorkAddress(e.target.value)} />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Daftar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
