import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logopinsar.jpg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        await supabase.auth.signOut({ scope: 'local' });
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: 'Login gagal', description: error.message, variant: 'destructive' });
      } else {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-secondary lg:flex lg:flex-col lg:justify-center lg:px-16">
        <img src={logo} alt="PINSAR Indonesia" className="mb-6 h-20 w-auto object-contain self-start" />
        <h1 className="font-display text-3xl font-extrabold text-secondary-foreground">
          PINSAR Indonesia
        </h1>
        <p className="mt-4 text-lg text-secondary-foreground/70">
          Platform data perunggasan nasional. Pantau harga, kelola peternakan, dan laporkan suplai harian.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="PINSAR" className="h-10 w-auto object-contain" />
            </Link>
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              ← Kembali
            </Link>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">Masuk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan email dan kata sandi Anda
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">Daftar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
