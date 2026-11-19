import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

marked.use(
  markedKatex({
    throwOnError: false,
    nonStandard: true
  })
)

/**
 * 预处理：在行首 $$ 前补一个空行。
 *
 * 用户的笔记里 $$ 块级公式常紧跟在文字行后（中间没有空行），
 * 而 marked-katex-extension 的块级规则要求 $$ 位于块首，
 * 否则 CommonMark 的 lazy continuation 会把整段并入上一个段落，
 * 块级规则不触发、行内规则又禁止换行，公式便不被识别，
 * 还会被 markdown 破坏（\| → |、\, → ,、成对 _ → <em>）。
 * 补上空行后块级规则即可正常匹配。
 */
function normalizeDisplayMath(text) {
  return text.replace(/([^\n])\n(?=[ \t]*\$\$)/g, '$1\n\n')
}

/** 渲染 Markdown（含 LaTeX），输出已消毒的 HTML */
export function renderMarkdown(text) {
  const md = normalizeDisplayMath(text || '')
  return DOMPurify.sanitize(marked.parse(md))
}
