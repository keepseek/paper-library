// 渲染管线复现测试：marked + marked-katex-extension (+ DOMPurify if jsdom)
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { db } from '../server/src/db.js'

marked.use(markedKatex({ throwOnError: false, nonStandard: true }))

// 与 web/src/md.js 保持一致的预处理：行首 $$ 前补空行
function normalizeDisplayMath(text) {
  return text.replace(/([^\n])\n(?=[ \t]*\$\$)/g, '$1\n\n')
}

// 可选 DOMPurify（需要 jsdom 提供 window）
let purify = null
try {
  const { JSDOM } = await import('jsdom')
  const { default: DOMPurify } = await import('dompurify')
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  purify = DOMPurify(dom.window)
  console.log('[DOMPurify 已加载]\n')
} catch {
  console.log('[DOMPurify 未加载（无 jsdom），只测 marked+katex]\n')
}

const rows = db.prepare('SELECT id, title, input, output, notes FROM papers WHERE parent_id IS NOT NULL ORDER BY parent_id, sort_order').all()

function analyze(html, label) {
  const issues = []
  if (html.includes('katex-error')) issues.push('KaTeX 解析错误(katex-error)')
  // 残留的未解析 $（排除 katex 内部）
  const noKatex = html.replace(/<span class="katex">[\s\S]*?<\/span>\s*<\/span>/g, '')
  if (/\$/.test(noKatex)) issues.push('残留 $ 符号（公式未解析）')
  if (/<em>/.test(html) && /katex/.test(html)) {
    // em 出现在 katex span 内部？
    const m = html.match(/<span class="katex">[\s\S]*?<em>/)
    if (m) issues.push('katex 内部出现 <em>（markdown 干扰公式）')
  }
  // 注：DOMPurify 默认允许 MathML，<math> 属正常输出，不再标记
  if (/<br>/.test(html) && label === 'INPUT') issues.push('输入含 <br>')
  return issues
}

let totalIssues = 0
for (const r of rows) {
  for (const [label, text] of [['INPUT', r.input], ['OUTPUT', r.output], ['NOTES', r.notes]]) {
    if (!text) continue
    const raw = marked.parse(normalizeDisplayMath(text))
    const html = purify ? purify.sanitize(raw) : raw
    const issues = analyze(html, label)
    if (issues.length) {
      totalIssues++
      console.log(`[问题] #${r.id} ${r.title} / ${label}: ${issues.join('; ')}`)
      // 打印问题片段
      const idx = html.search(/katex-error|\$/ )
      console.log('   片段: ' + html.slice(Math.max(0, idx - 100), idx + 200).replace(/\n/g, '⏎'))
    }
  }
}
console.log(`\n共 ${rows.length} 条记录，${totalIssues} 处问题`)
