import Accordion from '@/components/Accordion';

const faqs = [
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use bank-grade 256-bit encryption for data at rest and TLS 1.3 for data in transit. Our infrastructure is hosted on AWS with SOC 2 compliance. Your financial data is never shared with third parties.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'We support CSV files for bulk import. Our smart parser automatically detects columns, formats, and categories. Excel (.xlsx) export is available for reports. Bank statement CSV files are supported for reconciliation.',
  },
  {
    question: 'Can I try BookKeep for free?',
    answer: 'Absolutely. The Free plan has no time limit and includes up to 50 entries per month with basic reports and CSV import. No credit card required. Upgrade to Pro when you need more.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel anytime from your Billing settings. Your data remains accessible, and you can continue using the Free plan. There are no cancellation fees or long-term contracts.',
  },
  {
    question: 'Do you offer customer support?',
    answer: 'Pro and Business plans include priority email support with a 24-hour response time. Business plans also get a dedicated account manager. Free plan users can access our help center and community forums.',
  },
  {
    question: 'Can I connect my bank account?',
    answer: 'Currently, we support CSV uploads and manual entry for bank transactions. Bank feed integration via Plaid is on our roadmap. For reconciliation, you can upload your bank statement CSV and we\'ll auto-match transactions.',
  },
];

export default function LandingFAQ() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight text-balance">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            Everything you need to know about BookKeep.
          </p>
        </div>
        <Accordion items={faqs} />
      </div>
    </section>
  );
}
