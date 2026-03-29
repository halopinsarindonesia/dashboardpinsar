import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LanguageToggle({ variant = 'ghost', className = '' }: { variant?: 'ghost' | 'outline'; className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <Button
      variant={variant}
      size="sm"
      className={`gap-1.5 text-xs font-medium ${className}`}
      onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === 'id' ? 'EN' : 'ID'}
    </Button>
  );
}
