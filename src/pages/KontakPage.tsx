import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

interface ContactInfo {
  email: string | null;
  phone: string | null;
  address: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
}

export default function KontakPage() {
  const { toast } = useToast();
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', subject: '', message: '' });

  useEffect(() => {
    supabase.from('cms_contact').select('*').limit(1).maybeSingle()
      .then(({ data }) => { setContact(data as ContactInfo | null); setLoading(false); });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({ title: 'Lengkapi semua field yang wajib diisi', variant: 'destructive' });
      return;
    }
    if (form.full_name.length > 100 || form.email.length > 255 || form.subject.length > 200 || form.message.length > 2000) {
      toast({ title: 'Input terlalu panjang', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('contact_submissions').insert({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      subject: form.subject.trim(),
      message: form.message.trim(),
    });
    if (error) {
      toast({ title: 'Gagal mengirim', description: error.message, variant: 'destructive' });
    } else {
      setSubmitted(true);
      toast({ title: 'Pesan berhasil dikirim!', description: 'Kami akan segera menghubungi Anda.' });
    }
    setSubmitting(false);
  }

  const socialLinks = [
    { key: 'facebook', label: 'Facebook', url: contact?.facebook },
    { key: 'instagram', label: 'Instagram', url: contact?.instagram },
    { key: 'twitter', label: 'Twitter / X', url: contact?.twitter },
    { key: 'youtube', label: 'YouTube', url: contact?.youtube },
  ].filter(s => s.url);

  return (
    <div className="min-h-[60vh]">
      {/* Header */}
      <section className="bg-primary/5 border-b">
        <div className="container py-12 md:py-16 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Hubungi Kami</h1>
          <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
            Punya pertanyaan, ingin bermitra, atau butuh bantuan? Jangan ragu untuk menghubungi PINSAR Indonesia. Kami siap membantu Anda.
          </p>
        </div>
      </section>

      <div className="container py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Contact Info — left column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-1">PINSAR Indonesia</h2>
              <p className="text-sm text-muted-foreground">Perhimpunan Insan Perunggasan Rakyat Indonesia</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4">
                {contact?.address && (
                  <ContactItem icon={<MapPin className="h-5 w-5" />} label="Alamat" value={contact.address} />
                )}
                {contact?.phone && (
                  <ContactItem icon={<Phone className="h-5 w-5" />} label="Telepon" value={contact.phone} href={`tel:${contact.phone}`} />
                )}
                {contact?.whatsapp && (
                  <ContactItem icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" value={contact.whatsapp} href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} />
                )}
                {contact?.email && (
                  <ContactItem icon={<Mail className="h-5 w-5" />} label="Email" value={contact.email} href={`mailto:${contact.email}`} />
                )}

                {!contact?.address && !contact?.phone && !contact?.email && !contact?.whatsapp && (
                  <p className="text-sm text-muted-foreground">Informasi kontak belum tersedia.</p>
                )}

                {socialLinks.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Media Sosial</h3>
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map(s => (
                        <a
                          key={s.key}
                          href={s.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                        >
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Form — right column */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="pt-6">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">Pesan Terkirim!</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                      Terima kasih telah menghubungi kami. Tim kami akan segera merespons pesan Anda.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => { setSubmitted(false); setForm({ full_name: '', email: '', phone: '', subject: '', message: '' }); }}>
                      Kirim Pesan Lagi
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="font-display text-lg font-semibold text-foreground">Kirim Pesan</h3>
                    <p className="text-sm text-muted-foreground -mt-2">Field bertanda * wajib diisi.</p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Nama Lengkap *</Label>
                        <Input
                          value={form.full_name}
                          onChange={e => setForm({ ...form, full_name: e.target.value })}
                          required
                          maxLength={100}
                          placeholder="Nama Anda"
                        />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          required
                          maxLength={255}
                          placeholder="email@contoh.com"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>No. Telepon</Label>
                        <Input
                          value={form.phone}
                          onChange={e => setForm({ ...form, phone: e.target.value })}
                          maxLength={20}
                          placeholder="08xx-xxxx-xxxx"
                        />
                      </div>
                      <div>
                        <Label>Subjek *</Label>
                        <Input
                          value={form.subject}
                          onChange={e => setForm({ ...form, subject: e.target.value })}
                          required
                          maxLength={200}
                          placeholder="Perihal pesan Anda"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Pesan *</Label>
                      <Textarea
                        rows={5}
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        required
                        maxLength={2000}
                        placeholder="Tulis pesan Anda di sini..."
                      />
                      <p className="mt-1 text-xs text-muted-foreground text-right">{form.message.length}/2000</p>
                    </div>

                    <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Kirim Pesan
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactItem({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex gap-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">{content}</a>;
  return content;
}
