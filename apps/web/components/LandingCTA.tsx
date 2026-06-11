import { Button } from '@/components/ui';

export default function LandingCTA() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/20 rounded-full blur-[120px] animate-drift" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-600/15 rounded-full blur-[120px] animate-drift" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/5 rounded-full blur-[150px]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-surface-950/60 via-transparent to-transparent" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-surface-300 mb-8">
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Join 1,000+ businesses using BookKeep
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight text-balance leading-[1.15]">
          Stop wrestling with spreadsheets.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 via-primary-300 to-primary-400">
            Start growing.
          </span>
        </h2>
        <p className="mt-4 text-lg text-surface-400 max-w-xl mx-auto">
          Import your data, reconcile transactions, and generate reports in minutes. No credit card required.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300">
              Get started free
            </Button>
          </a>
          <a href="/pricing">
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 border border-white/10 hover:border-white/20">
              Compare plans
            </Button>
          </a>
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
    </section>
  );
}
