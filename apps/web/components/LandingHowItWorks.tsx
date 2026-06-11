const steps = [
  {
    number: '01',
    title: 'Import Your Data',
    description: 'Upload CSV files or connect bank accounts. Our smart parser automatically categorizes and validates every transaction.',
    gradient: 'from-primary-500 to-primary-600',
    illustration: (
      <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
        <rect x="10" y="20" width="180" height="120" rx="12" fill="#eef2ff" />
        <rect x="24" y="34" width="60" height="20" rx="4" className="fill-primary-200" />
        <rect x="92" y="34" width="60" height="20" rx="4" className="fill-primary-100" />
        <rect x="24" y="60" width="80" height="16" rx="3" fill="#c7d2fe" />
        <rect x="24" y="82" width="100" height="16" rx="3" fill="#c7d2fe" />
        <rect x="24" y="104" width="70" height="16" rx="3" fill="#c7d2fe" />
        <path d="M170 70v20m0 0l6-6m-6 6l-6-6" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Reconcile & Categorize',
    description: 'Auto-match bank transactions to ledger entries. Review suggestions, resolve discrepancies, and keep your books accurate.',
    gradient: 'from-emerald-500 to-emerald-600',
    illustration: (
      <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
        <circle cx="60" cy="80" r="40" fill="#eef2ff" />
        <circle cx="140" cy="80" r="40" fill="#eef2ff" />
        <path d="M85 80h30M100 65v30" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="80" r="10" fill="#6366f1" />
        <circle cx="140" cy="80" r="10" fill="#6366f1" />
        <path d="M60 125v15m0 0l4-4m-4 4l-4-4M140 125v15m0 0l4-4m-4 4l-4-4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Generate Reports',
    description: 'Get instant P&L statements, balance sheets, and cash flow reports. Share them with stakeholders via secure links.',
    gradient: 'from-amber-500 to-amber-600',
    illustration: (
      <svg className="w-full h-full" viewBox="0 0 200 160" fill="none">
        <rect x="20" y="30" width="160" height="100" rx="8" fill="#eef2ff" />
        <rect x="40" y="50" width="50" height="8" rx="4" className="fill-primary-300" />
        <rect x="40" y="66" width="120" height="8" rx="4" className="fill-primary-200" />
        <rect x="40" y="82" width="90" height="8" rx="4" className="fill-primary-200" />
        <rect x="40" y="98" width="70" height="8" rx="4" className="fill-primary-200" />
        <path d="M150 60l12 12-12 12" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-surface-50 to-white relative">
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

        <div className="relative">
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <div key={step.number} className="relative reveal" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="bg-white rounded-2xl border border-surface-200 p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300">
                  <div className="w-44 h-32 mx-auto mb-6 flex items-center justify-center">
                    {step.illustration}
                  </div>
                  <div className="flex flex-col items-center gap-3 mb-4">
                    <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-widest">Step {step.number}</span>
                    <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${step.gradient}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-surface-900 text-center mb-2">{step.title}</h3>
                  <p className="text-surface-500 leading-relaxed text-sm text-center max-w-xs mx-auto">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
