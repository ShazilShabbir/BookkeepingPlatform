import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useUserStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import LandingNavbar from '@/components/LandingNavbar';
import Layout from '@/components/Layout';
import { ALL_SIDEBAR_IDS } from '@/lib/navigation';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ui';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';

function AuthSync({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const { data: session, status } = useSession();
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
    }
    setLoading(false);
  }, [session, status]);

  return <>{children}</>;
}

function MyApp({ Component, pageProps: { session, ...pageProps }, router }: AppProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const basePath = router.pathname.split('/')[1];
  const isAuthPage = ['login', 'signup'].includes(basePath);
  const isLandingPage = router.pathname === '/';
  const isAppPage = !isAuthPage && !isLandingPage && basePath !== '';

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (router.pathname !== '/dashboard') return;
    const tab = router.query.tab as string;
    if (tab && ALL_SIDEBAR_IDS.includes(tab)) {
      setActiveTab(tab);
    }
  }, [router.query.tab, router.pathname]);

  useEffect(() => {
    if (GA_ID === 'G-XXXXXXXXXX') return;
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.gtag = function(...args: any[]) { w.dataLayer.push(args); };
    w.gtag('js', new Date());
    w.gtag('config', GA_ID, { page_path: window.location.pathname });

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return (
    <SessionProvider session={session}>
      <AuthSync pathname={router.pathname}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', background: '#1e293b', color: '#f8fafc', fontSize: '14px', padding: '12px 16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } },
          }}
        />
        {isAppPage ? (
          <Layout activeTab={activeTab} onTabChange={handleTabChange}>
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
          </Layout>
        ) : (
          <div className="min-h-screen flex flex-col">
            {isLandingPage ? <LandingNavbar /> : (!isAuthPage && <Navbar pathname={router.pathname} />)}
            <main className="flex-1">
              <ErrorBoundary>
                <Component {...pageProps} />
              </ErrorBoundary>
            </main>
          </div>
        )}
      </AuthSync>
    </SessionProvider>
  );
}

export default MyApp;
