import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Share2, Facebook, Twitter } from 'lucide-react';

interface BlogItem {
  id: string;
  title: string;
  content: string | null;
  blog_type: string;
  publish_date: string | null;
  created_at: string;
  images: string[] | null;
}

export default function BeritaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<BlogItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('cms_blogs')
      .select('id, title, content, blog_type, publish_date, created_at, images')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        setBlog(data as BlogItem | null);
        setLoading(false);
      });
  }, [id]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const shareToFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  const shareToTwitter = () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(blog?.title ?? '')}`, '_blank');
  const shareToWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent((blog?.title ?? '') + ' ' + shareUrl)}`, '_blank');
  const shareGeneric = () => {
    if (navigator.share) {
      navigator.share({ title: blog?.title ?? '', url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  if (loading) return <div className="container py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!blog) return <div className="container py-16 text-center"><p className="text-muted-foreground">Artikel tidak ditemukan.</p><Link to="/berita" className="text-primary mt-4 inline-block">← Kembali</Link></div>;

  return (
    <div className="container py-12 max-w-3xl">
      <Link to="/berita" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke Berita
      </Link>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant={blog.blog_type === 'news' ? 'default' : 'secondary'}>
          {blog.blog_type === 'news' ? 'Berita' : 'Kegiatan'}
        </Badge>
        <span className="text-sm text-muted-foreground">{formatDate(blog.publish_date || blog.created_at)}</span>
      </div>

      <h1 className="font-display text-3xl font-bold text-foreground mb-6">{blog.title}</h1>

      {blog.images && blog.images[0] && (
        <div className="mb-6 rounded-xl overflow-hidden">
          <img src={blog.images[0]} alt={blog.title} className="w-full object-cover max-h-96" />
        </div>
      )}

      <div className="prose max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
        {blog.content}
      </div>

      {/* Share buttons */}
      <div className="mt-10 border-t pt-6">
        <p className="text-sm font-medium text-muted-foreground mb-3">Bagikan artikel ini</p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={shareToFacebook}>
            <Facebook className="mr-1.5 h-4 w-4" /> Facebook
          </Button>
          <Button size="sm" variant="outline" onClick={shareToTwitter}>
            <Twitter className="mr-1.5 h-4 w-4" /> Twitter
          </Button>
          <Button size="sm" variant="outline" onClick={shareToWhatsApp}>
            WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={shareGeneric}>
            <Share2 className="mr-1.5 h-4 w-4" /> Salin Link
          </Button>
        </div>
      </div>
    </div>
  );
}
