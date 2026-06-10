import { useState, useEffect, useRef } from 'react';
import { useCustomerStore } from '@/lib/store';
import clsx from 'clsx';

type Customer = {
  uid: string;
  name: string;
  email: string;
};

async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch('/api/customers');
  const json = await res.json();
  return json.data || [];
}

export default function CustomerSwitcher() {
  const { customerUid, customerName, setCustomer } = useCustomerStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers().then(setCustomers);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedLabel = customerUid && customerName
    ? customerName
    : 'My Data';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
          customerUid
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'bg-primary-50 text-primary-700 hover:bg-primary-100',
        )}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {customerUid ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          )}
        </svg>
        <span className="hidden sm:inline max-w-[100px] truncate">{selectedLabel}</span>
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-elevated border border-surface-200 py-1 z-30 animate-scale-in">
          <button
            onClick={() => { setCustomer(null); setOpen(false); }}
            className={clsx(
              'w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 flex items-center gap-2',
              !customerUid
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-surface-600 hover:bg-surface-50',
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Data
          </button>

          {customers.length > 0 && (
            <div className="border-t border-surface-100 mt-1 pt-1">
              <p className="px-4 py-1.5 text-xs font-medium text-surface-400 uppercase tracking-wider">Customers</p>
              {customers.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => { setCustomer(c.uid, c.name); setOpen(false); }}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 flex items-center gap-2',
                    customerUid === c.uid
                      ? 'bg-amber-50 text-amber-700 font-medium'
                      : 'text-surface-600 hover:bg-surface-50',
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate">{c.name}</p>
                    <p className="text-xs text-surface-400 truncate">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-surface-100 mt-1 pt-1">
            <a
              href="/dashboard?tab=customers"
              onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Manage Customers
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
