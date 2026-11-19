import matter from 'gray-matter'

// 小节标题别名（中英文都认）
const SECTION_ALIASES = {
  one_liner: ['一句话总结', 'one-liner', 'oneliner', 'summary'],
  problem: ['问题背景', '问题', 'problem'],
  input: ['输入', 'input'],
  output: ['输出', 'output'],
  main_results: ['主要结果', 'main results', 'results', '主要定理'],
  method: ['方法', 'method'],
  notes: ['笔记', 'notes', '备注']
}

function matchSection(heading) {
  const h = heading.trim().toLowerCase()
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.some((a) => h === a.toLowerCase())) return key
  }
  // 前缀匹配（如 "输入（Input）"）
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.some((a) => h.startsWith(a.toLowerCase()))) return key
  }
  return null
}

/**
 * 解析标准 md 模板：
 *   frontmatter: title/authors/year/venue/arxiv/doi/pdf/tags/status/visibility
 *   正文小节: ## 一句话总结 / ## 问题 / ## 输入 / ## 输出 / ## 主要结果 / ## 方法 / ## 笔记
 */
export function parsePaperMd(mdText) {
  if (!mdText || !mdText.trim()) throw new Error('md 内容为空')
  const { data, content } = matter(mdText)

  const paper = {
    title: String(data.title || '').trim(),
    authors: Array.isArray(data.authors) ? data.authors.join(', ') : String(data.authors || '').trim(),
    year: data.year ? Number(data.year) : null,
    venue: String(data.venue || '').trim() || null,
    arxiv_id: String(data.arxiv || data.arxivId || '').trim() || null,
    doi: String(data.doi || '').trim() || null,
    pdf_url: String(data.pdf || data.pdfUrl || '').trim() || null,
    status: ['todo', 'reading', 'done'].includes(data.status) ? data.status : 'todo',
    visibility: ['private', 'lab', 'public'].includes(data.visibility) ? data.visibility : 'lab',
    one_liner: '',
    problem: '',
    input: '',
    output: '',
    main_results: '',
    method: '',
    notes: ''
  }

  if (!paper.title) {
    // 兜底：取正文第一个 # 标题
    const h1 = content.match(/^#\s+(.+?)\s*$/m)
    if (h1) paper.title = h1[1].trim()
  }
  if (!paper.title) throw new Error('缺少标题（frontmatter 的 title 或正文 # 标题）')

  // 按 ## 小节切分
  const sections = {}
  let current = null
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (m) {
      current = matchSection(m[1])
      if (current && !(current in sections)) sections[current] = []
      continue
    }
    if (current) sections[current].push(line)
  }
  for (const [k, lines] of Object.entries(sections)) paper[k] = lines.join('\n').trim()

  // tags
  if (Array.isArray(data.tags)) paper.tags = data.tags.map(String)
  else if (typeof data.tags === 'string') paper.tags = data.tags.split(/[,，\s]+/).filter(Boolean)
  else paper.tags = []

  return paper
}

// ============================================================
// 「定理整理」格式自动识别：
//   **（1.6）定理名**（备注）
//   - **输入**：...
//   - **输出**：...（可跨行，含 $$ 公式）
// 一个文件可含多条，每条生成一条记录；来源论文从
// 引言的《标题》（作者, 期刊）和 ## 章节标题自动带出。
// ============================================================

const BLOCK_RE = /^\*\*([^*]+?)\*\*(.*)$/
const INPUT_RE = /^\s*[-*]\s*\*\*输入\*\*\s*[：:]\s*(.*)$/
const OUTPUT_RE = /^\s*[-*]\s*\*\*输出\*\*\s*[：:]\s*(.*)$/

