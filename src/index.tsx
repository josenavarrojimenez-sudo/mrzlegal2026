import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { ASSETS: Fetcher }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())
app.use('/*/api/*', cors())
app.use('/*/pages/*', cors())

// Root redirect
app.get('/', (c) => {
  const cookie = c.req.header('cookie') || ''
  const lang = /(?:^|;\s*)mrz_lang=(es|en)(?:;|$)/i.exec(cookie)?.[1]?.toLowerCase()
  return c.redirect(lang === 'en' ? '/en/' : '/es/', 302)
})
app.get('/es', (c) => c.redirect('/es/', 301))
app.get('/en', (c) => c.redirect('/en/', 301))
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Helper: serve a static asset as JSON
const serveStatic = async (c: any, path: string) => {
  const url = new URL(c.req.url)
  url.pathname = path
  const resp = await c.env.ASSETS.fetch(new Request(url.toString()))
  if (resp.ok) {
    const body = await resp.text()
    return c.newResponse(body, 200, { 'content-type': 'application/json; charset=utf-8' })
  }
  return c.json({})
}

// API routes → serve static JSON files
app.get('/es/api/nav/', (c) => serveStatic(c, '/es/api/nav.json'))
app.get('/en/api/nav/', (c) => serveStatic(c, '/en/api/nav.json'))
app.get('/es/api/blog/', (c) => serveStatic(c, '/es/api/blog.json'))
app.get('/en/api/blog/', (c) => serveStatic(c, '/en/api/blog.json'))
app.get('/es/api/lang/', (c) => serveStatic(c, '/es/api/lang.json'))
app.get('/en/api/lang/', (c) => serveStatic(c, '/en/api/lang.json'))
app.get('/api/view/', (c) => c.json({ content: null }))
app.get('/*/api/*', (c) => c.json({ content: {} }))
app.get('/api/*', (c) => c.json({ content: {} }))

// Page content API routes → static JSON
app.get('/es/pages/:page/', (c) => {
  const page = c.req.param('page')
  return serveStatic(c, `/es/pages/${page}/index.json`)
})
app.get('/en/pages/:page/', (c) => {
  const page = c.req.param('page')
  return serveStatic(c, `/en/pages/${page}/index.json`)
})

// kill-sw.js
app.get('/kill-sw.js', (c) => c.newResponse(
  `self.addEventListener('install',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>self.skipWaiting()))});self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim().then(()=>self.registration.unregister()))});`,
  200, { 'content-type': 'application/javascript', 'service-worker-allowed': '/' }
))

// SPA routes - serve language-specific index.html
app.get('/en/*', async (c) => {
  const resp = await c.env.ASSETS.fetch(c.req.raw)
  if (resp.status === 200) return resp
  const url = new URL(c.req.url); url.pathname = '/en/index.html'
  return c.env.ASSETS.fetch(new Request(url.toString()))
})

app.all('*', async (c) => {
  const resp = await c.env.ASSETS.fetch(c.req.raw)
  if (resp.status !== 404) return resp
  const url = new URL(c.req.url); url.pathname = '/es/index.html'
  return c.env.ASSETS.fetch(new Request(url.toString()))
})

export default app
