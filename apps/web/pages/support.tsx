import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button, Input, Card } from '@/components/ui';
import toast from 'react-hot-toast';
import Head from 'next/head';
import Link from 'next/link';
import clsx from 'clsx';

const FAQ_ITEMS = [
  {
    q: 'How do I import my bank statements?',
    a: 'Go to the Import tab in your dashboard. You can upload CSV files from most banks. We support common formats and will automatically map columns. You can also save column mappings as profiles for future imports.',
  },
  {
    q: 'How do I set up multi-currency?',
    a: 'Multi-currency is available on the Pro plan and above. Go to Settings > Currencies to add exchange rates. You can set rates manually or let us auto-fetch them. All transactions will be converted to your base currency for reporting.',
  },
  {
    q: 'How do I invite team members?',
    a: 'Go to the Team tab in your dashboard. Click "Invite Member" and enter their email address. They\'ll receive an invitation to create an account. You can assign different roles (Admin, Viewer, etc.) to control access.',
  },
  {
    q: 'How do I generate financial reports?',
    a: 'Go to the Reports tab. You can generate Profit & Loss, Balance Sheet, Cash Flow, and Trial Balance reports. Select a date range and export as PDF or Excel. Custom Reports (Pro plan) let you build your own report layouts.',
  },
  {
    q: 'How do I connect my bank account?',
    a: 'Bank connections are coming soon. For now, you can import transactions manually via CSV files. We\'re working on Plaid integration for automatic bank syncing.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Settings > Billing or click Billing in the sidebar. You can manage your subscription from the Stripe billing portal. If you cancel, you\'ll retain access until the end of your billing period.',
  },
];

export default function SupportPage() {
  const { data: session } = useSession();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [name, setName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      toast.error('Please fill in all fields');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, category, message }),
      });
      const json = await res.json();
      if (json.success) {
        setSent(true);
        toast.success('Message sent!');
      } else {
        toast.error(json.error || 'Failed to send message');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Head>
        <title>Help & Support | BookKeep</title>
        <meta name="description" content="Get help with BookKeep. Browse FAQs or contact our support team." />
      </Head>

      <div className="min-h-screen bg-surface-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-surface-900 mb-3">Help & Support</h1>
            <p className="text-surface-500 max-w-2xl mx-auto">
              Find answers to common questions or reach out to our support team.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <Link href="/dashboard?tab=support" className="block">
              <Card padding="md" className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">Support Tickets</h3>
                    <p className="text-sm text-surface-500">Create or view tickets</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/docs" className="block">
              <Card padding="md" className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">Documentation</h3>
                    <p className="text-sm text-surface-500">Browse our guides</p>
                  </div>
                </div>
              </Card>
            </Link>

            <a href="mailto:support@bookkeep.com" className="block">
              <Card padding="md" className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">Email Support</h3>
                    <p className="text-sm text-surface-500">support@bookkeep.com</p>
                  </div>
                </div>
              </Card>
            </a>
          </div>

          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-surface-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="font-medium text-surface-900">{item.q}</span>
                    <svg
                      className={clsx('w-5 h-5 text-surface-400 transition-transform', openFaq === i && 'rotate-180')}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4">
                      <p className="text-surface-600">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-surface-900 mb-6">Contact Us</h2>
            <Card padding="lg">
              {sent ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-surface-900 mb-2">Message Sent!</h3>
                  <p className="text-surface-500 mb-4">We&apos;ll get back to you within 24 hours.</p>
                  <Button onClick={() => { setSent(false); setSubject(''); setMessage(''); }}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      <option value="general">General Question</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Payments</option>
                      <option value="feature">Feature Request</option>
                    </select>
                  </div>
                  <Input
                    label="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="How can we help?"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="Describe your issue or question in detail..."
                      required
                    />
                  </div>
                  <Button type="submit" loading={sending}>
                    Send Message
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
