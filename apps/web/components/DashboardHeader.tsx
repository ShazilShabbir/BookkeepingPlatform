import { useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import NotificationBell from '@/components/NotificationBell';
import UserMenu from '@/components/UserMenu';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchRef.current?.value.trim();
    if (q) router.push(`/dashboard?tab=transactions&search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 truncate">{title}</h1>
        <p className="text-sm text-surface-500 truncate">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <form onSubmit={handleSearch} className="hidden sm:block relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search...  ⌘K"
            className="w-48 lg:w-64 pl-9 pr-3 py-1.5 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-surface-400"
          />
        </form>
        <NotificationBell />
        <UserMenu />
      </div>
    </div>
  );
}
