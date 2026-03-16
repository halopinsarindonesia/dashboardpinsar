import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bird } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Jabatan = 'dpp' | 'dpw' | 'peternak';

export default function RegisterPage() {
  const [jabatan, setJabatan] = useState<Jabatan>('peternak');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
        role: jabatan,
        province: null,
        house_address: houseAddress || null,
        work_address: workAddress || null,
      },
    });

    if (error || data?.error) {
      const errMsg = data?.error || error?.message || '';
      const description = errMsg.includes('already been registered')
        ? 'Email sudah terdaftar, silakan gunakan email lain.'
        : errMsg;
      toast({ title: 'Registrasi gagal', description, variant: 'destructive' });
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
          <p className="mt-1 text-sm text-muted-foreground">Lengkapi data Anda untuk mendaftar</p>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <Label>Jabatan</Label>
              <Select value={jabatan} onValueChange={(v) => setJabatan(v as Jabatan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dpp">DPP</SelectItem>
                  <SelectItem value="dpw">DPW</SelectItem>
                  <SelectItem value="peternak">Anggota</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Nama</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-phone">No. Telepon</Label>
              <Input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-password">Kata Sandi</Label>
              <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            <div>
              <Label htmlFor="house-addr">Alamat Rumah (opsional)</Label>
              <Input id="house-addr" value={houseAddress} onChange={(e) => setHouseAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="work-addr">Alamat Kerja (opsional)</Label>
              <Input id="work-addr" value={workAddress} onChange={(e) => setWorkAddress(e.target.value)} />
            </div>

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
