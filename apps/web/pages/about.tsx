import Head from 'next/head';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About | BookKeep</title>
        <meta name="description" content="Learn about BookKeep and our mission to make financial tracking effortless for small businesses and freelancers." />
      </Head>

      <div className="min-h-screen bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <h1 className="text-3xl font-bold text-surface-900 mb-8">About BookKeep</h1>

          <div className="space-y-10">
            <section>
              <p className="text-surface-600 text-lg leading-relaxed">
                We&apos;re building the simplest, most powerful bookkeeping tool for small businesses and freelancers. Our goal is to take the pain out of financial tracking so you can focus on what you do best — running your business.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Our Mission</h2>
              <p className="text-surface-600">
                Financial tracking shouldn&apos;t require an accounting degree. We&apos;re on a mission to make bookkeeping effortless by combining clean design with intelligent automation. Whether you&apos;re a solo freelancer or a growing small business, BookKeep gives you the tools to stay on top of your finances without the complexity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-surface-900 mb-3">Contact</h2>
              <p className="text-surface-600">
                Have a question or want to get in touch? Visit our{' '}
                <Link href="/support" className="text-primary-600 hover:text-primary-700 underline underline-offset-2">
                  support page
                </Link>{' '}
                to reach our team.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
