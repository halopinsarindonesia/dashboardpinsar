import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '@/assets/pinsar-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

type Jabatan = 'dpp' | 'dpd' | 'dpw' | 'peternak';

export default function RegisterPage() {
  const [jabatan, setJabatan] = useState<Jabatan>('peternak');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [ktp, setKtp] = useState('');
  const [kk, setKk] = useState('');
  const [ktpError, setKtpError] = useState('');
  const [kkError, setKkError] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const validateKtpKk = () => {
    let valid = true;
    if (!/^\d{16}$/.test(ktp)) {
      setKtpError(t('Nomor KTP harus tepat 16 digit', 'KTP number must be exactly 16 digits'));
      valid = false;
    } else setKtpError('');
    if (!/^\d{16}$/.test(kk)) {
      setKkError(t('Nomor KK harus tepat 16 digit', 'KK number must be exactly 16 digits'));
      valid = false;
    } else setKkError('');
    return valid;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateKtpKk()) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('register-user', {
      body: {
        email, password, full_name: name, phone, role: jabatan,
        province: null, house_address: houseAddress || null, work_address: workAddress || null,
        ktp, kk,
      },
    });

    if (error || data?.error) {
      const errMsg = data?.error || error?.message || '';
      const description = errMsg.includes('already been registered')
        ? t('Email sudah terdaftar, silakan gunakan email lain.', 'Email already registered, please use a different email.')
        : errMsg;
      toast({ title: t('Registrasi gagal', 'Registration failed'), description, variant: 'destructive' });
    } else {
      toast({ title: t('Registrasi berhasil', 'Registration successful'), description: t('Akun Anda menunggu persetujuan admin.', 'Your account is pending admin approval.') });
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:justify-center lg:px-16">
        <img src={logo} alt="PINSAR Indonesia" className="mb-6 h-20 w-auto object-contain" />
        <h1 className="font-display text-3xl font-extrabold text-primary-foreground">{t('Daftar Anggota', 'Register Member')}</h1>
        <p className="mt-4 text-lg text-primary-foreground/70">
          {t('Langkah awal untuk mendukung Industri Perunggasan lebih professional dan transparan.', 'The first step to support a more professional and transparent Poultry Industry.')}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="PINSAR" className="h-10 w-auto object-contain" />
            </Link>
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              ← {t('Kembali', 'Back')}
            </Link>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">{t('Registrasi', 'Registration')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('Lengkapi data Anda untuk mendaftar', 'Complete your data to register')}</p>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <Label>{t('Jabatan', 'Position')}</Label>
              <Select value={jabatan} onValueChange={(v) => setJabatan(v as Jabatan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dpp">DPP</SelectItem>
                  <SelectItem value="dpd">DPD</SelectItem>
                  <SelectItem value="dpw">DPW</SelectItem>
                  <SelectItem value="peternak">{t('Anggota', 'Member')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">{t('Nama', 'Name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-phone">{t('No. Telepon', 'Phone Number')}</Label>
              <Input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="reg-ktp">{t('No. KTP', 'ID Card Number')} <span className="text-destructive">*</span></Label>
              <Input id="reg-ktp" value={ktp} onChange={(e) => { setKtp(e.target.value.replace(/\D/g, '').slice(0, 16)); setKtpError(''); }} required placeholder="16 digit" maxLength={16} />
              {ktpError && <p className="text-xs text-destructive mt-1">{ktpError}</p>}
            </div>

            <div>
              <Label htmlFor="reg-kk">{t('No. KK', 'Family Card Number')} <span className="text-destructive">*</span></Label>
              <Input id="reg-kk" value={kk} onChange={(e) => { setKk(e.target.value.replace(/\D/g, '').slice(0, 16)); setKkError(''); }} required placeholder="16 digit" maxLength={16} />
              {kkError && <p className="text-xs text-destructive mt-1">{kkError}</p>}
            </div>

            <div>
              <Label htmlFor="reg-password">{t('Kata Sandi', 'Password')}</Label>
              <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            <div>
              <Label htmlFor="house-addr">{t('Alamat Rumah (opsional)', 'Home Address (optional)')}</Label>
              <Input id="house-addr" value={houseAddress} onChange={(e) => setHouseAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="work-addr">{t('Alamat Kerja (opsional)', 'Work Address (optional)')}</Label>
              <Input id="work-addr" value={workAddress} onChange={(e) => setWorkAddress(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('Memproses...', 'Processing...') : t('Daftar', 'Register')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('Sudah punya akun?', 'Already have an account?')}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">{t('Masuk', 'Login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
