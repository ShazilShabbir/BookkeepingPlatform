import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminLogin() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      router.push('/admin');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6">
            <svg className="w-10 h-10 text-primary-500" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.15" />
              <path d="M10 20V14M16 20V10M22 20V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xl font-bold text-white">BookKeep</span>
          </a>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-surface-400 mt-2 text-sm">Enter the admin secret to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-900 border border-surface-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <label htmlFor="secret" className="block text-sm font-medium text-surface-300 mb-2">
              Admin Secret
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Enter shared secret"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {loading ? 'Authenticating...' : 'Access Admin Panel'}
          </button>
        </form>

        <p className="text-center text-surface-600 text-xs mt-6">
          Internal use only. Not a public login page.
        </p>
      </div>
    </div>
  );
}
