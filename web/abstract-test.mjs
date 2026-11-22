// 临时测试：把 data.json 里所有论文的 abstract 走一遍渲染管线，确认公式被 KaTeX 解析
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import fs from 'node:fs'

marked.use(markedKatex({ throwOnError: false, nonStandard: true }))

let purify = null
try {
  const { JSDOM } = await import('jsdom')
  const { default: DOMPurify } = await import('dompurify')
  purify = DOMPurify(new JSDOM('<!doctype html><html><body></body></html>').window)
} catch { /* 无 jsdom 就跳过消毒 */ }

function normalizeDisplayMath(text) {
  return text.replace(/([^\n])\n(?=[ \t]*\$\$)/g, '$1\n\n')
}

const data = JSON.parse(fs.readFileSync('public/data.json', 'utf8'))
let problems = 0
for (const p of data.papers) {
  if (!p.abstract) continue
  const raw = marked.parse(normalizeDisplayMath(p.abstract))
  const html = purify ? purify.sanitize(raw) : raw
  const issues = []
  if (html.includes('katex-error')) issues.push('KaTeX 解析错误')
  // 去掉 katex span 后若还有裸 $，说明有公式没被解析
  const noKatex = html.replace(/<span class="katex">[\s\S]*?<\/span>\s*<\/span>/g, '')
  if (/\$/.test(noKatex)) issues.push('残留裸 $（公式未解析）')
  const hasKatex = html.includes('class="katex"')
  console.log(`\n=== ${p.id} ===`)
  console.log('  含 KaTeX:', hasKatex, '| 问题:', issues.length ? issues.join('; ') : '无')
  if (issues.length) problems++
  // 打印前 300 字符看效果
  console.log('  片段:', html.slice(0, 300).replace(/\n/g, '⏎'))
}
console.log(`\n共 ${data.papers.filter(p => p.abstract).length} 篇有摘要，${problems} 篇有问题`)
