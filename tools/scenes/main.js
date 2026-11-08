const q = new URLSearchParams(location.search)
const name = q.get('s')
window.__done = false
import(`./scenes/${name}.js`).then(async (m) => {
  try { await m.default({ W: +q.get('w') || 780, H: +q.get('h') || 1688 }) } catch (e) { window.__err = String(e && e.stack || e); console.error(e) }
  window.__done = true
})
