import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4 py-8">
      <div className="text-center max-w-md w-full">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-5 sm:mb-6">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-surface-900 mb-2">404</h1>
        <p className="text-base sm:text-lg text-surface-500 mb-3 sm:mb-4">Page not found</p>
        <p className="text-sm text-surface-400 mb-8 sm:mb-10 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 min-h-11 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors touch-manipulation">
            Go to Dashboard
          </Link>
          <Link href="/" className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 min-h-11 bg-surface-100 text-surface-700 text-sm font-medium rounded-lg hover:bg-surface-200 transition-colors touch-manipulation">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
