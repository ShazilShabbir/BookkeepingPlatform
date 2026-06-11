import { Button } from '@/components/ui';

export default function LandingCTA() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgMGgxdjFIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface-950/60 via-transparent to-transparent" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-surface-300 mb-6">
          Get started in under 2 minutes
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight text-balance leading-[1.15]">
          Ready to take control of your finances?
        </h2>
        <p className="mt-4 text-lg text-surface-300 max-w-xl mx-auto">
          Join thousands of businesses using BookKeep to simplify their bookkeeping. No credit card required.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="/signup">
            <Button size="lg" className="bg-white text-surface-900 hover:bg-surface-100 shadow-lg shadow-primary-500/20">
              Get started free
            </Button>
          </a>
          <a href="/pricing">
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 border border-white/10">
              Compare plans
            </Button>
          </a>
        </div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
    </section>
  );
}
