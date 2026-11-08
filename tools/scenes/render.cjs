// node tools/scenes/render.cjs <scene> <w> <h> <out.png> [extraQuery]
// Renders one workbench scene with WebGL (SwiftShader) and saves the canvas as PNG.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [scene, w, h, out, extra = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 400 } });
  const logs = [];
  p.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  const t0 = Date.now();
  await p.goto(`http://localhost:5199/?s=${scene}&w=${w}&h=${h}${extra ? '&' + extra : ''}`);
  await p.waitForFunction(() => window.__done === true, null, { timeout: 600000, polling: 500 });
  const err = await p.evaluate(() => window.__err || null);
  if (err) { console.error('SCENE ERROR', err); }
  const data = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? c.toDataURL('image/png') : null;
  });
  if (data) fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  const lights = await p.evaluate(() => window.__lights || []);
  fs.writeFileSync(out.replace(/\.png$/, '.lights.json'), JSON.stringify(lights));
  const warn = logs.filter((l) => !l.includes('[vite]') && !l.includes('Download the React'));
  if (warn.length) console.log(warn.slice(0, 12).join('\n'));
  console.log(`${scene}: ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
  await b.close();
})();
