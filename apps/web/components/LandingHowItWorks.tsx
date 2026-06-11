const steps = [
  {
    number: '01',
    title: 'Import Your Data',
    description: 'Upload CSV files or connect bank accounts. Our smart parser automatically categorizes and validates every transaction.',
    illustration: (
      <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
        <rect x="10" y="20" width="180" height="120" rx="12" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 3" />
        <rect x="24" y="34" width="60" height="20" rx="4" fill="#eef2ff" />
        <rect x="92" y="34" width="60" height="20" rx="4" fill="#eef2ff" />
        <rect x="24" y="60" width="80" height="16" rx="3" fill="#e0e7ff" />
        <rect x="24" y="82" width="100" height="16" rx="3" fill="#e0e7ff" />
        <rect x="24" y="104" width="70" height="16" rx="3" fill="#e0e7ff" />
        <path d="M170 70v20m0 0l6-6m-6 6l-6-6" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Reconcile & Categorize',
    description: 'Auto-match bank transactions to ledger entries. Review suggestions, resolve discrepancies, and keep your books accurate.',
    illustration: (
      <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
        <circle cx="60" cy="80" r="40" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="140" cy="80" r="40" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 3" />
        <path d="M85 80h30M100 65v30" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="80" r="8" fill="#6366f1" />
        <circle cx="140" cy="80" r="8" fill="#6366f1" />
        <path d="M60 120v20m0 0l4-4m-4 4l-4-4M140 120v20m0 0l4-4m-4 4l-4-4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Generate Reports',
    description: 'Get instant P&L statements, balance sheets, and cash flow reports. Share them with stakeholders via secure links.',
    illustration: (
      <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
        <rect x="20" y="30" width="160" height="100" rx="8" stroke="#6366f1" strokeWidth="2" />
        <rect x="40" y="50" width="50" height="8" rx="4" fill="#c7d2fe" />
        <rect x="40" y="66" width="120" height="8" rx="4" fill="#e0e7ff" />
        <rect x="40" y="82" width="90" height="8" rx="4" fill="#e0e7ff" />
        <rect x="40" y="98" width="70" height="8" rx="4" fill="#e0e7ff" />
        <path d="M150 60l12 12-12 12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-surface-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight text-balance">
            Three steps to financial clarity
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            Get started in minutes, not days.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <div key={step.number} className="text-center reveal" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="w-40 h-32 mx-auto mb-6 flex items-center justify-center">
                {step.illustration}
              </div>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary-700 text-sm font-bold mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">{step.title}</h3>
              <p className="text-surface-500 leading-relaxed text-sm max-w-xs mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="hidden md:block relative max-w-3xl mx-auto mt-12">
          <div className="absolute top-0 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200" />
        </div>
      </div>
    </section>
  );
}
