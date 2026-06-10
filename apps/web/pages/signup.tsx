import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button, Input, Card } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format';
    if (!company.trim()) errs.company = 'Company name is required';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    const len = pwd.length;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const score = (len >= 6 ? 1 : 0) + (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/5' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: 'w-2/5' };
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: 'w-3/5' };
    if (score <= 4) return { label: 'Strong', color: 'bg-lime-500', width: 'w-4/5' };
    return { label: 'Very strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, companyName: company }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Signup failed');
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Account created. Please sign in.');
        router.push('/login');
      } else {
        toast.success('Account created successfully');
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = password ? getPasswordStrength(password) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center py-12 px-4">
      <Card padding="lg" className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Create your account</h1>
          <p className="mt-1 text-surface-500">Get started with BookKeep</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <Input
            label="Full name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: '' })); }}
            error={errors.name}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
            error={errors.email}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
          />

          <Input
            label="Company name"
            type="text"
            placeholder="Acme Inc."
            value={company}
            onChange={(e) => { setCompany(e.target.value); setErrors((prev) => ({ ...prev, company: '' })); }}
            error={errors.company}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            }
          />

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: '' })); }}
              error={errors.password}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
            />
            {strength && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                </div>
                <p className="text-xs text-surface-500">Password strength: {strength.label}</p>
              </div>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
