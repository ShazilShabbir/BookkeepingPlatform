import Head from 'next/head';

export default function DocsPage() {
  return (
    <>
      <Head>
        <title>Documentation | BookKeep</title>
        <meta name="description" content="Learn how to use BookKeep. Get started with importing data, categorizing transactions, and generating financial reports." />
      </Head>

      <div className="min-h-screen bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <h1 className="text-3xl font-bold text-surface-900 mb-8">Documentation</h1>

          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Getting Started</h2>
              <p className="text-surface-600 mb-3">
                BookKeep makes bookkeeping simple for small businesses and freelancers. Here&apos;s how to get up and running:
              </p>
              <ul className="list-disc list-inside text-surface-600 space-y-1.5">
                <li>Import your bank statements via CSV upload</li>
                <li>Categorize transactions manually or let AI suggest categories</li>
                <li>Generate financial reports to track your business health</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Key Features</h2>
              <ul className="list-disc list-inside text-surface-600 space-y-1.5">
                <li><strong>Double-entry bookkeeping</strong> — Every transaction is recorded in two accounts for accurate books</li>
                <li><strong>AI categorization</strong> — Automatically suggest categories based on transaction history</li>
                <li><strong>Multi-currency support</strong> — Handle transactions in multiple currencies with live exchange rates</li>
                <li><strong>Custom fields</strong> — Add your own fields to transactions for specialized tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Importing Data</h2>
              <p className="text-surface-600 mb-3">
                BookKeep supports importing transactions from CSV files exported by most banks and financial institutions.
              </p>
              <ul className="list-disc list-inside text-surface-600 space-y-1.5">
                <li>Navigate to the Import tab in your dashboard</li>
                <li>Upload your CSV file — we support common bank formats</li>
                <li>Map columns to the correct fields (date, description, amount, etc.)</li>
                <li>Save your column mappings as a profile for faster future imports</li>
                <li>Review and confirm imported transactions before saving</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Reports</h2>
              <p className="text-surface-600 mb-3">
                Generate financial reports from the Reports tab. Select a date range and export as PDF or Excel.
              </p>
              <ul className="list-disc list-inside text-surface-600 space-y-1.5">
                <li><strong>Profit &amp; Loss</strong> — View revenue, expenses, and net income over a period</li>
                <li><strong>Balance Sheet</strong> — See assets, liabilities, and equity at a point in time</li>
                <li><strong>Cash Flow</strong> — Track cash inflows and outflows</li>
                <li><strong>Trial Balance</strong> — Verify that debits equal credits across all accounts</li>
                <li><strong>Custom Reports</strong> — Build your own report layouts (Pro plan)</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
