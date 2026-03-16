import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { Loader2, UserCircle } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  dpp: 'DPP',
  dpw: 'DPW',
  peternak: 'Anggota',
};

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', house_address: '', work_address: '' });

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', phone: profile.phone || '', house_address: profile.house_address || '', work_address: profile.work_address || '' });
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const oldValues = { full_name: profile?.full_name, phone: profile?.phone };
    const payload = { full_name: form.full_name, phone: form.phone || null, house_address: form.house_address || null, work_address: form.work_address || null };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if (error) { toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' }); }
    else {
      await logAudit({ action: 'edit', module: 'Profile', userId: user.id, userName: profile?.full_name, oldValue: oldValues, newValue: payload });
      toast({ title: 'Profil berhasil diperbarui' });
      window.location.reload();
    }
    setSaving(false);
  }

  const roleLabel = ROLE_LABELS[profile?.role ?? ''] || profile?.role;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-foreground">Profile</h1><p className="text-sm text-muted-foreground">Kelola profil akun Anda</p></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"><UserCircle className="h-10 w-10 text-primary" /></div>
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{profile?.full_name}</h3>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{roleLabel}</span>
            <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${profile?.status === 'approved' ? 'status-badge-submitted' : 'status-badge-pending'}`}>
              {profile?.status === 'approved' ? 'Terverifikasi' : profile?.status === 'pending' ? 'Menunggu Verifikasi' : 'Ditolak'}
            </span>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Edit Profil</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Nama</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
                <div><Label>Email</Label><Input value={profile?.email || ''} disabled className="bg-muted" /></div>
                <div><Label>No. Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
                <div><Label>Jabatan</Label><Input value={roleLabel} disabled className="bg-muted" /></div>
              </div>
              <div><Label>Alamat Rumah</Label><Input value={form.house_address} onChange={e => setForm({ ...form, house_address: e.target.value })} /></div>
              <div><Label>Alamat Kerja</Label><Input value={form.work_address} onChange={e => setForm({ ...form, work_address: e.target.value })} /></div>
              <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
