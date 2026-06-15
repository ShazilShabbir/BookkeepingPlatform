import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useUserStore } from '@/lib/store';
import CustomerSwitcher from '@/components/CustomerSwitcher';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/billing', label: 'Billing' },
];

export default function Navbar({ pathname }: { pathname: string }) {
  const user = useUserStore((state) => state.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/login' });
      toast.success('Logged out');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const isActive = (href: string) => pathname === '/dashboard';

  return (
    <nav className="bg-white border-b border-surface-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/dashboard" className="flex items-center gap-2 shrink-0">
              <svg className="w-8 h-8 text-primary-600" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.15" />
                <path d="M10 20V14M16 20V10M22 20V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-lg font-bold text-surface-900">BookKeep</span>
            </a>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                    isActive(link.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50',
                  )}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && pathname === '/dashboard' && (
              <CustomerSwitcher />
            )}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg hover:bg-surface-50 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-surface-700 max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-1 w-56 sm:w-48 bg-white rounded-xl shadow-elevated border border-surface-200 py-1 z-20 animate-scale-in">
                      <div className="px-4 py-2 border-b border-surface-100">
                        <p className="text-sm font-medium text-surface-900 truncate">{user.email}</p>
                        <div className="mt-1"><SubscriptionBadge /></div>
                      </div>
                      <a
                        href="/settings"
                        className="block px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors duration-200 flex items-center gap-2"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </a>
                      <hr className="border-surface-100 mx-3" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden min-h-10 min-w-10 flex items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-surface-200 animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'block px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200 touch-manipulation',
                  isActive(link.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50',
                )}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
