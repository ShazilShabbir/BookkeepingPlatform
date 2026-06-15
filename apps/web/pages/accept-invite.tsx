import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { Card, Button } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { data: session, status } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading' || !token) return;

    if (status === 'authenticated' && !accepting && !done) {
      setAccepting(true);
      (async () => {
        try {
          const res = await fetch('/api/team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept', token }),
          });
          const json = await res.json();
          if (json.success) {
            setDone(true);
            toast.success('Invitation accepted!');
          } else {
            setError(json.error || 'Failed to accept invitation');
          }
        } catch {
          setError('Network error');
        } finally {
          setAccepting(false);
        }
      })();
    }
  }, [token, status, accepting, done]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 p-4">
      <Card padding="lg" className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="py-8 text-surface-400">Loading...</div>
        )}

        {done && (
          <div>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900 mb-2">Invitation Accepted!</h2>
            <p className="text-sm text-surface-500 mb-6">You now have access to the team dashboard.</p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </div>
        )}

        {error && (
          <div>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900 mb-2">Invitation Failed</h2>
            <p className="text-sm text-surface-500 mb-6">{error}</p>
            <Button variant="secondary" onClick={() => router.push('/')}>Go Home</Button>
          </div>
        )}

        {status === 'unauthenticated' && !done && (
          <div>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900 mb-2">You're Invited!</h2>
            <p className="text-sm text-surface-500 mb-6">Sign in or create an account to accept this invitation.</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => signIn(undefined, { callbackUrl: `/accept-invite?token=${token}` })}>
                Sign In
              </Button>
              <Link href={`/signup?callbackUrl=/accept-invite?token=${token}`} className="text-sm text-primary-600 hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
