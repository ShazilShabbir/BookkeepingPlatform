import { useState, useEffect } from 'react';
import Head from 'next/head';

type StatusState = 'loading' | 'operational' | 'error';

export default function StatusPage() {
  const [status, setStatus] = useState<StatusState>('loading');
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health/db');
        setStatus(res.ok ? 'operational' : 'error');
      } catch {
        setStatus('error');
      }
      setLastChecked(new Date().toLocaleString());
    };

    checkStatus();
  }, []);

  return (
    <>
      <Head>
        <title>System Status | BookKeep</title>
        <meta name="description" content="Check the current status of BookKeep services." />
      </Head>

      <div className="min-h-screen bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <h1 className="text-3xl font-bold text-surface-900 mb-8">System Status</h1>

          <div className="bg-white rounded-xl border border-surface-200 p-8">
            {status === 'loading' ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-surface-300 border-t-surface-600 rounded-full animate-spin" />
                <span className="text-surface-600">Checking...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {status === 'operational' ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-surface-900">All systems operational</p>
                        <p className="text-sm text-surface-500">Everything is running smoothly.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-surface-900">System issues detected</p>
                        <p className="text-sm text-surface-500">We&apos;re investigating the problem.</p>
                      </div>
                    </>
                  )}
                </div>

                {lastChecked && (
                  <p className="text-sm text-surface-400">Last checked: {lastChecked}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
