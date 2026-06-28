import Head from 'next/head';

export default function CookiesPage() {
  return (
    <>
      <Head>
        <title>Cookie Policy | BookKeep</title>
        <meta name="description" content="Learn about the cookies BookKeep uses and how to manage your cookie preferences." />
      </Head>

      <div className="min-h-screen bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <h1 className="text-3xl font-bold text-surface-900 mb-8">Cookie Policy</h1>

          <div className="prose prose-surface max-w-none space-y-8">
            <p className="text-surface-500 text-sm">Last updated: June 26, 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">What Are Cookies?</h2>
              <p className="text-surface-600">
                Cookies are small text files stored on your device when you visit a website. They help us provide a better experience by remembering your preferences and keeping you signed in.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Essential Cookies</h2>
              <p className="text-surface-600 mb-2">These cookies are necessary for BookKeep to function:</p>
              <ul className="list-disc list-inside text-surface-600 space-y-1">
                <li><strong>Session cookies</strong> — Keep you logged in as you navigate between pages</li>
                <li><strong>Authentication cookies</strong> — Verify your identity and maintain your session</li>
                <li><strong>Security cookies</strong> — Help protect against cross-site request forgery</li>
              </ul>
              <p className="text-surface-600 mt-2">
                These cookies cannot be disabled as they are required for the service to work.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Analytics Cookies</h2>
              <p className="text-surface-600">
                We may use analytics tools to understand how visitors interact with BookKeep. This helps us improve our service. Analytics data is collected in aggregate and does not personally identify you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">How to Manage Cookies</h2>
              <p className="text-surface-600 mb-2">You can control cookies through your browser settings:</p>
              <ul className="list-disc list-inside text-surface-600 space-y-1">
                <li>Block all cookies through your browser preferences</li>
                <li>Delete existing cookies from your browser</li>
                <li>Configure your browser to notify you when cookies are set</li>
              </ul>
              <p className="text-surface-600 mt-2">
                Note: Disabling essential cookies may prevent BookKeep from working correctly.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
