import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="canonical" href="https://bookkeep.app" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <meta name="description" content="Sales analytics and bookkeeping platform. Track revenue, expenses, and profit margins in real time." />
          <meta name="theme-color" content="#4f46e5" />
          <meta name="msapplication-TileColor" content="#4f46e5" />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content="en_US" />
          <meta property="og:site_name" content="BookKeep" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@bookkeep_app" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
