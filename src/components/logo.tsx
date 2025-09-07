import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'flex items-center gap-2 text-xl font-bold font-headline text-primary-foreground',
        className
      )}
    >
      <Newspaper className="h-7 w-7" />
      <span>Prayas News Terminal</span>
    </Link>
  );
}
