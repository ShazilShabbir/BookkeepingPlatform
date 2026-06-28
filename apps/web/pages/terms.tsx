import Head from 'next/head';

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service | BookKeep</title>
        <meta name="description" content="BookKeep's terms of service. Read about the rules and guidelines for using our platform." />
      </Head>

      <div className="min-h-screen bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <h1 className="text-3xl font-bold text-surface-900 mb-8">Terms of Service</h1>

          <div className="prose prose-surface max-w-none space-y-8">
            <p className="text-surface-500 text-sm">Last updated: June 26, 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Acceptance of Terms</h2>
              <p className="text-surface-600">
                By accessing or using BookKeep, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Use of Service</h2>
              <p className="text-surface-600 mb-2">You agree to:</p>
              <ul className="list-disc list-inside text-surface-600 space-y-1">
                <li>Use BookKeep only for lawful purposes</li>
                <li>Not attempt to gain unauthorized access to any part of the service</li>
                <li>Not use the service to transmit harmful or malicious content</li>
                <li>Not reverse-engineer or decompile any part of the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">User Accounts</h2>
              <p className="text-surface-600">
                You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account. We are not liable for any loss arising from unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Intellectual Property</h2>
              <p className="text-surface-600">
                BookKeep and its content, features, and functionality are owned by BookKeep and are protected by copyright, trademark, and other intellectual property laws. You retain ownership of any data you import into the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Limitation of Liability</h2>
              <p className="text-surface-600">
                BookKeep is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Termination</h2>
              <p className="text-surface-600">
                We may suspend or terminate your access to BookKeep at any time, with or without cause. You may also terminate your account at any time through your account settings. Upon termination, your right to use the service ceases immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Governing Law</h2>
              <p className="text-surface-600">
                These Terms of Service are governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Delaware.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
