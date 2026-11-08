// Dev server for the scene workbench: resolves three.js from the site's own node_modules.
import { fileURLToPath } from 'node:url'
const three = fileURLToPath(new URL('../../node_modules/three', import.meta.url))
export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: [{ find: /^three$/, replacement: `${three}/build/three.module.js` }, { find: /^three\/(.*)$/, replacement: `${three}/$1` }] },
  server: { port: 5199, strictPort: true },
  logLevel: 'warn',
}
