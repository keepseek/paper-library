// 静态站点冒烟测试：起本地静态服务器，检查 dist 各资源可访问、无 /api 残留
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf'
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p === '/') p = '/index.html'
  const file = path.join(dist, p)
  if (!file.startsWith(dist) || !existsSync(file) || !file.endsWith(path.extname(file))) {
    res.writeHead(404); res.end('not found'); return
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})

await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`
let fail = 0
async function get(p) {
  const res = await fetch(base + p)
  return { status: res.status, text: await res.text() }
}
function check(name, cond, extra = '') {
  if (!cond) fail++
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? '  ' + extra : ''}`)
}

const html = await get('/')
check('GET / → 200 HTML', html.status === 200 && html.text.includes('<div id="app">'))

const jsName = html.text.match(/assets\/(index-[\w-]+\.js)/)?.[1]
check('index.html 引用相对路径 JS', !!jsName, jsName)
const js = await get('/assets/' + jsName)
check('GET JS bundle → 200', js.status === 200 && js.text.length > 100000)
check('bundle 含搜索框文案', js.text.includes('用结果描述反查论文'))
check('bundle 含 data.json 加载', js.text.includes('data.json'))
check('bundle 无 /api 残留', !js.text.includes("'/api'") && !js.text.includes('"/api"') && !js.text.includes('/api/papers'))
check('bundle 无登录/成员路由', !js.text.includes('/login') && !js.text.includes('/members'))

const cssName = html.text.match(/assets\/(index-[\w-]+\.css)/)?.[1]
const css = await get('/assets/' + cssName)
check('GET CSS → 200', css.status === 200 && css.text.length > 10000)

const data = await get('/data.json')
check('GET /data.json → 200 JSON', data.status === 200 && JSON.parse(data.text).paperCount === 3)

// hash 路由深链：静态服务器对 /paper/x 返回 404 是预期的（hash 路由不依赖它）
const deep = await get('/paper/dou-zhu-2022')
check('深链 /paper/x 由 hash 路由接管（服务器 404 可接受）', deep.status === 404 || deep.status === 200)

server.close()
console.log(fail ? `\n${fail} 项失败` : '\n全部通过')
process.exit(fail ? 1 : 0)
