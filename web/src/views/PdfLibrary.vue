<script setup>
import { ref, computed } from 'vue'
import { store, pdfEntries, stats, fmtBytes, allTags } from '../data.js'

const query = ref('')
const fSource = ref('') // '' | 'local' | 'external' | 'none'
const fYear = ref('')
const fTag = ref('')
const sortBy = ref('year') // 'year' | 'size' | 'title'

const entries = computed(() => pdfEntries())
const st = computed(() => stats())
const tags = computed(() => allTags())

const years = computed(() => {
  const s = new Set()
  for (const e of entries.value) if (e.paper.year) s.add(e.paper.year)
  return [...s].sort((a, b) => b - a)
})

const externalCount = computed(() => entries.value.filter((e) => e.hasExternal).length)
const missingCount = computed(() => entries.value.filter((e) => !e.hasLocal && !e.hasExternal).length)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = entries.value.filter((e) => {
    const p = e.paper
    if (fSource.value === 'local' && !e.hasLocal) return false
    if (fSource.value === 'external' && !e.hasExternal) return false
    if (fSource.value === 'none' && (e.hasLocal || e.hasExternal)) return false
    if (fYear.value && String(p.year) !== String(fYear.value)) return false
    if (fTag.value && !(p.tags || []).includes(fTag.value)) return false
    if (q) {
      const text = [p.title, p.authors, p.venue, (p.tags || []).join(' ')].join(' ').toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })
  if (sortBy.value === 'size') list.sort((a, b) => b.size - a.size || a.paper.title.localeCompare(b.paper.title, 'zh'))
  else if (sortBy.value === 'title') list.sort((a, b) => a.paper.title.localeCompare(b.paper.title, 'zh'))
  else list.sort((a, b) => (b.paper.year || 0) - (a.paper.year || 0) || a.paper.title.localeCompare(b.paper.title, 'zh'))
  return list
})
</script>

<template>
  <div>
    <!-- 标题 + 统计 -->
    <div class="card mb-6 !p-5">
      <h1 class="mb-1 font-serif text-lg font-bold text-ink-900">PDF 库</h1>
      <p class="mb-4 text-sm text-ink-400">
        收录所有论文的 PDF 情况：本地 PDF（文件名 + 大小）、arXiv / DOI 外链，以及还缺 PDF 的论文。
        本地 PDF 暂只登记、未托管到网站（托管功能后续开放）。
      </p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-md border border-ink-100 bg-paper-50 p-3">
          <div class="font-serif text-2xl font-bold text-ink-900">{{ st.pdfs }}</div>
          <div class="text-xs text-ink-400">本地 PDF</div>
        </div>
        <div class="rounded-md border border-ink-100 bg-paper-50 p-3">
          <div class="font-serif text-2xl font-bold text-ink-900">{{ fmtBytes(st.pdfSize) }}</div>
          <div class="text-xs text-ink-400">本地总大小</div>
        </div>
        <div class="rounded-md border border-ink-100 bg-paper-50 p-3">
          <div class="font-serif text-2xl font-bold text-ink-900">{{ externalCount }}</div>
          <div class="text-xs text-ink-400">有外链</div>
        </div>
        <div class="rounded-md border border-ink-100 bg-paper-50 p-3">
          <div class="font-serif text-2xl font-bold text-accent-600">{{ missingCount }}</div>
          <div class="text-xs text-ink-400">缺 PDF</div>
        </div>
      </div>
    </div>

    <!-- 搜索 + 筛选 -->
    <div class="card mb-4 !p-4">
      <div class="flex flex-col gap-3">
        <input v-model="query" class="input" placeholder="按标题 / 作者 / 标签搜索" />
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="fSource" class="input !w-auto">
            <option value="">全部来源</option>
            <option value="local">有本地 PDF</option>
            <option value="external">有外链</option>
            <option value="none">缺 PDF</option>
          </select>
          <select v-model="fYear" class="input !w-auto">
            <option value="">全部年份</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <select v-model="fTag" class="input !w-auto">
            <option value="">全部标签</option>
            <option v-for="t in tags" :key="t" :value="t">{{ t }}</option>
          </select>
          <select v-model="sortBy" class="input !w-auto">
            <option value="year">按年份</option>
            <option value="size">按大小</option>
            <option value="title">按标题</option>
          </select>
          <span class="ml-auto text-xs text-ink-400">{{ filtered.length }} / {{ entries.length }} 篇</span>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <p v-if="store.error" class="py-10 text-center text-sm text-red-600">{{ store.error }}</p>
    <p v-else-if="!store.loaded" class="py-10 text-center text-sm text-ink-400">加载中…</p>
    <p v-else-if="!filtered.length" class="py-10 text-center text-sm text-ink-400">没有匹配的论文。</p>

    <div v-else class="space-y-3">
      <div v-for="e in filtered" :key="e.paper.id" class="card">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <RouterLink
              :to="`/paper/${e.paper.id}`"
              class="font-serif text-[15px] font-semibold text-ink-900 hover:text-accent-600"
            >
              {{ e.paper.title }}
            </RouterLink>
            <p class="mt-1 text-xs text-ink-500">
              {{ e.paper.authors }}
              <template v-if="e.paper.year"> · {{ e.paper.year }}</template>
              <template v-if="e.paper.venue"> · {{ e.paper.venue }}</template>
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span v-if="e.hasLocal" class="badge border border-accent-200 bg-accent-50 text-accent-700">
                本地 · {{ e.local.map((f) => f.file).join(', ') }} · {{ fmtBytes(e.size) }}
              </span>
              <a
                v-if="e.hasExternal"
                :href="e.external"
                target="_blank"
                class="badge bg-ink-900 text-paper-50 hover:bg-ink-700"
              >
                {{ e.externalKind === 'arxiv' ? 'arXiv' : e.externalKind === 'doi' ? 'DOI' : '外链' }} ↗
              </a>
              <span v-if="!e.hasLocal && !e.hasExternal" class="badge border border-ink-200 bg-paper-100 text-ink-400">
                无 PDF
              </span>
              <span v-for="t in e.paper.tags" :key="t" class="tag">{{ t }}</span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <a v-if="e.hasExternal" :href="e.external" target="_blank" class="btn-ghost text-xs">查看 PDF</a>
            <span v-else-if="e.hasLocal" class="text-xs text-ink-300" title="本地 PDF 尚未托管到网站">未托管</span>
            <RouterLink :to="`/paper/${e.paper.id}`" class="btn-ghost text-xs">论文详情</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
