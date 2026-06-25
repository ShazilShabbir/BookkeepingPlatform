import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'bookkeep_cookie_consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-surface-200 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="font-semibold text-surface-900">We value your privacy</h3>
            </div>
            <p className="text-sm text-surface-500">
              We use cookies to enhance your experience, analyze site traffic, and personalize content.
              By clicking &ldquo;Accept&rdquo;, you consent to our use of cookies.
              {' '}
              <a href="/cookies" className="text-primary-600 hover:text-primary-700 underline">
                Learn more
              </a>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="ghost" onClick={decline}>
              Decline
            </Button>
            <Button onClick={accept}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
