import { NextPage } from 'next';

interface ErrorPageProps {
  statusCode: number;
}

const ErrorPage: NextPage<ErrorPageProps> = ({ statusCode }) => {
  const is404 = statusCode === 404;

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4 py-8">
      <div className="text-center max-w-md w-full">
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 sm:mb-6 ${is404 ? 'bg-primary-50' : 'bg-red-50'}`}>
          {is404 ? (
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-surface-900 mb-2">{statusCode || 500}</h1>
        <p className="text-base sm:text-lg text-surface-500 mb-3 sm:mb-4">
          {is404 ? 'Page not found' : 'Something went wrong'}
        </p>
        <p className="text-sm text-surface-400 mb-8 sm:mb-10 max-w-xs mx-auto">
          {is404
            ? "The page you're looking for doesn't exist or has been moved."
            : 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 min-h-11 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors touch-manipulation">
            Go to Dashboard
          </a>
          <a href="/" className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 min-h-11 bg-surface-100 text-surface-700 text-sm font-medium rounded-lg hover:bg-surface-200 transition-colors touch-manipulation">
            Home
          </a>
        </div>
      </div>
    </div>
  );
};

ErrorPage.getInitialProps = async ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode ?? 500 : 404;
  return { statusCode };
};

export default ErrorPage;
