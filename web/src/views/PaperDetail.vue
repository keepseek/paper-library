<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getPaper, store } from '../data.js'
import { renderMarkdown } from '../md.js'

const route = useRoute()
const paper = computed(() => getPaper(route.params.id))
const copied = ref(false)

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
      <h1 class="font-serif text-xl font-bold leading-snug text-ink-900">{{ paper.title }}</h1>

      <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-600">
        <span v-if="paper.authors">{{ paper.authors }}</span>
        <span v-if="paper.year">· {{ paper.year }}</span>
        <span v-if="paper.venue">· {{ paper.venue }}</span>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <span v-for="t in paper.tags" :key="t" class="tag">{{ t }}</span>
      </div>

      <div class="mt-6 border-t border-ink-100 pt-4">
        <button class="btn-ghost text-xs" @click="copyBibtex">
          {{ copied ? '✓ 已复制' : '复制 BibTeX' }}
        </button>
        <span class="ml-3 text-xs text-ink-400">
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
          <h3 class="font-serif text-[15px] font-semibold text-ink-900">{{ r.title }}</h3>

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
