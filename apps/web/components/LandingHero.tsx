import { Button } from '@/components/ui';

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgMGgxdjFIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-950/60" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full text-xs font-medium text-primary-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Trusted by 100+ businesses
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight text-balance leading-[1.1]">
              Sales Analytics{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-primary-400 to-primary-500">
                Made Simple
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-surface-300 max-w-xl leading-relaxed">
              Track revenue, expenses, and profit margins in real time. Import CSV data, reconcile bank statements, and make smarter business decisions — all in one place.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="/signup">
                <Button size="lg" className="bg-white text-surface-900 hover:bg-surface-100 shadow-lg shadow-primary-500/20">
                  Get started free
                </Button>
              </a>
              <a href="/pricing">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 border border-white/10">
                  View Pricing
                </Button>
              </a>
              <a href="/login">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                  Sign in
                </Button>
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-surface-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Bank-grade security
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                SOC 2 compliant
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                Multi-user access
              </span>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="relative w-full max-w-lg">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 to-primary-700/20 rounded-3xl blur-2xl" />
              <div className="relative bg-surface-800/80 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs text-surface-400 font-mono">dashboard — BookKeep</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-400 font-medium">Revenue</span>
                    <span className="text-xs text-emerald-400 font-mono">+12.5%</span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-400 font-medium">Expenses</span>
                    <span className="text-xs text-red-400 font-mono">+3.2%</span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full w-2/5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-400 font-medium">Profit Margin</span>
                    <span className="text-xs text-emerald-400 font-mono">24.8%</span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full w-3/5 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full animate-pulse" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-surface-700/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-surface-400">Revenue</p>
                      <p className="text-sm font-bold text-white font-mono">$48.2k</p>
                    </div>
                    <div className="bg-surface-700/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-surface-400">Expenses</p>
                      <p className="text-sm font-bold text-white font-mono">$36.1k</p>
                    </div>
                    <div className="bg-surface-700/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-surface-400">Net Income</p>
                      <p className="text-sm font-bold text-emerald-400 font-mono">$12.1k</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
    </section>
  );
}
