import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import { Plus, Loader2, CheckCircle, XCircle, Pencil } from 'lucide-react';

const PROVINCES = [
  'Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung',
  'Kep. Bangka Belitung','Kep. Riau','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta',
  'Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat',
  'Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara',
  'Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku',
  'Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya',
];

const ROLE_LABELS: Record<string, string> = { dpp: 'DPP', dpw: 'DPW', peternak: 'Peternak' };
const STATUS_LABELS: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

interface UserProfile {
  id: string; full_name: string; email: string; phone: string | null;
  role: string; status: string; province: string | null; created_at: string;
  house_address?: string | null; work_address?: string | null;
}

export default function UsersPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('peternak');
  const [formProvince, setFormProvince] = useState('');
  const [formStatus, setFormStatus] = useState('approved');

  const isDPP = profile?.role === 'dpp';
  const isDPW = profile?.role === 'dpw';

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

    // DPW can only see DPW and peternak
    if (isDPW) {
      query = query.in('role', ['dpw', 'peternak']);
    }

    const { data } = await query;
    // Sort: pending first, then by created_at desc
    const sorted = (data as UserProfile[] ?? []).sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).filter(u => u.status !== 'rejected'); // Hide rejected

    setUsers(sorted);
    setLoading(false);
  }

  function resetForm() {
    setFormName(''); setFormEmail(''); setFormPhone(''); setFormPassword('');
    setFormRole('peternak'); setFormProvince(''); setFormStatus('approved'); setEditUser(null);
  }

  function openEdit(u: UserProfile) {
    setEditUser(u);
    setFormName(u.full_name);
    setFormEmail(u.email);
    setFormPhone(u.phone || '');
    setFormRole(u.role);
    setFormProvince(u.province || '');
    setFormStatus(u.status);
    setAddDialogOpen(true);
  }

  async function handleApprove(u: UserProfile) {
    const { error } = await supabase.from('profiles').update({ status: 'approved' as any }).eq('id', u.id);
    if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
    await logAudit({ action: 'edit', module: 'User', userId: user?.id, userName: profile?.full_name, oldValue: { status: u.status }, newValue: { status: 'approved', user: u.full_name } });
    toast({ title: `${u.full_name} disetujui` }); loadUsers();
  }

  async function handleReject(u: UserProfile) {
    const { error } = await supabase.from('profiles').update({ status: 'rejected' as any }).eq('id', u.id);
    if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); return; }
    await logAudit({ action: 'edit', module: 'User', userId: user?.id, userName: profile?.full_name, oldValue: { status: u.status }, newValue: { status: 'rejected', user: u.full_name } });
    toast({ title: `${u.full_name} ditolak` }); loadUsers();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (isDPW && formRole === 'dpp') {
      toast({ title: 'DPW tidak bisa membuat user DPP', variant: 'destructive' });
      setSubmitting(false); return;
    }

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email: formEmail, password: formPassword, full_name: formName, phone: formPhone, role: formRole, province: formProvince, status: formStatus },
    });

    if (error || data?.error) {
      toast({ title: 'Gagal', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pengguna berhasil ditambahkan' });
      resetForm(); setAddDialogOpen(false); loadUsers();
    }
    setSubmitting(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSubmitting(true);

    const payload: any = { full_name: formName, phone: formPhone || null, role: formRole as any, province: formProvince || null, status: formStatus as any };
    const { error } = await supabase.from('profiles').update(payload).eq('id', editUser.id);
    if (error) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
    else {
      // Update user_roles if role changed
      if (formRole !== editUser.role) {
        await supabase.from('user_roles').update({ role: formRole as any }).eq('user_id', editUser.id);
      }
      await logAudit({ action: 'edit', module: 'User', userId: user?.id, userName: profile?.full_name, oldValue: editUser, newValue: { ...payload, id: editUser.id } });
      toast({ title: 'Pengguna berhasil diperbarui' });
      resetForm(); setAddDialogOpen(false); loadUsers();
    }
    setSubmitting(false);
  }

  const availableRoles = isDPW ? [['dpw', 'DPW'], ['peternak', 'Peternak']] : [['dpp', 'DPP'], ['dpw', 'DPW'], ['peternak', 'Peternak']];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Manajemen Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola dan verifikasi pengguna</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Tambah Pengguna</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display">{editUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle></DialogHeader>
            <form onSubmit={editUser ? handleEdit : handleAdd} className="space-y-4">
              <div><Label>Nama Lengkap</Label><Input value={formName} onChange={e => setFormName(e.target.value)} required /></div>
              <div><Label>Email</Label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required disabled={!!editUser} className={editUser ? 'bg-muted' : ''} /></div>
              {!editUser && <div><Label>Kata Sandi</Label><Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} required minLength={6} /></div>}
              <div><Label>No. Telepon</Label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role</Label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{availableRoles.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Disetujui</SelectItem>
                      <SelectItem value="pending">Menunggu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formRole !== 'dpp' && (
                <div>
                  <Label>Provinsi</Label>
                  <Select value={formProvince} onValueChange={setFormProvince}>
                    <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                    <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Pengguna</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada pengguna.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Provinsi</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Terdaftar</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3"><span className="status-badge-pending">{ROLE_LABELS[u.role]}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{u.province || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={u.status === 'approved' ? 'status-badge-submitted' : u.status === 'pending' ? 'status-badge-pending' : 'status-badge-not-submitted'}>
                          {STATUS_LABELS[u.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {u.status === 'pending' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => handleApprove(u)} title="Setujui">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleReject(u)} title="Tolak">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(u)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
