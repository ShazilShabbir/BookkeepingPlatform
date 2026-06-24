import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import { useUserStore } from '@/lib/store';
import CustomerSwitcher from '@/components/CustomerSwitcher';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import toast from 'react-hot-toast';

interface TopBarProps {
  onToggleSidebar: () => void;
  breadcrumb?: { label: string; href?: string }[];
}

export default function TopBar({ onToggleSidebar, breadcrumb }: TopBarProps) {
  const { data: session } = useSession();
  const user = useUserStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const handleSearchSubmit = useCallback((e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/dashboard?tab=transactions&q=${encodeURIComponent(q)}`);
  }, [searchQuery, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/login' });
      toast.success('Logged out');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <header className="h-[var(--topbar-height)] bg-white border-b border-surface-200 sticky top-0 z-30">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumb.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && (
                    <svg className="w-3.5 h-3.5 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                  {item.href ? (
                    <a href={item.href} className="text-surface-500 hover:text-surface-700 truncate transition-colors">
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-surface-900 font-medium truncate">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <div className="hidden sm:flex items-center flex-1 max-w-xs ml-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                placeholder="Search transactions..."
                aria-label="Search transactions"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(e); }}
                className="w-full pl-9 pr-3 h-9 text-sm bg-surface-100 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all placeholder:text-surface-400"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-surface-400 bg-surface-50 border border-surface-200 rounded">
                ⌘K
              </kbd>
            </form>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user && <CustomerSwitcher />}

          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 sm:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 min-h-10 rounded-lg hover:bg-surface-50 transition-colors duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-surface-700 leading-tight truncate max-w-[120px]">
                  {user?.name || user?.email || 'User'}
                </p>
                {user?.name && (
                  <p className="text-xs text-surface-400 truncate max-w-[120px]">{user.email}</p>
                )}
              </div>
              <svg className="w-4 h-4 text-surface-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-elevated border border-surface-200 py-1 z-20 animate-scale-in">
                <div className="px-4 py-3 border-b border-surface-100">
                  <p className="text-sm font-semibold text-surface-900 truncate">{user?.name || user?.email || 'User'}</p>
                  <p className="text-xs text-surface-500 truncate mt-0.5">{user?.email}</p>
                  <div className="mt-2"><SubscriptionBadge /></div>
                </div>
                <a
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </a>
                <a
                  href="/support"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                  <span>Help &amp; Support</span>
                </a>
                <hr className="border-surface-100 mx-3" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <form onSubmit={handleSearchSubmit} className="sm:hidden px-4 pb-3 border-t border-surface-100 animate-slide-down">
          <div className="relative mt-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              placeholder="Search transactions..."
              aria-label="Search transactions"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
        </form>
      )}
    </header>
  );
}