/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://bookkeep.app',
  generateRobotsTxt: false,
  exclude: [
    '/dashboard',
    '/billing',
    '/api/*',
    '/reports/*',
  ],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/billing'] },
    ],
  },
  transform: async (config, path) => {
    const priorityMap: Record<string, number> = {
      '/': 1.0,
      '/pricing': 0.9,
      '/login': 0.3,
      '/signup': 0.5,
    };
    return {
      loc: path,
      changefreq: 'weekly',
      priority: priorityMap[path] || 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};
