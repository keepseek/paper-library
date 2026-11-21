// 一次性：从现有 SQLite 导出 2 篇论文 + 25 条定理 + 标签 → .tmp/migrate.json
const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('path')

const db = new DatabaseSync(path.join(__dirname, 'server/data/blog.db'), { readOnly: true })

function tagsFor(paperId) {
  return db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN paper_tags pt ON pt.tag_id = t.id
       WHERE pt.paper_id = ? ORDER BY t.name`
    )
    .all(paperId)
    .map((r) => r.name)
}

const papers = db
  .prepare('SELECT * FROM papers WHERE parent_id IS NULL ORDER BY id')
  .all()

const out = { exportedAt: new Date().toISOString(), papers: [] }
for (const p of papers) {
  const results = db
    .prepare('SELECT * FROM papers WHERE parent_id = ? ORDER BY sort_order, id')
    .all(p.id)
  out.papers.push({
    id: p.id,
    title: p.title,
    authors: p.authors,
    year: p.year,
    venue: p.venue,
    doi: p.doi,
    arxivId: p.arxiv_id,
    oneLiner: p.one_liner,
    input: p.input,
    output: p.output,
    notes: p.notes,
    tags: tagsFor(p.id),
    results: results.map((r) => ({
      id: r.id,
      title: r.title,
      section: r.section,
      input: r.input,
      output: r.output,
      notes: r.notes,
      tags: tagsFor(r.id),
    })),
  })
}

const dest = path.join(__dirname, '.tmp/migrate.json')
fs.writeFileSync(dest, JSON.stringify(out, null, 2))
console.log(
  `papers: ${out.papers.length}, results: ${out.papers.reduce((n, p) => n + p.results.length, 0)} -> ${dest}`
)
