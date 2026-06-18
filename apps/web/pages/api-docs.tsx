import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Card, Button } from '@/components/ui';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<string | null>(null);

  useEffect(() => {
    fetch('/openapi.yaml')
      .then(res => res.text())
      .then(setSpec)
      .catch(() => setSpec(null));
  }, []);

  return (
    <>
      <Head>
        <title>API Documentation | BookKeep</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-surface-50 py-10">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-900">API Documentation</h1>
              <p className="mt-1 text-sm text-surface-500">REST API reference for BookKeep</p>
            </div>
            <a href="/openapi.yaml" download>
              <Button variant="secondary">Download OpenAPI Spec</Button>
            </a>
          </div>

          <Card padding="lg">
            {spec ? (
              <pre className="text-sm font-mono text-surface-700 whitespace-pre-wrap overflow-x-auto max-h-[70vh]">
                {spec}
              </pre>
            ) : (
              <p className="text-surface-400 text-center py-8">Loading API specification...</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
