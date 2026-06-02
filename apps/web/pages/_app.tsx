import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useUserStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ui';

MyApp.getInitialProps = async ({ Component, ctx }: any) => {
  let pageProps = {};
  if (Component.getInitialProps) {
    pageProps = await Component.getInitialProps(ctx);
  }
  return { pageProps };
};

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { setUser, setLoading } = useUserStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '',
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
    });

    return unsubscribe;
  }, []);

  const isAuthPage = ['login', 'signup'].includes(router.pathname.split('/')[1]);

  return (
    <>
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
    </>
  );
}

export default MyApp;
