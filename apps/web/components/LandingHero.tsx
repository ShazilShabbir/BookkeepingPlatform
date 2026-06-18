import { Button } from '@/components/ui';

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950">
      {/* Animated gradient orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/20 rounded-full blur-[120px] animate-drift" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-600/15 rounded-full blur-[120px] animate-drift" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/5 rounded-full blur-[150px]" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-900/20 to-surface-950/80" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full text-xs font-medium text-primary-300 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Trusted by 100+ businesses
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight text-balance leading-[1.08]">
              Financial Intelligence{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 via-primary-300 to-primary-400">
                for the Modern Business
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-surface-400 leading-relaxed max-w-lg">
              Import CSV, Excel, and PDF data. Reconcile transactions. Generate powerful reports in minutes. No accounting degree required.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300">
                  Get started free
                </Button>
              </a>
              <a href="/pricing">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 border border-white/10 hover:border-white/20">
                  View Pricing
                </Button>
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
              {[
                { label: 'Bank-grade', sub: 'encryption' },
                { label: 'SOC 2', sub: 'compliant' },
                { label: 'Multi-user', sub: 'access' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-300 leading-tight">{item.label}</p>
                    <p className="text-[10px] text-surface-500 leading-tight">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Preview Card */}
          <div className="hidden lg:flex items-center justify-center animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="relative w-full max-w-lg animate-float-slow" style={{ animationDuration: '6s' }}>
              {/* Glow behind card */}
              <div className="absolute -inset-6 bg-gradient-to-r from-primary-500/20 via-primary-400/10 to-primary-600/20 rounded-3xl blur-3xl animate-glow-pulse" />

              {/* Card */}
              <div className="relative bg-surface-800/90 backdrop-blur-xl border border-surface-700/50 rounded-2xl p-6 shadow-2xl shadow-primary-500/10">
                {/* Window controls */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-[11px] text-surface-500 font-mono">dashboard — BookKeep</span>
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Revenue', value: '$48.2k', change: '+12.5%', color: 'text-emerald-400' },
                    { label: 'Expenses', value: '$36.1k', change: '+3.2%', color: 'text-red-400' },
                    { label: 'Net Income', value: '$12.1k', change: '+24.8%', color: 'text-emerald-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-700/40 rounded-xl p-3.5 border border-surface-600/30">
                      <p className="text-[11px] text-surface-500 font-medium">{stat.label}</p>
                      <p className="text-lg font-bold text-white font-mono tracking-tight mt-0.5">{stat.value}</p>
                      <p className={`text-[11px] font-mono mt-0.5 ${stat.color}`}>{stat.change}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="space-y-4">
                  {[
                    { label: 'Monthly Revenue', pct: 78, color: 'from-primary-500 to-primary-400', textColor: 'text-primary-300' },
                    { label: 'Budget Utilization', pct: 45, color: 'from-amber-500 to-amber-400', textColor: 'text-amber-300' },
                    { label: 'Profit Target', pct: 62, color: 'from-emerald-500 to-emerald-400', textColor: 'text-emerald-300' },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-surface-400 font-medium">{bar.label}</span>
                        <span className={`text-xs font-mono ${bar.textColor}`}>{bar.pct}%</span>
                      </div>
                      <div className="h-2 bg-surface-700/70 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${bar.color} animate-bar-grow`}
                          style={{ width: `${bar.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-6 pt-4 border-t border-surface-700/50 flex items-center justify-between">
                  <span className="text-[11px] text-surface-500">Updated just now</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom divider glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
    </section>
  );
}
