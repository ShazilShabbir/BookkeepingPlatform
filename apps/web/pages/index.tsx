import { useEffect } from 'react';
import Head from 'next/head';
import LandingHero from '@/components/LandingHero';
import LandingFeatures from '@/components/LandingFeatures';
import LandingHowItWorks from '@/components/LandingHowItWorks';
import LandingPricing from '@/components/LandingPricing';
import LandingTestimonials from '@/components/LandingTestimonials';
import LandingFAQ from '@/components/LandingFAQ';
import LandingCTA from '@/components/LandingCTA';
import Footer from '@/components/Footer';

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const siteUrl = 'https://bookkeep.app';

  return (
    <>
      <Head>
        <title>BookKeep — Sales Analytics Made Simple</title>
        <meta name="description" content="Track revenue, expenses, and profit margins in real time. Import CSV data, reconcile bank statements, and generate professional financial reports." />
        <meta name="keywords" content="bookkeeping, sales analytics, financial reports, CSV import, bank reconciliation, small business accounting" />
        <link rel="canonical" href={siteUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="BookKeep — Sales Analytics Made Simple" />
        <meta property="og:description" content="Track revenue, expenses, and profit margins in real time. Import CSV data, reconcile bank statements, and generate professional financial reports." />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:site_name" content="BookKeep" />
        <meta property="og:image" content={`${siteUrl}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@bookkeep_app" />
        <meta name="twitter:title" content="BookKeep — Sales Analytics Made Simple" />
        <meta name="twitter:description" content="Track revenue, expenses, and profit margins in real time." />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'BookKeep',
              url: siteUrl,
              logo: `${siteUrl}/og-image.png`,
              sameAs: ['https://twitter.com/bookkeep_app', 'https://github.com/bookkeep'],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'BookKeep',
              url: siteUrl,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            },
          ]),
        }} />
      </Head>
      <div className="min-h-screen">
        <LandingHero />
        <div id="features"><LandingFeatures /></div>
        <LandingHowItWorks />
        <div id="pricing"><LandingPricing /></div>
        <LandingTestimonials />
        <div id="faq"><LandingFAQ /></div>
        <LandingCTA />
        <Footer />
      </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
