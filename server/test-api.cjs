// API 回归测试：搜索修复验证
const https = require('https')
const http = require('http')

const BASE = 'http://127.0.0.1:3210'
let pass = 0, fail = 0

function req(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path)
    const data = body ? JSON.stringify(body) : null
    const r = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let buf = ''
      res.on('data', (c) => (buf += c))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(buf) } catch {}
        resolve({ status: res.statusCode, json, raw: buf })
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

function check(name, cond, extra) {
  if (cond) { pass++; console.log('PASS  ' + name) }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')) }
}

async function main() {
  // 1. 登录
  const owner = await req('POST', '/api/auth/login', { body: { email: 'meng@test.com', password: 'test123456' } })
  const member = await req('POST', '/api/auth/login', { body: { email: 'mate@test.com', password: 'test123456' } })
  check('owner login', owner.status === 200 && owner.json.token, owner.raw.slice(0, 200))
  check('member login', member.status === 200 && member.json.token, member.raw.slice(0, 200))
  const ot = owner.json.token, mt = member.json.token

  // 2. 搜索（核心修复点）
  const s1 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值函数'), { token: mt })
  check('member search 极值函数 -> 1 hit', s1.status === 200 && s1.json.results.length === 1, JSON.stringify(s1.json).slice(0, 300))

  const s2 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('边界函数'), { token: mt })
  check('member search 边界函数 -> 1 hit', s2.status === 200 && s2.json.results.length === 1, JSON.stringify(s2.json).slice(0, 300))

  const s3 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值函数'))
  check('guest search 极值函数 -> 0 hits (lab 不可见)', s3.status === 200 && s3.json.results.length === 0, JSON.stringify(s3.json).slice(0, 300))

  const s4 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值函数'), { token: ot })
  check('owner search 极值函数 -> 1 hit', s4.status === 200 && s4.json.results.length === 1, JSON.stringify(s4.json).slice(0, 300))

  // 3. 列表
  const l1 = await req('GET', '/api/papers', { token: mt })
  check('member list -> 2 papers', l1.status === 200 && Array.isArray(l1.json) && l1.json.length === 2, JSON.stringify(l1.json).slice(0, 200))
  const l2 = await req('GET', '/api/papers')
  check('guest list -> 0 papers', l2.status === 200 && Array.isArray(l2.json) && l2.json.length === 0, JSON.stringify(l2.json).slice(0, 200))
  const l3 = await req('GET', '/api/papers', { token: ot })
  check('owner list -> 2 papers', l3.status === 200 && Array.isArray(l3.json) && l3.json.length === 2, JSON.stringify(l3.json).slice(0, 200))

  // 4. 详情 + bibtex
  const pid = l1.json[0].id
  const d1 = await req('GET', '/api/papers/' + pid, { token: mt })
  check('member detail by id', d1.status === 200 && d1.json.id === pid, d1.raw.slice(0, 200))
  const d2 = await req('GET', '/api/papers/' + pid)
  check('guest detail (lab) -> 403', d2.status === 403, d2.raw.slice(0, 200))
  const b1 = await req('GET', '/api/papers/' + pid + '/bibtex', { token: mt })
  check('member bibtex', b1.status === 200 && /@/.test(b1.raw), b1.raw.slice(0, 200))

  // 5. 短查询保护
  const s5 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值'), { token: mt })
  check('short query (<3 chars) -> empty', s5.status === 200 && s5.json.results.length === 0, s5.raw.slice(0, 200))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('FATAL', e); process.exit(2) })
