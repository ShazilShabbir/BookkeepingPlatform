import clsx from 'clsx';

const features = [
  { name: 'Price', bookkeep: 'Free / $9.99 / $29.99', quickbooks: '$30 / $60 / $200', wave: 'Free', xero: '$29 / $46 / $69' },
  { name: 'Unlimited Entries', bookkeep: true, quickbooks: true, wave: true, xero: true },
  { name: 'Multi-Currency', bookkeep: true, quickbooks: 'Paid Add-on', wave: false, xero: true },
  { name: 'Bank Sync', bookkeep: 'Coming Soon', quickbooks: true, wave: true, xero: true },
  { name: 'Custom Reports', bookkeep: true, quickbooks: 'Paid Only', wave: false, xero: true },
  { name: 'API Access', bookkeep: true, quickbooks: 'Paid Only', wave: false, xero: true },
  { name: 'Team Collaboration', bookkeep: true, quickbooks: true, wave: 'Limited', xero: true },
  { name: 'Invoice Management', bookkeep: true, quickbooks: true, wave: true, xero: true },
  { name: 'Budgeting', bookkeep: true, quickbooks: true, wave: false, xero: true },
  { name: 'Reconciliation', bookkeep: true, quickbooks: true, wave: true, xero: true },
  { name: 'White-Label Branding', bookkeep: 'Pro Plan', quickbooks: false, wave: false, xero: false },
  { name: 'Priority Support', bookkeep: 'Business Plan', quickbooks: 'Enterprise', wave: false, xero: 'Enterprise' },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  if (value === false) {
    return (
      <svg className="w-5 h-5 text-surface-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return <span className="text-sm text-surface-600">{value}</span>;
}

export default function LandingComparison() {
  return (
    <section className="py-20 bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-surface-900 mb-3">
            Why choose BookKeep?
          </h2>
          <p className="text-surface-500 max-w-2xl mx-auto">
            See how we compare to the competition. Better pricing, more features, and built for modern businesses.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-surface-900 w-1/5">Feature</th>
                  <th className="px-6 py-4 text-center w-1/5">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary-500 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 32 32" fill="none">
                          <path d="M10 20V14M16 20V10M22 20V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-primary-600">BookKeep</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-surface-500 w-1/5">QuickBooks</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-surface-500 w-1/5">Wave</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-surface-500 w-1/5">Xero</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={clsx(
                      'border-b border-surface-100 last:border-0',
                      i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50',
                    )}
                  >
                    <td className="px-6 py-3.5 text-sm font-medium text-surface-700">{feature.name}</td>
                    <td className="px-6 py-3.5 text-center bg-primary-50/30">
                      <CellValue value={feature.bookkeep} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <CellValue value={feature.quickbooks} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <CellValue value={feature.wave} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <CellValue value={feature.xero} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">
          * Pricing as of 2026. Features and pricing may vary by plan. QuickBooks pricing shown for US plans.
        </p>
      </div>
    </section>
  );
}
