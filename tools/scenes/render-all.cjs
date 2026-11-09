// Renders every scene for the Celebrations section (portrait and landscape) into tools/scenes/out/.
// 1) npx vite --config tools/scenes/vite.config.mjs      (keep it running)
// 2) node tools/scenes/render-all.cjs [scene …]          (needs Playwright's Chromium)
// 3) python tools/scenes/export.py                       (WebP files + src/data/sceneArt.generated.ts)
const path = require('path')
const fs = require('fs')
const { chromium } = require('playwright')
const OUT = path.join(__dirname, 'out')
// [scene, width, height, file, query] — renders at 1.5–3× the largest export size, then downscaled (supersampling).
// Kept in the workbench but no longer on the site: scenes/twilight, dawn, night-sky, night-diyas, sunrise, daylight.
const JOBS = [
  ['sunset', 1620, 3506, 'sunset-portrait', 'o=portrait'],
  ['sunset', 2880, 1620, 'sunset-landscape', 'o=landscape'],
  ['thamboola', 2280, 1287, 'thamboola', ''],
  // the two ceremony arches (upright, the arch's own proportions) and the venue page's map
  ['aarati', 1620, 2613, 'aarati', ''],
  ['mangalya', 1620, 2613, 'mangalya', ''],
  ['venuemap', 2160, 2700, 'venuemap-portrait', 'o=portrait'],
  ['venuemap', 3200, 2000, 'venuemap-landscape', 'o=landscape'],
  // the RSVP's closing frame: the doorway dressed for the wedding
  ['doorway', 1620, 2700, 'doorway-portrait', 'o=portrait'],
  ['doorway', 2880, 1620, 'doorway-landscape', 'o=landscape'],
]
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const only = process.argv.slice(2)
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
  for (const [scene, w, h, file, query] of JOBS) {
    if (only.length && !only.includes(scene) && !only.includes(file)) continue
    const p = await b.newPage({ viewport: { width: 400, height: 400 } })
    const t0 = Date.now()
    await p.goto(`http://localhost:5199/?s=${scene}&w=${w}&h=${h}${query ? '&' + query : ''}`)
    await p.waitForFunction(() => window.__done === true, null, { timeout: 900000, polling: 500 })
    const err = await p.evaluate(() => window.__err || null)
    if (err) throw new Error(`${scene}: ${err}`)
    const data = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))
    fs.writeFileSync(path.join(OUT, `${file}.png`), Buffer.from(data.split(',')[1], 'base64'))
    fs.writeFileSync(path.join(OUT, `${file}.lights.json`), JSON.stringify(await p.evaluate(() => window.__lights || [])))
    console.log(`${file}: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    await p.close()
  }
  await b.close()
})()
