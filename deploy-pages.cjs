// 部署 GitHub Pages：仓库转公开 + 推 web/dist 到 gh-pages + 开 Pages + 绑自定义域名
// 用法：node deploy-pages.cjs
const https = require('https')
const fs = require('fs')
const path = require('path')

const TOKEN = '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'
const OWNER = 'keepseek'
const REPO = 'paper-library'
const DIST = 'E:/网站/paper-library/web/dist'
const BRANCH = 'gh-pages'
const CNAME = 'www.meng-s-blog.top'

function api(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        Authorization: 'Bearer ' + TOKEN,
        'User-Agent': 'paper-library-deploy',
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let buf = ''
      res.on('data', (c) => (buf += c))
      res.on('end', () => {
        if (res.statusCode >= 300) return reject(new Error(`${method} ${apiPath} -> ${res.statusCode}: ${buf.slice(0, 300)}`))
        resolve(buf ? JSON.parse(buf) : null)
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

function walk(dir, rel = '') {
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const r = rel ? rel + '/' + name : name
    if (fs.statSync(full).isDirectory()) out.push(...walk(full, r))
    else out.push(r)
  }
  return out
}

async function main() {
  // 1. 仓库转公开（幂等）
  const repo = await api('GET', `/repos/${OWNER}/${REPO}`)
  if (repo.private) {
    await api('PATCH', `/repos/${OWNER}/${REPO}`, { private: false })
    console.log('repo → public ✓')
  } else {
    console.log('repo already public')
  }

  // 2. 收集 dist 文件 + CNAME
  const files = walk(DIST)
  const filesWithCname = [...files, 'CNAME']
  console.log(`files: ${files.length} + CNAME, branch: ${BRANCH}`)

  // 3. parent（gh-pages 当前 tip，可能不存在）
  let parentSha = null
  try {
    const head = await api('GET', `/repos/${OWNER}/${REPO}/commits?sha=${BRANCH}&per_page=1`)
    if (Array.isArray(head) && head.length) parentSha = head[0].sha
  } catch {}
  console.log(parentSha ? 'parent: ' + parentSha.slice(0, 7) : 'new branch')

  // 4. blobs
  const blobShas = {}
  for (const f of filesWithCname) {
    const content = f === 'CNAME' ? Buffer.from(CNAME + '\n') : fs.readFileSync(path.join(DIST, f))
    const b = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
      content: content.toString('base64'),
      encoding: 'base64',
    })
    blobShas[f] = b.sha
    process.stdout.write('.')
  }
  console.log('\nblobs done')

  // 5. trees
  const treeMap = {}
  const allDirs = new Set([''])
  for (const f of Object.keys(blobShas)) {
    const parts = f.split('/')
    const name = parts.pop()
    const dir = parts.join('/')
    ;(treeMap[dir] = treeMap[dir] || []).push({ path: name, mode: '100644', type: 'blob', sha: blobShas[f] })
    for (let i = 1; i <= parts.length; i++) allDirs.add(parts.slice(0, i).join('/'))
  }
  const dirs = [...allDirs].sort((a, b) => b.length - a.length)
  const treeShas = {}
  const isDirectChild = (sub, d) => d === '' ? !sub.includes('/') : sub.startsWith(d + '/') && !sub.slice(d.length + 1).includes('/')
  for (const d of dirs) {
    const entries = [...(treeMap[d] || [])]
    for (const sub of Object.keys(treeShas)) {
      if (isDirectChild(sub, d)) entries.push({ path: sub.slice(d ? d.length + 1 : 0), mode: '040000', type: 'tree', sha: treeShas[sub] })
    }
    const t = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, { tree: entries })
    treeShas[d] = t.sha
  }
  const rootTree = treeShas['']
  console.log('root tree:', rootTree)

  // 6. commit + ref
  const commitBody = {
    message: 'deploy: static site (dist) + CNAME',
    tree: rootTree,
    authors: [{ name: 'keepseek', email: 'keepseek@users.noreply.github.com' }],
  }
  if (parentSha) commitBody.parents = [parentSha]
  const commit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, commitBody)
  await api('POST', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    ref: `refs/heads/${BRANCH}`,
    sha: commit.sha,
  })
  console.log('pushed', BRANCH, commit.sha.slice(0, 7), '✓')

  // 7. 开 Pages（deploy branch 模式）
  try {
    const pages = await api('POST', `/repos/${OWNER}/${REPO}/pages`, {
      build_type: 'none',
      source: { branch: BRANCH, path: '/' },
    })
    console.log('pages enabled:', pages.html_url)
  } catch (e) {
    if (!/409/.test(e.message)) throw e
    console.log('pages already enabled')
  }

  // 8. 绑自定义域名（DNS 记录由用户在 Cloudflare 添加后自动生效）
  try {
    const pages = await api('PATCH', `/repos/${OWNER}/${REPO}/pages`, { cname: CNAME })
    console.log('cname set:', pages.cname, '(status:', pages.status + ')')
  } catch (e) {
    console.log('cname step:', e.message)
  }

  console.log('\n默认地址: https://' + OWNER + '.github.io/' + REPO + '/')
  console.log('自定义域名: https://' + CNAME + ' （需在 Cloudflare DNS 加 CNAME: www → ' + OWNER + '.github.io）')
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1) })
