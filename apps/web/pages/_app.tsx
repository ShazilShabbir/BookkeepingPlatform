import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useUserStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import LandingNavbar from '@/components/LandingNavbar';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ui';
import Head from 'next/head';
import Script from 'next/script';

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
  const isAuthPage = ['login', 'signup'].includes(router.pathname.split('/')[1]);

  return (
    <SessionProvider session={session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="canonical" href="https://bookkeep.app" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="description" content="Sales analytics and bookkeeping platform. Track revenue, expenses, and profit margins in real time." />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="BookKeep" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@bookkeep_app" />
      </Head>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { page_path: window.location.pathname });
        `}
      </Script>
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
        <div className="min-h-screen flex flex-col">
          {!isAuthPage && router.pathname === '/' ? <LandingNavbar /> : !isAuthPage && <Navbar pathname={router.pathname} />}
          <main className="flex-1">
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
            {GA_ID !== 'G-XXXXXXXXXX' && (
              <Script id="ga-pageview" strategy="afterInteractive">
                {`gtag('config', '${GA_ID}', { page_path: window.location.pathname });`}
              </Script>
            )}
          </main>
        </div>
      </AuthSync>
    </SessionProvider>
  );
}

export default MyApp;
