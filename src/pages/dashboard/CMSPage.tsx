import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Image, FileText, Phone, Globe, Handshake } from 'lucide-react';

// ─── Banner Management ─────────────────────────────
function BannerTab() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadBanners(); }, []);

  async function loadBanners() {
    setLoading(true);
    const { data } = await supabase.from('cms_banners').select('*').order('sort_order');
    setBanners(data ?? []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('cms_banners').insert({ title, image_url: imageUrl, link_url: linkUrl || null, sort_order: banners.length });
    if (error) toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Banner ditambahkan' }); setDialogOpen(false); setTitle(''); setImageUrl(''); setLinkUrl(''); loadBanners(); }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('cms_banners').delete().eq('id', id);
    if (!error) { toast({ title: 'Banner dihapus' }); loadBanners(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Kelola banner halaman utama</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Banner</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Banner</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><Label>Judul</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><Label>URL Gambar</Label><Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} required placeholder="https://..." /></div>
              <div><Label>URL Link (opsional)</Label><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : banners.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada banner.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {banners.map(b => (
            <div key={b.id} className="relative overflow-hidden rounded-lg border bg-card">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {b.image_url ? <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" /> : <Image className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="flex items-center justify-between p-3">
                <p className="text-sm font-medium text-foreground">{b.title || 'Tanpa judul'}</p>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── About Management ───────────────────────────────
function AboutTab() {
  const { toast } = useToast();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const SECTION_LABELS: Record<string, string> = {
    sejarah: 'Sejarah', visi_misi: 'Visi & Misi', struktur: 'Struktur Organisasi', legalitas: 'Legalitas',
  };

  useEffect(() => { loadAbout(); }, []);

  async function loadAbout() {
    setLoading(true);
    const { data } = await supabase.from('cms_about').select('*');
    if (data && data.length === 0) {
      const defaults = Object.keys(SECTION_LABELS).map(s => ({ section: s, content: '' }));
      await supabase.from('cms_about').insert(defaults);
      const { data: seeded } = await supabase.from('cms_about').select('*');
      setSections(seeded ?? []);
    } else {
      setSections(data ?? []);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!editId) return;
    setSaving(true);
    const { error } = await supabase.from('cms_about').update({ content: editContent }).eq('id', editId);
    if (error) toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Tersimpan' }); setEditId(null); loadAbout(); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {sections.map(s => (
        <Card key={s.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{SECTION_LABELS[s.section] || s.section}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => { setEditId(s.id); setEditContent(s.content || ''); }}>
              <Pencil className="mr-1 h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          {editId === s.id ? (
            <CardContent className="space-y-3">
              <Textarea rows={6} value={editContent} onChange={e => setEditContent(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Batal</Button>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.content || 'Belum ada konten.'}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Contact Management ─────────────────────────────
function ContactTab() {
  const { toast } = useToast();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: '', email: '', address: '', whatsapp: '', facebook: '', instagram: '', twitter: '', youtube: '' });

  useEffect(() => { loadContact(); }, []);

  async function loadContact() {
    setLoading(true);
    let { data } = await supabase.from('cms_contact').select('*').limit(1).maybeSingle();
    if (!data) {
      await supabase.from('cms_contact').insert({ phone: '', email: '', address: '' });
      const res = await supabase.from('cms_contact').select('*').limit(1).maybeSingle();
      data = res.data;
    }
    if (data) {
      setContact(data);
      setForm({ phone: data.phone || '', email: data.email || '', address: data.address || '', whatsapp: (data as any).whatsapp || '', facebook: data.facebook || '', instagram: data.instagram || '', twitter: data.twitter || '', youtube: data.youtube || '' });
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) return;
    setSaving(true);
    const { error } = await supabase.from('cms_contact').update(form).eq('id', contact.id);
    if (error) toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    else toast({ title: 'Kontak tersimpan' });
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      </div>
      <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="628xxxxxxxxxx" /></div>
      <div><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
      <h3 className="font-display text-sm font-semibold text-foreground pt-2">Media Sosial</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Facebook</Label><Input value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} /></div>
        <div><Label>Instagram</Label><Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} /></div>
        <div><Label>Twitter</Label><Input value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} /></div>
        <div><Label>YouTube</Label><Input value={form.youtube} onChange={e => setForm({ ...form, youtube: e.target.value })} /></div>
      </div>
      <Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Simpan Kontak</Button>
    </form>
  );
}

// ─── Blog Management ────────────────────────────────
function BlogTab() {
  const { toast } = useToast();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [blogType, setBlogType] = useState('news');
  const [status, setStatus] = useState('active');

  useEffect(() => { loadBlogs(); }, []);

  async function loadBlogs() {
    setLoading(true);
    const { data } = await supabase.from('cms_blogs').select('*').order('created_at', { ascending: false });
    setBlogs(data ?? []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('cms_blogs').insert({ title, content, blog_type: blogType, status, publish_date: new Date().toISOString() });
    if (error) toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Blog ditambahkan' }); setDialogOpen(false); setTitle(''); setContent(''); loadBlogs(); }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('cms_blogs').delete().eq('id', id);
    if (!error) { toast({ title: 'Blog dihapus' }); loadBlogs(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Kelola berita dan kegiatan</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Artikel</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Artikel Baru</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><Label>Judul</Label><Input value={title} onChange={e => setTitle(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipe</Label>
                  <Select value={blogType} onValueChange={setBlogType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">Berita</SelectItem>
                      <SelectItem value="activity">Kegiatan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Konten</Label><Textarea rows={8} value={content} onChange={e => setContent(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Artikel'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : blogs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada artikel.</p>
      ) : (
        <div className="space-y-3">
          {blogs.map(b => (
            <div key={b.id} className="flex items-start justify-between rounded-lg border p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${b.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {b.blog_type === 'news' ? 'Berita' : 'Kegiatan'}
                  </span>
                  <span className={`text-xs ${b.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>{b.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                </div>
                <h3 className="mt-1 font-medium text-foreground">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{b.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Partners Management ────────────────────────────
function PartnersTab() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadPartners(); }, []);

  async function loadPartners() {
    setLoading(true);
    const { data } = await supabase.from('cms_partners').select('*').order('sort_order');
    setPartners(data ?? []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('cms_partners').insert({ name, logo_url: logoUrl, sort_order: partners.length });
    if (error) toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Mitra ditambahkan' }); setDialogOpen(false); setName(''); setLogoUrl(''); loadPartners(); }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('cms_partners').delete().eq('id', id);
    if (!error) { toast({ title: 'Mitra dihapus' }); loadPartners(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Kelola mitra (maks. 10 ditampilkan, 5 per baris)</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Tambah Mitra</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Mitra</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><Label>Nama Perusahaan</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div><Label>URL Logo</Label><Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} required placeholder="https://..." /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : partners.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada mitra.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {partners.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="h-10 w-10 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
                <img src={p.logo_url} alt={p.name} className="h-full w-full object-contain" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground truncate">{p.name}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main CMS Page ──────────────────────────────────
export default function CMSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">CMS</h1>
        <p className="text-sm text-muted-foreground">Kelola konten landing page</p>
      </div>
      <Tabs defaultValue="banner">
        <TabsList className="flex-wrap">
          <TabsTrigger value="banner"><Image className="mr-1.5 h-4 w-4" />Banner</TabsTrigger>
          <TabsTrigger value="about"><FileText className="mr-1.5 h-4 w-4" />Tentang Kami</TabsTrigger>
          <TabsTrigger value="contact"><Phone className="mr-1.5 h-4 w-4" />Kontak</TabsTrigger>
          <TabsTrigger value="blog"><Globe className="mr-1.5 h-4 w-4" />Blog</TabsTrigger>
          <TabsTrigger value="partners"><Handshake className="mr-1.5 h-4 w-4" />Mitra</TabsTrigger>
        </TabsList>
        <TabsContent value="banner"><BannerTab /></TabsContent>
        <TabsContent value="about"><AboutTab /></TabsContent>
        <TabsContent value="contact"><ContactTab /></TabsContent>
        <TabsContent value="blog"><BlogTab /></TabsContent>
        <TabsContent value="partners"><PartnersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
