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
