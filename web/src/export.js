// 客户端导出：单条定理 / 整篇论文 → Markdown，支持复制 + 下载。
// 纯前端，无后端依赖。

// 单条定理 → Markdown（withSource=false 时省略「来源」行，用于整篇导出内嵌）
export function theoremToMarkdown(paper, r, withSource = true) {
  const lines = []
  lines.push(`## ${r.title}`)
  lines.push('')
  lines.push(`- **输入**：${r.input || '（未填写）'}`)
  lines.push(`- **输出**：${r.output || '（未填写）'}`)
  if (r.notes) lines.push(`- **备注**：${r.notes}`)
  if (withSource) {
    lines.push('')
    const src = [paper.title, paper.authors, paper.year].filter(Boolean).join('，')
    lines.push(`> 来源：${src}`)
  }
  return lines.join('\n')
}

// 整篇论文 → Markdown
export function paperToMarkdown(paper) {
  const lines = []
  lines.push(`# ${paper.title}`)
  lines.push('')
  const meta = [paper.authors, paper.year, paper.venue].filter(Boolean).join('，')
  if (meta) {
    lines.push(`> ${meta}`)
    lines.push('')
  }
  if (paper.abstract) {
    lines.push('## 摘要')
    lines.push('')
    lines.push(paper.abstract)
    lines.push('')
  }
  if (paper.results?.length) {
    lines.push('## 定理条目')
    lines.push('')
    for (const r of paper.results) {
      lines.push(theoremToMarkdown(paper, r, false).replace(/^## /, '### '))
      lines.push('')
    }
  }
  const links = []
  if (paper.arxiv_id) links.push(`arXiv: https://arxiv.org/abs/${paper.arxiv_id}`)
  if (paper.doi) links.push(`DOI: https://doi.org/${paper.doi}`)
  if (paper.pdf_url) links.push(`PDF: ${paper.pdf_url}`)
  if (links.length) {
    lines.push('## 链接')
    lines.push('')
    for (const l of links) lines.push(`- ${l}`)
  }
  return lines.join('\n')
}

// 触发浏览器下载
export function download(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 复制到剪贴板，成功返回 true
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