function extractCitations(text) {
  const out = []
  const re = /《([^》]+)》\s*[（(]/g
  let m
  while ((m = re.exec(text))) {
    const title = m[1].trim()
    let depth = 1
    let i = re.lastIndex
    while (i < text.length && depth > 0) {
      if (text[i] === '(' || text[i] === '（') depth++
      else if (text[i] === ')' || text[i] === '）') depth--
      i++
    }
    const inner = text.slice(re.lastIndex, i - 1)
    const ci = inner.search(/[，,]/)
    const authors = ci >= 0 ? inner.slice(0, ci).trim() : inner.trim()
    const venue = ci >= 0 ? inner.slice(ci + 1).trim() : ''
    out.push({ title, authors, venue })
  }
  return out
}

const normName = (s) => s.replace(/[–—−-]/g, '-').replace(/\s+/g, '').toLowerCase()

function matchSource(h2Text, citations) {
  const m = h2Text.match(/[（(]([^()（）]+)[)）]\s*$/)
  if (!m) return null
  const name = m[1].trim()
  const hit = citations.find((c) => normName(c.authors) === normName(name))
  return hit || { title: '', authors: name, venue: '' }
}

function extractYear(venue) {
  const m = String(venue || '').match(/\((\d{4})\)/)
  return m ? Number(m[1]) : null
}

export function parseTheoremMd(mdText) {
  const { data, content } = matter(mdText)
  const lines = content.split(/\r?\n/)

  const h1m = content.match(/^#\s+(.+?)\s*$/m)
  const fileTitle = String(data.title || (h1m && h1m[1]) || '').trim()
  if (!fileTitle) throw new Error('缺少标题（frontmatter 的 title 或正文 # 标题）')

  // 引言 = 第一个 ## 之前的内容，从中提取《标题》（作者, 期刊）引用
  const firstH2 = lines.findIndex((l) => /^##\s/.test(l))
  const intro = lines.slice(0, firstH2 === -1 ? lines.length : firstH2).join('\n')
  const citations = extractCitations(intro)

  const entries = []
  let h2 = ''
  let h3 = ''
  let source = null
  let block = null

  const flush = () => {
    if (!block) return
    if (block.cur) block.pairs.push(block.cur)
    block.pairs.forEach((pair, i) => {
      const output = [pair.output, ...(pair.outLines || [])].join('\n').trim()
      const notes = [block.trailing, ...block.extra].filter(Boolean).join('\n').trim()
      entries.push({
        title: block.pairs.length > 1 ? `${block.title}（${i + 1}）` : block.title,
        authors: source ? source.authors.replace(/[–—]/g, ', ') : '',
        year: source ? extractYear(source.venue) : null,
        venue: source && source.venue ? source.venue : null,
        one_liner: source && source.title ? `来自《${source.title}》` : '',
        problem: [h2, h3].filter(Boolean).join(' / '),
        input: pair.input,
        output,
        main_results: '',
        method: '',
        notes,
        status: 'done',
        visibility: 'lab',
        tags: [fileTitle, source ? source.authors : ''].filter(Boolean),
        // 分组键：同一来源论文（作者+期刊）的条目归入同一个"论文文件夹"
        sourceKey: source ? normName(source.authors) + '|' + (source.venue || '') : 'unknown',
        sourceTitle: source ? source.title : ''
      })
    })
    block = null
  }

  for (const line of lines) {
    const h2m = line.match(/^##\s+(.+?)\s*$/)
    const h3m = line.match(/^###\s+(.+?)\s*$/)
    if (h2m) {
      flush()
      h2 = h2m[1]
      h3 = ''
      source = matchSource(h2, citations)
      continue
    }
    if (h3m) {
      flush()
      h3 = h3m[1]
      continue
    }
    if (/^---\s*$/.test(line)) {
      flush()
      continue
    }
    const bm = line.match(BLOCK_RE)
    if (bm) {
      flush()
      block = { title: bm[1].trim(), trailing: bm[2].trim(), pairs: [], cur: null, extra: [] }
      continue
    }
    if (!block) continue
    const im = line.match(INPUT_RE)
    const om = line.match(OUTPUT_RE)
    if (im) {
      if (block.cur) block.pairs.push(block.cur)
      block.cur = { input: im[1].trim(), output: '', outLines: [] }
      continue
    }
    if (om) {
      if (!block.cur) block.cur = { input: '', output: '', outLines: [] }
      block.cur.output = om[1].trim()
      block.cur.outLines = []
      continue
    }
    if (block.cur && block.cur.output !== '') block.cur.outLines.push(line)
    else block.extra.push(line)
  }
  flush()

  if (!entries.length) throw new Error('未识别到「输入/输出」条目')
  return entries
}

/**
 * 统一入口：自动识别格式。
 * 返回 { type: 'paper', paper } 或 { type: 'theorems', entries }
 */
export function parseAnyMd(mdText) {
  if (!mdText || !mdText.trim()) throw new Error('md 内容为空')
  const { content } = matter(mdText)
  const hasTheoremBullets = content.split(/\r?\n/).some((l) => INPUT_RE.test(l))
  if (hasTheoremBullets) {
    return { type: 'theorems', entries: parseTheoremMd(mdText) }
  }
  return { type: 'paper', paper: parsePaperMd(mdText) }
}

export const MD_TEMPLATE = `---
title: 论文标题
authors: 作者1, 作者2
year: 2026
venue: 期刊/会议
arxiv: 2601.12345
doi: 10.xxxx/xxxx
pdf: https://arxiv.org/pdf/2601.12345
tags: [分析, PDE]
status: done
visibility: lab
---

## 一句话总结
（这篇论文一句话说了什么）

## 问题
（研究什么问题，背景）

## 输入
（例如：边界函数 u ∈ L¹(∂B₁)）

## 输出
（例如：不等式 (1.3) 的证明 + 极值函数的完整分类）

## 主要结果
- 定理 1：...
- 定理 2：...

## 方法
（核心思路、关键引理）

## 笔记
（自由 Markdown，支持 LaTeX：$...$ 和 $$...$$）
`
