import { useState, useEffect, useRef } from 'react';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; text: string; time: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetch('/api/notifications/count')
      .then(r => r.json()).then(d => { if (d.count) setCount(d.count); })
      .catch(() => {});
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-modal border border-surface-200 overflow-hidden z-50 animate-scale-in origin-top-right">
          <div className="px-4 py-3 border-b border-surface-100">
            <p className="text-sm font-semibold text-surface-900">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-surface-400">No notifications yet</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-surface-50 border-b border-surface-100 last:border-0 cursor-pointer">
                  <p className="text-sm text-surface-700">{n.text}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{n.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
