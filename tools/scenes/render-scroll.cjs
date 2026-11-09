// Renders the invitation scroll's parts (tools/scenes/scenes/scroll.js) into tools/scenes/out/.
// 1) npx vite --config tools/scenes/vite.config.mjs   (keep it running)
// 2) node tools/scenes/render-scroll.cjs [part …]     (roll, closed, band, bow, seal)
// 3) python tools/scenes/export_scroll.py
const path = require('path'), fs = require('fs')
const { chromium } = require('playwright')
const OUT = path.join(__dirname, 'out')
const PX = +(process.env.PX || 1000) // pixels per unit
const parts = process.argv.slice(2).length ? process.argv.slice(2) : ['roll', 'closed', 'band', 'bow', 'seal']
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
  for (const part of parts) {
    const [w, h] = part === 'roll' ? [2.6 * PX, 0.28 * PX] : [2.6 * PX, 1.06 * PX]
    const p = await b.newPage({ viewport: { width: 400, height: 400 } })
    p.on('console', (m) => { if (m.type() === 'error') console.log(part, m.text()) })
    const t0 = Date.now()
    await p.goto(`http://localhost:5199/?s=scroll&part=${part}&w=${Math.round(w)}&h=${Math.round(h)}`)
    await p.waitForFunction(() => window.__done === true, null, { timeout: 900000, polling: 500 })
    const err = await p.evaluate(() => window.__err || null)
    if (err) throw new Error(`${part}: ${err}`)
    const data = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))
    fs.writeFileSync(path.join(OUT, `scroll-${part}.png`), Buffer.from(data.split(',')[1], 'base64'))
    fs.writeFileSync(path.join(OUT, `scroll-${part}.meta.json`), JSON.stringify(await p.evaluate(() => window.__meta || {})))
    console.log(`${part}: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    await p.close()
  }
  await b.close()
})()
