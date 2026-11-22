<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getPaper, store, fmtBytes } from '../data.js'
import { renderMarkdown } from '../md.js'
import { paperToMarkdown, theoremToMarkdown, download, copyText } from '../export.js'

const route = useRoute()
const paper = computed(() => getPaper(route.params.id))
const copied = ref(false)
const copiedPaper = ref(false)

function makeBibtex(p) {
  const first = (p.authors || 'unknown').split(/[,，]/)[0].trim().replace(/\s+/g, '')
  const key = (first + (p.year || '')).toLowerCase()
  const esc = (s) => (s || '').replace(/&/g, '\\&')
  const lines = ['@article{' + key + ',']
  if (p.title) lines.push('  title   = {' + esc(p.title) + '},')
  if (p.authors) lines.push('  author  = {' + esc(p.authors) + '},')
  if (p.year) lines.push('  year    = {' + p.year + '},')
  if (p.venue) lines.push('  journal = {' + esc(p.venue) + '}')
  lines.push('}')
  return lines.join('\n')
}

async function copyBibtex() {
  if (!paper.value) return
  try {
    await navigator.clipboard.writeText(makeBibtex(paper.value))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}

function exportPaper() {
  if (!paper.value) return
  download(`${paper.value.id}.md`, paperToMarkdown(paper.value))
}

async function copyPaper() {
  if (!paper.value) return
  const ok = await copyText(paperToMarkdown(paper.value))
  if (ok) {
    copiedPaper.value = true
    setTimeout(() => (copiedPaper.value = false), 1500)
  }
}

function exportTheorem(r) {
  if (!paper.value) return
  download(`${r.id}.md`, theoremToMarkdown(paper.value, r))
}

function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div v-if="!store.loaded" class="py-20 text-center text-sm text-ink-400">加载中…</div>

  <div v-else-if="!paper" class="py-20 text-center text-sm text-red-600">
    找不到这篇论文（id: {{ route.params.id }}）
    <div class="mt-4">
      <RouterLink to="/" class="btn-ghost">返回论文库</RouterLink>
    </div>
  </div>

  <div v-else class="mx-auto max-w-3xl">
    <div class="mb-2 flex items-center gap-2 text-xs text-ink-400">
      <RouterLink to="/" class="hover:text-accent-600">← 论文库</RouterLink>
    </div>

    <div class="card">
      <div class="flex items-start justify-between gap-3">
        <h1 class="font-serif text-xl font-bold leading-snug text-ink-900">{{ paper.title }}</h1>
        <span
          class="badge shrink-0"
          :class="paper.is_read ? 'bg-ink-900 text-paper-50' : 'border border-ink-200 bg-paper-100 text-ink-400'"
        >
          {{ paper.is_read ? '已读' : '未读' }}
        </span>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-600">
        <span v-if="paper.authors">{{ paper.authors }}</span>
        <span v-if="paper.year">· {{ paper.year }}</span>
        <span v-if="paper.venue">· {{ paper.venue }}</span>
        <a v-if="paper.pdf_url" :href="paper.pdf_url" target="_blank" class="text-accent-600 underline">PDF</a>
        <a v-if="paper.html_url" :href="paper.html_url" target="_blank" class="text-accent-600 underline">HTML 版</a>
        <a v-if="paper.arxiv_id" :href="`https://arxiv.org/abs/${paper.arxiv_id}`" target="_blank" class="text-accent-600 underline">arXiv:{{ paper.arxiv_id }}</a>
        <a v-if="paper.doi" :href="`https://doi.org/${paper.doi}`" target="_blank" class="text-accent-600 underline">DOI</a>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <span v-for="t in paper.tags" :key="t" class="tag">{{ t }}</span>
      </div>

      <section v-if="paper.abstract" class="mt-5">
        <h2 class="section-title mb-1">摘要</h2>
        <p class="text-sm leading-7 text-ink-600">{{ paper.abstract }}</p>
      </section>

      <section v-if="paper.local_pdfs?.length" class="mt-5">
        <h2 class="section-title mb-2">本地 PDF</h2>
        <div class="space-y-1.5 text-sm">
          <div v-for="f in paper.local_pdfs" :key="f.file" class="flex flex-wrap items-center gap-2">
            <span class="badge border border-accent-200 bg-accent-50 text-accent-700">本地</span>
            <span class="text-ink-700">{{ f.file }}</span>
            <span class="text-xs text-ink-400">{{ fmtBytes(f.size) }}</span>
            <span class="text-xs text-ink-300">未托管到网站</span>
          </div>
        </div>
      </section>

      <div class="mt-6 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
        <button class="btn-ghost text-xs" @click="copyBibtex">
          {{ copied ? '✓ 已复制' : '复制 BibTeX' }}
        </button>
        <button class="btn-ghost text-xs" @click="exportPaper">导出 Markdown</button>
        <button class="btn-ghost text-xs" @click="copyPaper">
          {{ copiedPaper ? '✓ 已复制' : '复制 Markdown' }}
        </button>
        <span class="ml-auto text-xs text-ink-400">
          数据源：Agentero vault
          <template v-if="store.generatedAt"> · 生成于 {{ fmtDate(store.generatedAt) }}</template>
        </span>
      </div>
    </div>

    <!-- 定理条目 -->
    <section class="mt-6">
      <h2 class="section-title mb-3">
        定理条目
        <span class="ml-1 text-sm font-normal text-ink-400">（{{ paper.results?.length || 0 }}）</span>
      </h2>

      <p v-if="!paper.results?.length" class="card py-8 text-center text-sm text-ink-400">
        这篇论文还没有定理条目。
      </p>

      <div v-else class="space-y-4">
        <div v-for="r in paper.results" :key="r.id" class="card">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-serif text-[15px] font-semibold text-ink-900">{{ r.title }}</h3>
            <button class="btn-ghost shrink-0 text-xs" @click="exportTheorem(r)" title="导出这条定理为 Markdown">
              导出
            </button>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="io-input">
              <div class="io-label text-accent-700">输入</div>
              <div class="prose-md" v-html="renderMarkdown(r.input) || '<span class=&quot;text-ink-400&quot;>（未填写）</span>'"></div>
            </div>
            <div class="io-output">
              <div class="io-label text-ink-600">输出</div>
              <div class="prose-md" v-html="renderMarkdown(r.output) || '<span class=&quot;text-ink-400&quot;>（未填写）</span>'"></div>
            </div>
          </div>

          <div v-if="r.notes" class="mt-3 border-t border-ink-100 pt-3">
            <div class="prose-md" v-html="renderMarkdown(r.notes)"></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
