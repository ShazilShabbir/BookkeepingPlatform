import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminImpersonate() {
  const router = useRouter();
  const { token } = router.query;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useState(() => {
    if (!token || typeof token !== 'string') {
      setError('Invalid impersonation token');
      setLoading(false);
      return;
    }

    // Set the impersonation token as a cookie that the main app can read
    document.cookie = `impersonate_token=${token}; path=/; max-age=300; SameSite=Lax`;
    // Redirect to the main dashboard
    window.location.href = '/dashboard?impersonating=true';
  });

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center">
      <div className="text-center">
        {loading && !error && (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-surface-600 text-sm">Setting up impersonation session...</p>
          </div>
        )}
        {error && (
          <div className="space-y-3">
            <p className="text-red-500 text-sm">{error}</p>
            <a href="/admin/users" className="text-primary-600 text-sm hover:underline">Back to Users</a>
          </div>
        )}
      </div>
    </div>
  );
}
