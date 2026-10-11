import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * SEO / sharing plumbing.
 *  - VITE_SITE_URL       e.g. https://darshan-vathsala.example — enables canonical,
 *                        absolute og:url / og:image and sitemap.xml. On Vercel it
 *                        defaults to the project's production domain
 *                        (VERCEL_PROJECT_PRODUCTION_URL, provided by Vercel at build time).
 *  - VITE_ALLOW_INDEXING 'true' to let search engines index the site. Default is
 *                        noindex (private family invitation); link previews in
 *                        WhatsApp / social apps still work either way.
 */
function seo(site: string, indexable: boolean): Plugin {
  return {
    name: 'wedding-seo',
    transformIndexHtml(html) {
      const robots = `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, nofollow'}" />`
      let out = html.replace('<!-- SEO_ROBOTS -->', robots)
      if (site) {
        out = out
          .replace('content="/og/og-image.jpg"', `content="${site}/og/og-image.jpg"`)
          .replace(
            '<!-- SEO_ABSOLUTE -->',
            [
              `<link rel="canonical" href="${site}/" />`,
              `<meta property="og:url" content="${site}/" />`,
              `<meta name="twitter:image" content="${site}/og/og-image.jpg" />`,
            ].join('\n    '),
          )
      } else {
        out = out.replace('<!-- SEO_ABSOLUTE -->', '')
      }
      return out
    },
    generateBundle() {
      const lines = ['User-agent: *', indexable ? 'Allow: /' : 'Allow: /']
      if (site && indexable) lines.push(`Sitemap: ${site}/sitemap.xml`)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: lines.join('\n') + '\n' })
      if (site) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc></url>\n</urlset>\n`,
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // An explicit VITE_SITE_URL wins; on Vercel, fall back to the real production domain it provides.
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const site = (env.VITE_SITE_URL || (vercelProd ? `https://${vercelProd}` : '')).replace(/\/+$/, '')
  return {
    plugins: [react(), tailwindcss(), seo(site, env.VITE_ALLOW_INDEXING === 'true')],
    // the app shares this same public URL (falls back to the current page when empty)
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(site) },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          // Keep the heavy 3D stack in its own lazily-loaded chunk so the
          // invitation content never waits on WebGL code.
          manualChunks(id: string) {
            // React (and the scheduler shared with R3F's reconciler) must not
            // land in the 3D chunk, or the main bundle would preload it.
            if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
            if (id.includes('node_modules/three') || id.includes('@react-three')) return 'three-vendor'
            if (id.includes('node_modules/gsap') || id.includes('@gsap')) return 'gsap'
            return undefined
          },
        },
      },
    },
  }
})
