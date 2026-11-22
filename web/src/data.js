import { reactive } from 'vue'

// 静态数据源：sync-vault.mjs 从 Agentero vault 生成 web/public/data.json
export const store = reactive({
  loaded: false,
  error: '',
  generatedAt: '',
  papers: []
})

export async function loadData() {
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'data.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error('data.json 加载失败（HTTP ' + res.status + '）')
    const data = await res.json()
    store.generatedAt = data.generatedAt || ''
    store.papers = data.papers || []
  } catch (e) {
    store.error = e.message
  } finally {
    store.loaded = true
  }
}

export function getPaper(id) {
  return store.papers.find((p) => p.id === id) || null
}

export function allTags() {
  const set = new Set()
  for (const p of store.papers) for (const t of p.tags || []) set.add(t)
  return [...set].sort()
}

/* ---------- 客户端搜索：关键词 + 结果描述反查 ---------- */

// 粘贴描述里常见的标签词，不参与匹配
const STOP = new Set(['输入', '输出', '备注', '例如', '描述', '关键词', '粘贴', '搜索'])

// 把查询拆成匹配项：中文按双字滑窗（短词整词），拉丁/数字按整词
function termsOf(q) {
  const s = q.toLowerCase()
  const terms = new Set()
  for (const m of s.matchAll(/[\u4e00-\u9fff]{2,}/g)) {
    const run = m[0]
    if (STOP.has(run)) continue
    if (run.length <= 4) terms.add(run)
    else for (let i = 0; i + 2 <= run.length; i++) terms.add(run.slice(i, i + 2))
  }
  for (const m of s.matchAll(/[a-z0-9]{2,}/g)) terms.add(m[0])
  return [...terms]
}

function scoreText(text, terms) {
  if (!terms.length) return 0
  let hit = 0
  for (const t of terms) if (text.includes(t)) hit++
  return hit / terms.length
}

// 返回 [{kind:'paper'|'result', paper, result?, score}]，按得分降序
export function search(q) {
  const query = (q || '').trim()
  if (!query) return []
  const terms = termsOf(query)
  if (!terms.length) return []
  const hits = []
  for (const p of store.papers) {
    const pText = [p.title, p.authors, p.venue, p.abstract, (p.tags || []).join(' ')].join(' ').toLowerCase()
    const ps = scoreText(pText, terms)
    if (ps > 0) hits.push({ kind: 'paper', paper: p, score: ps })
    for (const r of p.results || []) {
      const rText = [r.title, r.input, r.output, r.notes].join(' ').toLowerCase()
      const rs = scoreText(rText, terms)
      if (rs > 0) hits.push({ kind: 'result', paper: p, result: r, score: rs })
    }
  }
  hits.sort((a, b) => b.score - a.score || a.paper.id.localeCompare(b.paper.id))
  return hits
}

/* ---------- PDF 库 + 统计 ---------- */

// 字节 → 人类可读
export function fmtBytes(n) {
  if (n === null || n === undefined || isNaN(n)) return ''
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(2) + ' MB'
}

// 每篇论文的 PDF 情况（供 PDF 库目录页用）。
// 一篇论文可同时有本地 PDF 和外链；这里都保留，source 只用于筛选归类。
export function pdfEntries() {
  return store.papers.map((p) => {
    const local = p.local_pdfs || []
    const external = p.pdf_url || ''
    const externalKind = external
      ? (/arxiv\.org/i.test(external) ? 'arxiv' : /doi\.org/i.test(external) ? 'doi' : 'link')
      : ''
    return {
      paper: p,
      local,
      hasLocal: local.length > 0,
      external,
      hasExternal: !!external,
      externalKind,
      size: local.reduce((n, f) => n + f.size, 0),
    }
  })
}

// 库统计（客户端从 store.papers 聚合，始终与列表一致）
export function stats() {
  const papers = store.papers
  const theorems = papers.reduce((n, p) => n + (p.results?.length || 0), 0)
  const pdfs = papers.reduce((n, p) => n + (p.local_pdfs?.length || 0), 0)
  const pdfSize = papers.reduce((n, p) => n + (p.local_pdfs || []).reduce((m, f) => m + f.size, 0), 0)
  const read = papers.filter((p) => p.is_read).length
  return { papers: papers.length, theorems, pdfs, pdfSize, read, unread: papers.length - read }
}

// 标签 → 论文数，按数量降序（供标签云用）
export function tagCounts() {
  const m = new Map()
  for (const p of store.papers) for (const t of p.tags || []) m.set(t, (m.get(t) || 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
}
