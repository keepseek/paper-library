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

/** 渲染 Markdown（含 LaTeX），输出已消毒的 HTML */
export function renderMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(text || ''))
}
