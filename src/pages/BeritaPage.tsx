import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Warehouse } from 'lucide-react';

interface BlogItem {
  id: string;
  title: string;
  content: string | null;
  blog_type: string;
  publish_date: string | null;
  created_at: string;
  images: string[] | null;
}

export default function BeritaPage() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('cms_blogs')
      .select('id, title, content, blog_type, publish_date, created_at, images')
      .eq('status', 'active')
      .order('publish_date', { ascending: false })
      .then(({ data }) => {
        setBlogs((data as BlogItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="px-4 sm:container py-12 overflow-hidden">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Berita & Kegiatan</h1>
      <p className="text-muted-foreground mb-8">Informasi terbaru dari PINSAR Indonesia</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : blogs.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">Belum ada artikel.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map(item => (
            <Link key={item.id} to={`/berita/${item.id}`} className="group">
              <article className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden min-w-0">
                <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                  {item.images && item.images[0] ? (
                    <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                  ) : item.blog_type === 'news' ? (
                    <BarChart3 className="h-10 w-10 text-primary/30" />
                  ) : (
                    <Warehouse className="h-10 w-10 text-accent/30" />
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={item.blog_type === 'news' ? 'default' : 'secondary'}>
                      {item.blog_type === 'news' ? 'Berita' : 'Kegiatan'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(item.publish_date || item.created_at)}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{item.content}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
