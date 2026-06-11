const stars = (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const testimonials = [
  {
    quote: 'BookKeep transformed how we manage our books. The bank reconciliation feature alone saves us hours every month.',
    name: 'Sarah Chen',
    title: 'Founder, Lumos Design',
    avatar: 'SC',
    accent: 'from-primary-500 to-primary-600',
  },
  {
    quote: 'We tried four different accounting tools before BookKeep. Nothing comes close to the simplicity and power of their reporting.',
    name: 'Marcus Rivera',
    title: 'CEO, Rivertide Consulting',
    avatar: 'MR',
    accent: 'from-emerald-500 to-emerald-600',
  },
  {
    quote: 'The CSV import is magical. It just works. No more manual data entry or spreadsheet headaches.',
    name: 'Aisha Patel',
    title: 'Operations Lead, Blueprint Studio',
    avatar: 'AP',
    accent: 'from-amber-500 to-amber-600',
  },
];

export default function LandingTestimonials() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-white to-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight text-balance">
            Loved by business owners
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            See what our customers have to say about BookKeep.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((t, i) => (
            <div key={t.name} className="relative bg-white rounded-2xl border border-surface-200 shadow-card hover:shadow-card-hover transition-all duration-300 reveal" style={{ animationDelay: `${i * 150}ms` }}>
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${t.accent}`} />
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <svg className="w-8 h-8 text-primary-200" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.271 0-2.405-.62-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.271 0-2.405-.62-2.917-1.179z" />
                  </svg>
                  {stars}
                </div>
                <blockquote className="text-surface-600 leading-relaxed mb-6 text-sm">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`absolute -inset-0.5 rounded-full bg-gradient-to-r ${t.accent} opacity-60`} />
                    <div className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-primary-700">
                      {t.avatar}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{t.name}</p>
                    <p className="text-xs text-surface-400">{t.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
