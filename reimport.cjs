// 重新导入用户的定理整理 md（两级结构）
const fs = require('fs')
const https = require('https')
const http = require('http')

const BASE = 'http://127.0.0.1:3210'

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request(
      BASE + path,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        let buf = ''
        res.on('data', (c) => (buf += c))
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(buf) }) }
          catch { resolve({ status: res.statusCode, data: buf }) }
        })
      }
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

async function main() {
  const md = fs.readFileSync('E:/网站/延拓算子相关结论整理.md', 'utf8')
  const login = await req('POST', '/api/auth/login', { email: 'meng@test.com', password: 'test123456' })
  if (login.status !== 200) throw new Error('login failed: ' + JSON.stringify(login.data))
  const token = login.data.token

  const imp = await req('POST', '/api/papers/import-md', { md }, token)
  console.log('import status:', imp.status)
  if (imp.status !== 201) throw new Error('import failed: ' + JSON.stringify(imp.data).slice(0, 500))
  console.log('imported entries:', imp.data.imported)
  console.log('parent papers:', imp.data.papers.length)
  for (const p of imp.data.papers) {
    console.log(`  [${p.id}] ${p.title} | ${p.authors} | ${p.venue} | results: ${p.results.length}`)
  }

  // 验证列表
  const list = await req('GET', '/api/papers', null, token)
  console.log('\nlist (papers only):', list.data.length)
  for (const p of list.data) console.log(`  [${p.id}] ${p.title.slice(0, 50)} | results: ${p.result_count}`)

  // 验证搜索
  for (const q of ['Carleman', '极值函数', '径向对称']) {
    const s = await req('GET', '/api/papers/search?q=' + encodeURIComponent(q), null, token)
    const kinds = s.data.results.map((r) => r.kind)
    console.log(`search "${q}": ${s.data.results.length} hits (${kinds.join(',')})`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
