const testimonials = [
  {
    quote: 'BookKeep transformed how we manage our books. The bank reconciliation feature alone saves us hours every month.',
    name: 'Sarah Chen',
    title: 'Founder, Lumos Design',
    avatar: 'SC',
    color: 'bg-primary-100 text-primary-700',
  },
  {
    quote: 'We tried four different accounting tools before BookKeep. Nothing comes close to the simplicity and power of their reporting.',
    name: 'Marcus Rivera',
    title: 'CEO, Rivertide Consulting',
    avatar: 'MR',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    quote: 'The CSV import is magical. It just works. No more manual data entry or spreadsheet headaches.',
    name: 'Aisha Patel',
    title: 'Operations Lead, Blueprint Studio',
    avatar: 'AP',
    color: 'bg-amber-100 text-amber-700',
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
            <div key={t.name} className="bg-white rounded-2xl border border-surface-200 p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 reveal" style={{ animationDelay: `${i * 150}ms` }}>
              <svg className="w-8 h-8 text-primary-200 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.271 0-2.405-.62-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.271 0-2.405-.62-2.917-1.179z" />
              </svg>
              <blockquote className="text-surface-600 leading-relaxed mb-6 text-sm">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-sm font-semibold`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900">{t.name}</p>
                  <p className="text-xs text-surface-400">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
