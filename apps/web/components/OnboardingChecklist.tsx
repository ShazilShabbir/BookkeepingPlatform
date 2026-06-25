import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  completed: boolean;
}

const STORAGE_KEY = 'bookkeep_onboarding_dismissed';
const CHECKLIST_STORAGE_KEY = 'bookkeep_onboarding_completed';

export default function OnboardingChecklist() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    if (isDismissed) setDismissed(true);

    const completed = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (completed) {
      try {
        setCompletedSteps(new Set(JSON.parse(completed)));
      } catch { /* ignore */ }
    }
  }, []);

  const markCompleted = useCallback((stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(stepId);
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const steps: ChecklistStep[] = [
    {
      id: 'profile',
      title: 'Complete your profile',
      description: 'Add your name and company info',
      icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
      href: '/settings',
      completed: false,
    },
    {
      id: 'import',
      title: 'Import your first entry',
      description: 'Upload a CSV or add a journal entry',
      icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
      href: '/dashboard?tab=import',
      completed: false,
    },
    {
      id: 'accounts',
      title: 'Set up your accounts',
      description: 'Review your chart of accounts',
      icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      href: '/dashboard?tab=accounts',
      completed: false,
    },
    {
      id: 'invoice',
      title: 'Create your first invoice',
      description: 'Send an invoice to a client',
      icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
      href: '/dashboard?tab=invoices',
      completed: false,
    },
    {
      id: 'reports',
      title: 'View your first report',
      description: 'Generate a P&L or Balance Sheet',
      icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
      href: '/dashboard?tab=reports',
      completed: false,
    },
    {
      id: 'currencies',
      title: 'Configure currencies',
      description: 'Set up exchange rates for multi-currency',
      icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      href: '/settings',
      completed: false,
    },
  ];

  const stepsWithStatus = steps.map(s => ({
    ...s,
    completed: completedSteps.has(s.id),
  }));

  const completedCount = stepsWithStatus.filter(s => s.completed).length;
  const allCompleted = completedCount === stepsWithStatus.length;
  const progress = (completedCount / stepsWithStatus.length) * 100;

  if (dismissed || allCompleted) return null;

  return (
    <Card padding="lg" className="mb-6 border-2 border-primary-100 bg-gradient-to-r from-primary-50/50 to-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-surface-900">Complete your setup</h3>
          <p className="text-sm text-surface-500 mt-0.5">
            {completedCount} of {stepsWithStatus.length} steps completed
          </p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(STORAGE_KEY, 'true');
          }}
          className="text-surface-400 hover:text-surface-600 p-1"
          aria-label="Dismiss checklist"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-200 rounded-full h-2 mb-4">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 mb-3"
      >
        <svg
          className={clsx('w-4 h-4 transition-transform', expanded && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Hide steps' : 'Show steps'}
      </button>

      {/* Steps */}
      {expanded && (
        <div className="space-y-2">
          {stepsWithStatus.map((step) => (
            <button
              key={step.id}
              onClick={() => {
                if (!step.completed) {
                  markCompleted(step.id);
                  router.push(step.href);
                }
              }}
              className={clsx(
                'flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all',
                step.completed
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-white border border-surface-200 hover:border-primary-300 hover:bg-primary-50/30',
              )}
            >
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                step.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-surface-100 text-surface-500',
              )}>
                {step.completed ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={clsx(
                  'text-sm font-medium',
                  step.completed ? 'text-emerald-700' : 'text-surface-900',
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-surface-500">{step.description}</p>
              </div>
              {!step.completed && (
                <svg className="w-4 h-4 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Dismiss all */}
      {!allCompleted && (
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(STORAGE_KEY, 'true');
          }}
          className="mt-3 text-xs text-surface-400 hover:text-surface-600"
        >
          Skip setup for now
        </button>
      )}
    </Card>
  );
}
