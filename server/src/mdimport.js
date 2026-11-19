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
