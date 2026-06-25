export default function LandingSocialProof() {
  const logos = [
    { name: 'TechCorp', initials: 'TC' },
    { name: 'GlobalTrade', initials: 'GT' },
    { name: 'FinanceHub', initials: 'FH' },
    { name: 'RetailPro', initials: 'RP' },
    { name: 'DataSync', initials: 'DS' },
    { name: 'CloudBase', initials: 'CB' },
  ];

  const stats = [
    { value: '500+', label: 'Businesses' },
    { value: '10M+', label: 'Entries Tracked' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9/5', label: 'User Rating' },
  ];

  return (
    <section className="py-16 bg-white border-y border-surface-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary-600">{stat.value}</p>
              <p className="text-sm text-surface-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Logos */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-surface-400 uppercase tracking-wider">
            Trusted by forward-thinking companies
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center gap-2 text-surface-300 hover:text-surface-500 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
                <span className="text-sm font-bold text-surface-400">{logo.initials}</span>
              </div>
              <span className="text-lg font-semibold">{logo.name}</span>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="mt-12 max-w-3xl mx-auto text-center">
          <blockquote className="text-lg text-surface-600 italic">
            &ldquo;BookKeep transformed how we handle our finances. The import feature alone saved us
            hours every month, and the reports are exactly what our accountant needs.&rdquo;
          </blockquote>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-700">SM</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-surface-900">Sarah Mitchell</p>
              <p className="text-xs text-surface-500">CFO, TechCorp</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
