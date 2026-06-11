import { NextPage } from 'next';

interface ErrorPageProps {
  statusCode: number;
}

const ErrorPage: NextPage<ErrorPageProps> = ({ statusCode }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-900 mb-4">
          {statusCode || 500}
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          {statusCode === 404
            ? 'Page not found'
            : 'An unexpected error occurred'}
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
};

ErrorPage.getInitialProps = async ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode ?? 500 : 404;
  return { statusCode };
};

export default ErrorPage;
