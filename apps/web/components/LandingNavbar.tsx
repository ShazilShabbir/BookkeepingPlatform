import { useState, useEffect } from 'react';
import clsx from 'clsx';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-surface-200 shadow-sm'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <svg className="w-8 h-8 text-primary-600" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.15" />
              <path d="M10 20V14M16 20V10M22 20V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={clsx('text-lg font-bold transition-colors duration-300', scrolled ? 'text-surface-900' : 'text-white')}>
              BookKeep
            </span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                  scrolled
                    ? 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                    : 'text-white/80 hover:text-white hover:bg-white/10',
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="/login"
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                scrolled
                  ? 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                  : 'text-white/80 hover:text-white hover:bg-white/10',
              )}
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-lg shadow-primary-500/25 transition-all duration-300"
            >
              Get started
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={clsx(
              'md:hidden p-2 rounded-lg transition-colors duration-200',
              scrolled ? 'text-surface-500 hover:bg-surface-100' : 'text-white/80 hover:bg-white/10',
            )}
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

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-surface-200 animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-lg transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <hr className="my-2 border-surface-200" />
            <a
              href="/login"
              className="block px-3 py-2.5 text-sm font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-50 rounded-lg transition-colors duration-200"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="block px-3 py-2.5 text-sm font-semibold text-center text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg"
            >
              Get started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
