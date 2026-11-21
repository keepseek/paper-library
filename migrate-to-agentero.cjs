// 一次性：把 .tmp/migrate.json 的 2 篇论文 + 25 条定理写入 Agentero vault
// 每篇论文 → papers/<slug>/NOTES.md（YAML frontmatter 存论文元数据 + 定理条目）
const fs = require('fs')
const path = require('path')

const VAULT = 'E:/agentero'
const src = JSON.parse(fs.readFileSync(path.join(__dirname, '.tmp/migrate.json'), 'utf8'))

// 论文 → 文件夹 slug
const SLUGS = {
  29: 'dou-zhu-2022',
  42: 'hang-wang-yan-2008',
}

function yaml(v) {
  if (v === null || v === undefined || v === '') return '""'
  const s = String(v)
  // 含特殊字符就加引号
  if (/[:#{}[\],&*?|<>=!%@`"']/.test(s) || /^\s|\s$/.test(s)) {
    return '"' + s.replace(/"/g, '\\"') + '"'
  }
  return s
}

function frontmatter(p) {
  const tags = (p.tags || []).map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')
  return [
    '---',
    `title: ${yaml(p.title)}`,
    `authors: ${yaml(p.authors)}`,
    `year: ${p.year ?? ''}`,
    `venue: ${yaml(p.venue)}`,
    `tags: [${tags}]`,
    '---',
    '',
  ].join('\n')
}

function theoremBlock(r) {
  const lines = []
  lines.push(`## ${r.title}`)
  lines.push('')
  if (r.input) {
    lines.push(`- **输入**：${r.input}`)
  }
  if (r.output) {
    lines.push(`- **输出**：${r.output}`)
  }
  if (r.notes) {
    lines.push(`- **备注**：${r.notes}`)
  }
  lines.push('')
  return lines.join('\n')
}

let written = 0
for (const p of src.papers) {
  const slug = SLUGS[p.id]
  if (!slug) {
    console.log(`skip paper ${p.id} (no slug)`)
    continue
  }
  const dir = path.join(VAULT, 'papers', slug)
  fs.mkdirSync(dir, { recursive: true })
  const body =
    frontmatter(p) +
    `# ${p.title}\n\n` +
    `> ${p.authors}，${p.venue}\n\n` +
    p.results.map(theoremBlock).join('\n')
  const dest = path.join(dir, 'NOTES.md')
  fs.writeFileSync(dest, body)
  written++
  console.log(`wrote ${path.relative(VAULT, dest)}  (${p.results.length} 条定理, ${body.length} bytes)`)
}
console.log(`\ndone: ${written} paper folders`)
