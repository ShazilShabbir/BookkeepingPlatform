import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function ImpersonationBanner() {
  const router = useRouter();
  const [impersonating, setImpersonating] = useState(false);
  const [targetUser, setTargetUser] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('impersonating') === 'true') {
      setImpersonating(true);
      // Read impersonation token to get user info
      const match = document.cookie.match(/impersonate_token=([^;]+)/);
      if (match) {
        try {
          const payload = JSON.parse(atob(match[1].split('.')[1]));
          setTargetUser(payload.email || 'Unknown user');
        } catch {
          setTargetUser('Unknown user');
        }
      }
    }
  }, [router.asPath]);

  if (!impersonating) return null;

  const handleExit = async () => {
    // Clear impersonation cookie
    document.cookie = 'impersonate_token=; path=/; max-age=0';
    window.location.href = '/admin/users';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <span>Impersonating: <strong>{targetUser}</strong></span>
      </div>
      <button
        onClick={handleExit}
        className="px-3 py-1 bg-amber-950 text-amber-50 rounded-md text-xs font-semibold hover:bg-amber-900 transition-colors"
      >
        Exit Impersonation
      </button>
    </div>
  );
}
