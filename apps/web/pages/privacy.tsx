import Head from 'next/head';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy | BookKeep</title>
        <meta name="description" content="BookKeep's privacy policy. Learn how we collect, use, and protect your data." />
      </Head>

      <div className="min-h-screen bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <h1 className="text-3xl font-bold text-surface-900 mb-8">Privacy Policy</h1>

          <div className="prose prose-surface max-w-none space-y-8">
            <p className="text-surface-500 text-sm">Last updated: June 26, 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Information We Collect</h2>
              <p className="text-surface-600 mb-2">We collect information you provide directly to us:</p>
              <ul className="list-disc list-inside text-surface-600 space-y-1">
                <li>Account information (name, email address, password)</li>
                <li>Financial data you import (transactions, accounts, invoices)</li>
                <li>Payment information (processed securely via Stripe)</li>
                <li>Communications you send to our support team</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">How We Use Information</h2>
              <p className="text-surface-600 mb-2">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-surface-600 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends and usage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Data Storage</h2>
              <p className="text-surface-600">
                Your data is stored securely in encrypted databases. We use industry-standard security measures including encryption at rest and in transit. We do not sell your personal or financial data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Cookies</h2>
              <p className="text-surface-600">
                We use cookies and similar technologies to maintain your session and remember your preferences. See our{' '}
                <a href="/cookies" className="text-primary-600 hover:text-primary-700 underline underline-offset-2">
                  Cookie Policy
                </a>{' '}
                for details.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Third-Party Services</h2>
              <p className="text-surface-600 mb-2">We use third-party services that may collect information:</p>
              <ul className="list-disc list-inside text-surface-600 space-y-1">
                <li>Stripe — payment processing</li>
                <li>Vercel — hosting and infrastructure</li>
              </ul>
              <p className="text-surface-600 mt-2">
                These services have their own privacy policies governing how they handle data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Changes to This Policy</h2>
              <p className="text-surface-600">
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Contact Us</h2>
              <p className="text-surface-600">
                If you have questions about this privacy policy, please contact us at{' '}
                <a href="mailto:privacy@bookkeep.com" className="text-primary-600 hover:text-primary-700 underline underline-offset-2">
                  privacy@bookkeep.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
