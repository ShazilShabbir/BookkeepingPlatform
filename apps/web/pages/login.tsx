import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button, Input, Card } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Head from 'next/head';

type Step = 'credentials' | 'totp';

export default function Login() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; totpToken?: string }>({});
  const router = useRouter();

  const validateCredentials = () => {
    const errs: typeof errors = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateTotp = () => {
    if (!totpToken) {
      setErrors({ totpToken: 'Authentication code is required' });
      return false;
    }
    if (!/^\d{6}$/.test(totpToken)) {
      setErrors({ totpToken: 'Code must be 6 digits' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredentials()) return;
    setLoading(true);

    try {
      const response = await fetch('/api/2fa/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.needsTotp && data.preAuthToken) {
        setPreAuthToken(data.preAuthToken);
        setStep('totp');
        setLoading(false);
        return;
      }
    } catch {
      // fall through to normal signIn
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error('Invalid email or password');
    } else {
      toast.success('Login successful');
      router.push('/dashboard');
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTotp()) return;
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      preAuthToken,
      totpToken,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error('Invalid authentication code');
      setTotpToken('');
    } else {
      toast.success('Login successful');
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setPreAuthToken('');
    setTotpToken('');
  };

  if (step === 'totp') {
    return (
      <>
        <Head>
          <title>Two-Factor Authentication | BookKeep</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center py-12 px-4">
          <Card padding="lg" className="w-full max-w-md animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-surface-900">Two-Factor Authentication</h1>
              <p className="mt-1 text-surface-500">Enter the code from your authenticator app</p>
            </div>

            <form onSubmit={handleTotpSubmit} className="space-y-5">
              <Input
                label="Authentication Code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={totpToken}
                onChange={(e) => { setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors({}); }}
                error={errors.totpToken}
                maxLength={6}
                autoFocus
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Verify
              </Button>
            </form>

            <button onClick={handleBack} className="mt-4 w-full text-center text-sm text-surface-500 hover:text-surface-700">
              Back to sign in
            </button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Sign In | BookKeep</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center py-12 px-4">
      <Card padding="lg" className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-surface-900">Welcome back</h1>
          <p className="mt-1 text-surface-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
            error={errors.email}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
            error={errors.password}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-700">
            Create one
          </Link>
        </p>
      </Card>
    </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
