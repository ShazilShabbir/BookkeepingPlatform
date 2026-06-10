import { useState } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';
import { useUserStore } from '@/lib/store';
import CustomerSwitcher from '@/components/CustomerSwitcher';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const router = useRouter();
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

  const isActive = (href: string) => router.pathname === '/dashboard';

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
            {user && router.pathname === '/dashboard' && (
              <CustomerSwitcher />
            )}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-50 transition-colors duration-200"
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
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-elevated border border-surface-200 py-1 z-20 animate-scale-in">
                      <div className="px-4 py-2 border-b border-surface-100">
                        <p className="text-sm font-medium text-surface-900 truncate">{user.email}</p>
                      </div>
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
              className="md:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors duration-200"
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
                  'block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
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
