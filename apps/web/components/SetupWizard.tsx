import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COMMON_CURRENCIES } from '@/lib/format';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STORAGE_KEY = 'bookkeep_setup_completed';

interface WizardData {
  companyName: string;
  baseCurrency: string;
  fiscalYearStart: string;
  industry: string;
}

const INDUSTRIES = [
  'Technology / Software',
  'Professional Services',
  'Retail / E-commerce',
  'Healthcare',
  'Construction',
  'Manufacturing',
  'Real Estate',
  'Food & Beverage',
  'Education',
  'Non-Profit',
  'Other',
];

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WizardData>({
    companyName: '',
    baseCurrency: 'USD',
    fiscalYearStart: '01',
    industry: '',
  });

  const steps = [
    { title: 'Company Info', description: 'Tell us about your business' },
    { title: 'Currency', description: 'Set your base currency' },
    { title: 'Fiscal Year', description: 'When does your fiscal year start?' },
    { title: 'Industry', description: 'Help us customize your experience' },
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save settings
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          baseCurrency: data.baseCurrency,
          fiscalYearStart: data.fiscalYearStart,
          industry: data.industry,
        }),
      });

      localStorage.setItem(STORAGE_KEY, 'true');
      toast.success('Setup complete!');
      onComplete();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.companyName.trim().length > 0;
      case 1: return data.baseCurrency.length > 0;
      case 2: return data.fiscalYearStart.length > 0;
      case 3: return data.industry.length > 0;
      default: return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card padding="lg" className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-surface-900">Welcome to BookKeep</h2>
          <p className="text-sm text-surface-500 mt-1">Let&apos;s set up your account in a few steps</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex-1">
              <div className={clsx(
                'h-1.5 rounded-full transition-colors',
                i <= step ? 'bg-primary-500' : 'bg-surface-200',
              )} />
              <p className={clsx(
                'text-xs mt-1',
                i === step ? 'text-primary-600 font-medium' : 'text-surface-400',
              )}>
                {s.title}
              </p>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[200px] mb-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-surface-900">Company Information</h3>
              <Input
                label="Company Name"
                value={data.companyName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setData({ ...data, companyName: e.target.value })}
                placeholder="Acme Inc."
                autoFocus
              />
              <p className="text-xs text-surface-400">
                This will be used in reports and invoices. You can change it later.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-surface-900">Base Currency</h3>
              <p className="text-sm text-surface-500">
                All financial reports will be displayed in this currency.
              </p>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Currency</label>
                <select
                  value={data.baseCurrency}
                  onChange={(e) => setData({ ...data, baseCurrency: e.target.value })}
                  className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  {COMMON_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-surface-900">Fiscal Year</h3>
              <p className="text-sm text-surface-500">
                When does your fiscal year begin?
              </p>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Start Month</label>
                <select
                  value={data.fiscalYearStart}
                  onChange={(e) => setData({ ...data, fiscalYearStart: e.target.value })}
                  className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-surface-900">Industry</h3>
              <p className="text-sm text-surface-500">
                This helps us suggest relevant account categories.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    onClick={() => setData({ ...data, industry: ind })}
                    className={clsx(
                      'p-3 rounded-lg border text-left text-sm transition-all',
                      data.industry === ind
                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                        : 'border-surface-200 hover:border-surface-300 text-surface-700',
                    )}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <button
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, 'true');
                onComplete();
              }}
              className="text-sm text-surface-500 hover:text-surface-700"
            >
              Skip for now
            </button>
          )}

          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              loading={loading}
              disabled={!canProceed()}
            >
              Complete Setup
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
