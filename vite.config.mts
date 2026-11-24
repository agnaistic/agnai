import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type PluginOption } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import solid from 'vite-plugin-solid'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.join(projectRoot, 'web')

// The web app imports shared code with absolute specifiers (`/common/...`,
// `/srv/...`, `/web/...`). On the server those are resolved by `module-alias`
// against the project root, and `srv`/`common` are compiled to CommonJS with
// `moduleResolution: nodenext`. Parcel used to resolve them relative to the
// project root too, so we do the same here: the Vite root stays `web/` (so the
// dev server serves `web/index.html` at `/`), and the aliases point back at the
// real folders, which lets Vite consume the shared TypeScript sources directly
// as ESM instead of the CommonJS build the API server uses.
const absolute = (folder: string) => ({
  find: new RegExp(`^\\/${folder}(\\/|$)`),
  replacement: `${path.join(projectRoot, folder)}/`,
})

// `common/` is shared with the Node API server, so parts of it import Node
// built-ins (`crypto`, `events`, `stream`, ...) and expect `Buffer`/`process`
// to exist. Parcel injected browserify polyfills for those automatically;
// Vite needs the polyfill plugin to do the same.
const nodeBuiltins = [
  'assert',
  'buffer',
  'crypto',
  'events',
  'http',
  'https',
  'os',
  'path',
  'process',
  'punycode',
  'querystring',
  'stream',
  'string_decoder',
  'tty',
  'url',
  'util',
  'vm',
  'zlib',
]

const https = !!process.env.VITE_HTTPS

const plugins: PluginOption[] = [
  solid(),
  nodePolyfills({
    include: nodeBuiltins,
    // `Buffer`, `process` and `global` are used directly by shared code and
    // by a few of the browser dependencies.
    globals: { Buffer: true, global: true, process: true },
    exclude: ['fs', 'net', 'dns', 'tls', 'child_process'],
  }),
]

if (https) {
  plugins.push(basicSsl())
}

export default defineConfig({
  root: webRoot,

  resolve: {
    alias: [
      absolute('common'),
      absolute('web'),
      absolute('srv'),
      absolute('hub'),
      // Parcel had an alias for this in package.json (`alias.easy-speech`).
      // The vendored copy in web/pkg is the browser build we want.
      { find: /^easy-speech$/, replacement: path.join(webRoot, 'pkg', 'easy-speech.js') },
    ],
    // `tsc -p srv.tsconfig.json` (build:server/build:api) leaves compiled
    // CommonJS `.js` next to the `.ts` sources in common/ and srv/. Those are
    // stale build output, not sources: keep TypeScript first so Vite never picks
    // them up (a CJS `common/debug.js` has no ESM exports and blows up in the
    // browser with "does not provide an export named 'debug'").
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.jsx', '.js', '.json'],
  },

  plugins,

  css: {
    // The PostCSS/Tailwind config lives at the project root, not in web/.
    postcss: path.join(projectRoot, '.postcssrc'),
  },

  server: {
    host: true,
    // The web app talks to the API on :3001 when it is served from :1234.
    port: 1234,
    strictPort: true,
    https,
    // common/ and srv/ are outside of the Vite root (web/).
    fs: { allow: [projectRoot] },
    watch: { ignored: ['**/dist/**', '**/srv/**', '**/db/**'] },
  },

  build: {
    // srv/app.ts serves dist/index.html, and the Docker image exposes
    // dist/assets as the asset folder.
    outDir: path.join(projectRoot, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },

  // web/store/embeddings loads its worker with `{ type: 'module' }`.
  worker: { format: 'es' },
})
