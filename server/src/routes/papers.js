import { Router } from 'express'
import { db, getPaperFull, syncFts, setPaperTags, visibilityClause, tagsOf } from '../db.js'
import { authRequired, authOptional } from '../auth.js'
import { parsePaperMd, MD_TEMPLATE } from '../mdimport.js'

const router = Router()

const FIELDS = [
  'title', 'authors', 'year', 'venue', 'arxiv_id', 'doi', 'pdf_url',
  'status', 'one_liner', 'problem', 'input', 'output', 'main_results', 'method', 'notes', 'visibility'
]

function cleanInput(body) {
  const p = {}
  for (const f of FIELDS) {
    const v = body[f]
    p[f] = v === undefined || v === null ? '' : String(v)
  }
  p.year = p.year ? Number(p.year) : null
  if (Number.isNaN(p.year)) p.year = null
  if (!['todo', 'reading', 'done'].includes(p.status)) p.status = 'todo'
  if (!['private', 'lab', 'public'].includes(p.visibility)) p.visibility = 'lab'
  if (!p.title.trim()) {
    const e = new Error('标题必填')
    e.status = 400
    throw e
  }
  return p
}

function insertPaper(userId, p, tags) {
  const info = db
    .prepare(
      `INSERT INTO papers (owner_id, title, authors, year, venue, arxiv_id, doi, pdf_url, status,
        one_liner, problem, input, output, main_results, method, notes, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, p.title, p.authors, p.year, p.venue, p.arxiv_id, p.doi, p.pdf_url, p.status,
      p.one_liner, p.problem, p.input, p.output, p.main_results, p.method, p.notes, p.visibility)
  const id = Number(info.lastInsertRowid)
  setPaperTags(id, tags || [])
  const full = getPaperFull(id)
  syncFts(full)
  return full
}

function canModify(user, paper) {
  return user.role === 'owner' || paper.owner_id === user.id
}

// ---------- 列表 ----------
router.get('/', authOptional, (req, res) => {
  const { tag, status, sort } = req.query
  const vis = visibilityClause(req.user)
  let sql = `SELECT p.* FROM papers p WHERE ${vis.sql}`
  const params = [...vis.params]
  if (tag) {
    sql += ` AND p.id IN (SELECT pt.paper_id FROM paper_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name = ?)`
    params.push(String(tag))
  }
  if (status) {
    sql += ' AND p.status = ?'
    params.push(String(status))
  }
  sql += sort === 'title' ? ' ORDER BY p.title COLLATE NOCASE' : ' ORDER BY p.updated_at DESC, p.id DESC'
  const rows = db.prepare(sql).all(...params)
  res.json(rows.map((r) => ({ ...r, tags: tagsOf(r.id) })))
})

// ---------- 搜索（FTS5 trigram，中文子串匹配） ----------
router.get('/search', authOptional, (req, res) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 3) return res.json({ q, results: [] })
  const vis = visibilityClause(req.user)
  const phrase = '"' + q.replace(/"/g, '""') + '"'
  const rows = db
    .prepare(
      `SELECT p.*,
        bm25(papers_fts, 10.0, 1.0, 5.0, 2.0, 8.0, 8.0, 4.0, 2.0, 1.0, 1.0) AS score,
        snippet(papers_fts, 0, '<mark>', '</mark>', '…', 14) AS sn_title,
        snippet(papers_fts, 2, '<mark>', '</mark>', '…', 14) AS sn_oneliner,
        snippet(papers_fts, 4, '<mark>', '</mark>', '…', 14) AS sn_input,
        snippet(papers_fts, 5, '<mark>', '</mark>', '…', 14) AS sn_output
      FROM papers_fts
      JOIN papers p ON p.id = papers_fts.rowid
      WHERE papers_fts MATCH ? AND ${vis.sql}
      ORDER BY score
      LIMIT 50`
    )
    .all(phrase, ...vis.params)
  res.json({ q, results: rows.map((r) => ({ ...r, tags: tagsOf(r.id) })) })
})

// ---------- md 导入 ----------
router.get('/md-template', (req, res) => {
  res.type('text/plain; charset=utf-8').send(MD_TEMPLATE)
})

router.post('/import-md', authRequired, (req, res) => {
  const { md } = req.body || {}
  if (!md || typeof md !== 'string') return res.status(400).json({ error: '请提供 md 文本' })
  let p
  try {
    p = parsePaperMd(md)
  } catch (e) {
    return res.status(400).json({ error: '解析失败：' + e.message })
  }
  const full = insertPaper(req.user.id, p, p.tags)
  res.status(201).json(full)
})

// ---------- 详情 ----------
router.get('/:id', authOptional, (req, res) => {
  const p = getPaperFull(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '论文不存在' })
  const vis = visibilityClause(req.user)
  if (vis.sql !== '1=1') {
    const ok = db.prepare(`SELECT 1 FROM papers p WHERE p.id = ? AND ${vis.sql}`).get(p.id, ...vis.params)
    if (!ok) return res.status(403).json({ error: '无权查看该论文' })
  }
  res.json(p)
})

// ---------- BibTeX ----------
router.get('/:id/bibtex', authOptional, (req, res) => {
  const p = getPaperFull(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '论文不存在' })
  const firstAuthor = (p.authors.split(',')[0] || 'unknown').toLowerCase().replace(/[^a-z]/g, '')
  const key = `${firstAuthor}${p.year || ''}${p.title.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}`
  const lines = [`@${p.venue && /proc|conf|sympos/i.test(p.venue) ? 'inproceedings' : 'article'}{${key},`]
  if (p.title) lines.push(`  title   = {${p.title}},`)
  if (p.authors) lines.push(`  author  = {${p.authors.replace(/, /g, ' and ')}},`)
  if (p.year) lines.push(`  year    = {${p.year}},`)
  if (p.venue) lines.push(`  journal = {${p.venue}},`)
  if (p.doi) lines.push(`  doi     = {${p.doi}},`)
  if (p.arxiv_id) lines.push(`  eprint  = {${p.arxiv_id}},`)
  lines.push('}')
  res.type('text/plain; charset=utf-8').send(lines.join('\n'))
})

// ---------- 创建 ----------
router.post('/', authRequired, (req, res) => {
  let p
  try {
    p = cleanInput(req.body || {})
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message })
  }
  const tags = Array.isArray(req.body.tags) ? req.body.tags : []
  const full = insertPaper(req.user.id, p, tags)
  res.status(201).json(full)
})

// ---------- 更新 ----------
router.put('/:id', authRequired, (req, res) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM papers WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: '论文不存在' })
  if (!canModify(req.user, existing)) return res.status(403).json({ error: '只能修改自己的论文' })
  let p
  try {
    p = cleanInput({ ...existing, ...(req.body || {}) })
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message })
  }
  db.prepare(
    `UPDATE papers SET title=?, authors=?, year=?, venue=?, arxiv_id=?, doi=?, pdf_url=?, status=?,
     one_liner=?, problem=?, input=?, output=?, main_results=?, method=?, notes=?, visibility=?,
     updated_at=datetime('now') WHERE id=?`
  ).run(p.title, p.authors, p.year, p.venue, p.arxiv_id, p.doi, p.pdf_url, p.status,
    p.one_liner, p.problem, p.input, p.output, p.main_results, p.method, p.notes, p.visibility, id)
  if (Array.isArray(req.body.tags)) setPaperTags(id, req.body.tags)
  const full = getPaperFull(id)
  syncFts(full)
  res.json(full)
})

// ---------- 删除 ----------
router.delete('/:id', authRequired, (req, res) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM papers WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: '论文不存在' })
  if (!canModify(req.user, existing)) return res.status(403).json({ error: '只能删除自己的论文' })
  db.prepare('DELETE FROM papers WHERE id = ?').run(id)
  db.prepare('DELETE FROM papers_fts WHERE rowid = ?').run(id)
  res.json({ ok: true })
})

export default router
