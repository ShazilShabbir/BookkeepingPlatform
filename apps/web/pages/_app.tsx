import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ui';

function AuthSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setUser, setLoading } = useUserStore();

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        role: 'admin',
        companyName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      setUser(null);
      const authPages = ['/login', '/signup'];
      if (!authPages.includes(router.pathname)) {
        router.push('/login');
      }
    }
    setLoading(false);
  }, [session, status, router.pathname]);

  return <>{children}</>;
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const isAuthPage = ['login', 'signup'].includes(router.pathname.split('/')[1]);

  return (
    <SessionProvider session={session}>
      <AuthSync>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '14px',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#f8fafc' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
            },
          }}
        />
        <div className="min-h-screen flex flex-col">
          {!isAuthPage && <Navbar />}
          <main className="flex-1">
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
          </main>
        </div>
      </AuthSync>
    </SessionProvider>
  );
}

export default MyApp;
