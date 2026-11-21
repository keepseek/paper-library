// 同步脚本：读 Agentero vault → 生成 web/public/data.json（静态前端的数据源）
// 用法：node sync-vault.mjs [vaultPath]
//   或设环境变量 AGENTERO_VAULT
// 无第三方依赖（自带极简 frontmatter 解析），可在用户本机直接跑。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VAULT = process.argv[2] || process.env.AGENTERO_VAULT || 'E:/agentero'
const OUT = path.join(__dirname, 'web/public/data.json')

// ---------- 极简 frontmatter 解析（只处理本 vault 生成的格式） ----------
function parseList(val) {
  val = val.trim().replace(/^\[/, '').replace(/\]$/, '')
  const items = []
  let cur = ''
  let inQ = false
  for (const ch of val) {
    if (ch === '"') inQ = !inQ
    else if (ch === ',' && !inQ) { items.push(cur.trim()); cur = '' }
    else cur += ch
  }
  if (cur.trim()) items.push(cur.trim())
  return items
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    if (val.startsWith('[') && val.endsWith(']')) meta[key] = parseList(val)
    else {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (/^\d+$/.test(val)) val = parseInt(val, 10)
      meta[key] = val
    }
  }
  return { meta, body: text.slice(m[0].length) }
}

// ---------- 定理解析 ----------
function parseTheorems(body) {
  const lines = body.split(/\r?\n/)
  const blocks = []
  let cur = null
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/)
    if (h2) {
      if (cur) blocks.push(cur)
      cur = { title: h2[1].trim(), lines: [] }
    } else if (cur) {
      cur.lines.push(line)
    }
  }
  if (cur) blocks.push(cur)

  return blocks.map((b, i) => {
    const text = b.lines.join('\n')
    const fields = { input: '', output: '', notes: '' }
    // 按标签切分：- **输入**： / - **输出**： / - **备注**：
    const parts = text.split(/-\s*\*\*(输入|输出|备注)\*\*：/)
    for (let i = 1; i < parts.length; i += 2) {
      const label = parts[i]
      const content = (parts[i + 1] || '').replace(/^\s+|\s+$/g, '')
      if (label === '输入') fields.input = content
      else if (label === '输出') fields.output = content
      else if (label === '备注') fields.notes = content
    }
    return {
      id: `${slug}-${i + 1}`,
      title: b.title,
      input: fields.input,
      output: fields.output,
      notes: fields.notes,
    }
  })
}

// ---------- 主流程 ----------
const papersDir = path.join(VAULT, 'papers')
if (!fs.existsSync(papersDir)) {
  console.error(`vault papers/ 不存在: ${papersDir}`)
  process.exit(1)
}

const slugs = fs
  .readdirSync(papersDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

let slug = ''
const papers = []
for (const s of slugs) {
  slug = s
  const notesPath = path.join(papersDir, s, 'NOTES.md')
  if (!fs.existsSync(notesPath)) {
    console.log(`skip ${s} (无 NOTES.md)`)
    continue
  }
  const raw = fs.readFileSync(notesPath, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const results = parseTheorems(body)
  papers.push({
    id: s,
    title: meta.title || s,
    authors: meta.authors || '',
    year: meta.year ?? null,
    venue: meta.venue || '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    results,
  })
  console.log(`  ${s}: ${results.length} 条定理`)
}

// 定理继承论文标签
for (const p of papers) for (const r of p.results) r.tags = p.tags

const data = {
  generatedAt: new Date().toISOString(),
  source: 'agentero',
  vault: VAULT,
  paperCount: papers.length,
  resultCount: papers.reduce((n, p) => n + p.results.length, 0),
  papers,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
console.log(`\n✓ ${OUT}`)
console.log(`  ${data.paperCount} 篇论文 / ${data.resultCount} 条定理`)
