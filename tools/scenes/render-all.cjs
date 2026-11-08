// Renders every scene for the Celebrations section (portrait and landscape) into tools/scenes/out/.
// 1) npx vite --config tools/scenes/vite.config.mjs      (keep it running)
// 2) node tools/scenes/render-all.cjs [scene …]          (needs Playwright's Chromium)
// 3) python tools/scenes/export.py                       (WebP files + src/data/sceneArt.generated.ts)
const path = require('path')
const fs = require('fs')
const { chromium } = require('playwright')
const OUT = path.join(__dirname, 'out')
// [scene, width, height, file, query] — renders at 1.5× the largest export size, then downscaled
const JOBS = [
  ['sunset', 1620, 3506, 'sunset-portrait', 'o=portrait'],
  ['sunset', 2880, 1620, 'sunset-landscape', 'o=landscape'],
  ['twilight', 1620, 2880, 'twilight-portrait', 'o=portrait'],
  ['twilight', 2880, 1620, 'twilight-landscape', 'o=landscape'],
  ['night-sky', 1620, 3506, 'night-sky-portrait', 'o=portrait'],
  ['night-sky', 2880, 1620, 'night-sky-landscape', 'o=landscape'],
  ['night-diyas', 1620, 969, 'night-diyas-portrait', 'o=portrait'],
  ['night-diyas', 1800, 720, 'night-diyas-landscape', 'o=landscape&exp=0.75&li=0.2&bs=0.45'],
  ['dawn', 1620, 2880, 'dawn-portrait', 'o=portrait'],
  ['dawn', 2880, 1620, 'dawn-landscape', 'o=landscape'],
  ['sunrise', 1620, 1952, 'sunrise-portrait', 'o=portrait'],
  ['sunrise', 2880, 1620, 'sunrise-landscape', 'o=landscape'],
  ['daylight', 1620, 1246, 'daylight-portrait', 'o=portrait'],
  ['daylight', 1800, 1800, 'daylight-landscape', 'o=landscape'],
  ['thamboola', 1560, 880, 'thamboola', ''],
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
