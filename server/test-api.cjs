// API 回归测试：两级结构（论文=文件夹，定理=条目）
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

  // 2. 列表：只列论文（parent_id IS NULL），带 result_count
  const l1 = await req('GET', '/api/papers', { token: mt })
  check('member list -> 2 papers', l1.status === 200 && Array.isArray(l1.json) && l1.json.length === 2, JSON.stringify(l1.json).slice(0, 300))
  const counts = l1.json.map((p) => p.result_count).sort((a, b) => a - b)
  check('result_count = [12, 13]', JSON.stringify(counts) === '[12,13]', JSON.stringify(counts))
  check('list rows have no parent_id', l1.json.every((p) => p.parent_id == null))

  const l2 = await req('GET', '/api/papers')
  check('guest list -> 0 papers', l2.status === 200 && Array.isArray(l2.json) && l2.json.length === 0, JSON.stringify(l2.json).slice(0, 200))

  // 3. 详情：论文带 results 数组
  const pid = l1.json.find((p) => p.result_count === 12).id
  const d1 = await req('GET', '/api/papers/' + pid, { token: mt })
  check('member detail has 12 results', d1.status === 200 && Array.isArray(d1.json.results) && d1.json.results.length === 12, d1.raw.slice(0, 200))
  check('results have input/output', d1.json.results.every((r) => typeof r.input === 'string' && typeof r.output === 'string'))
  check('results sorted by sort_order', d1.json.results.every((r, i, a) => i === 0 || a[i - 1].sort_order <= r.sort_order))

  const d2 = await req('GET', '/api/papers/' + pid)
  check('guest detail (lab) -> 403', d2.status === 403, d2.raw.slice(0, 200))

  // 4. 搜索：命中定理条目，带 kind + parent 信息
  const s1 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值函数'), { token: mt })
  check('member search 极值函数 -> 6 hits', s1.status === 200 && s1.json.results.length === 6, JSON.stringify(s1.json).slice(0, 300))
  check('hits are kind=result with parent', s1.json.results.every((r) => r.kind === 'result' && r.parent_id && r.parent_title), JSON.stringify(s1.json.results[0] || {}).slice(0, 300))

  const s2 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('Carleman'), { token: mt })
  check('member search Carleman -> 1 hit', s2.status === 200 && s2.json.results.length === 1, JSON.stringify(s2.json).slice(0, 300))

  const s3 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值函数'))
  check('guest search -> 0 hits (lab 不可见)', s3.status === 200 && s3.json.results.length === 0, JSON.stringify(s3.json).slice(0, 300))

  const s5 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值'), { token: mt })
  check('short query (<3 chars) -> empty', s5.status === 200 && s5.json.results.length === 0, s5.raw.slice(0, 200))

  // 5. bibtex
  const b1 = await req('GET', '/api/papers/' + pid + '/bibtex', { token: mt })
  check('member bibtex', b1.status === 200 && /@/.test(b1.raw), b1.raw.slice(0, 200))

  // 6. 定理条目 CRUD
  const add = await req('POST', '/api/papers/' + pid + '/results', { token: ot, body: { title: '回归测试定理', input: 'x', output: 'y', section: '测试' } })
  check('add result -> 201', add.status === 201 && add.json.parent_id === pid, add.raw.slice(0, 300))
  const rid = add.json.id
  check('new result inherits visibility', add.json.visibility === 'lab')

  const put = await req('PUT', '/api/papers/results/' + rid, { token: ot, body: { title: '回归测试定理（改）' } })
  check('edit result', put.status === 200 && put.json.title === '回归测试定理（改）', put.raw.slice(0, 200))

  const d3 = await req('GET', '/api/papers/' + pid, { token: ot })
  check('detail now has 13 results', d3.json.results.length === 13)

  const del = await req('DELETE', '/api/papers/results/' + rid, { token: ot })
  check('delete result', del.status === 200 && del.json.ok === true, del.raw.slice(0, 200))
  const d4 = await req('GET', '/api/papers/' + pid, { token: ot })
  check('detail back to 12 results', d4.json.results.length === 12)

  // 7. 可见性传播：父论文改 public → 子条目同步，游客可见
  const putVis = await req('PUT', '/api/papers/' + pid, { token: ot, body: { visibility: 'public' } })
  check('set paper public', putVis.status === 200 && putVis.json.visibility === 'public', putVis.raw.slice(0, 200))
  const g1 = await req('GET', '/api/papers')
  check('guest list -> 1 paper (public)', g1.status === 200 && g1.json.length === 1, JSON.stringify(g1.json).slice(0, 200))
  const g2 = await req('GET', '/api/papers/' + pid)
  check('guest detail public -> 200 with results', g2.status === 200 && g2.json.results.length === 12, g2.raw.slice(0, 200))
  const s6 = await req('GET', '/api/papers/search?q=' + encodeURIComponent('极值函数'))
  check('guest search public paper -> hits', s6.status === 200 && s6.json.results.length > 0, JSON.stringify(s6.json).slice(0, 200))
  // 改回 lab
  await req('PUT', '/api/papers/' + pid, { token: ot, body: { visibility: 'lab' } })
  const g3 = await req('GET', '/api/papers')
  check('revert to lab -> guest 0', g3.status === 200 && g3.json.length === 0, JSON.stringify(g3.json).slice(0, 200))

  // 8. 级联删除（用临时论文）
  const np = await req('POST', '/api/papers', { token: ot, body: { title: '级联测试论文', visibility: 'private' } })
  check('create temp paper', np.status === 201, np.raw.slice(0, 200))
  const npid = np.json.id
  await req('POST', '/api/papers/' + npid + '/results', { token: ot, body: { title: '子条目 A' } })
  await req('POST', '/api/papers/' + npid + '/results', { token: ot, body: { title: '子条目 B' } })
  const delP = await req('DELETE', '/api/papers/' + npid, { token: ot })
  check('delete paper cascades', delP.status === 200, delP.raw.slice(0, 200))
  const d5 = await req('GET', '/api/papers/' + npid, { token: ot })
  check('temp paper gone -> 404', d5.status === 404, d5.raw.slice(0, 200))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('FATAL', e); process.exit(2) })
