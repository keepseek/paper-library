<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import { auth } from '../auth.js'
import { renderMarkdown } from '../md.js'

const route = useRoute()
const router = useRouter()
const paper = ref(null)
const error = ref('')
const bibtex = ref('')
const copied = ref(false)

const notesHtml = computed(() => (paper.value ? renderMarkdown(paper.value.notes) : ''))

const canEdit = computed(
  () => auth.user && (auth.user.role === 'owner' || paper.value?.owner_id === auth.user.id)
)

async function load() {
  error.value = ''
  try {
    paper.value = await api('/papers/' + route.params.id)
  } catch (e) {
    error.value = e.message
  }
}

async function copyBibtex() {
  try {
    bibtex.value = await (await fetch(`/api/papers/${paper.value.id}/bibtex`)).text()
    await navigator.clipboard.writeText(bibtex.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch (e) {
    error.value = '复制失败：' + e.message
  }
}

async function remove() {
  const n = paper.value.results?.length || 0
  const msg = n
    ? `确定删除这篇论文及其下 ${n} 条定理条目？此操作不可恢复。`
    : '确定删除这篇论文？此操作不可恢复。'
  if (!confirm(msg)) return
  try {
    await api('/papers/' + paper.value.id, { method: 'DELETE' })
    router.push('/')
  } catch (e) {
    error.value = e.message
  }
}

async function removeResult(r) {
  if (!confirm(`确定删除定理「${r.title}」？`)) return
  try {
    await api('/papers/results/' + r.id, { method: 'DELETE' })
    load()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(load)
</script>

<template>
  <div v-if="error && !paper" class="py-20 text-center text-sm text-red-600">
    {{ error }}
    <div class="mt-4">
      <RouterLink to="/" class="btn-ghost">返回论文库</RouterLink>
    </div>
  </div>

  <div v-else-if="paper" class="mx-auto max-w-3xl">
    <div class="mb-2 flex items-center gap-2 text-xs text-ink-400">
      <RouterLink to="/" class="hover:text-accent-600">← 论文库</RouterLink>
    </div>

    <div class="card">
      <div class="flex items-start justify-between gap-3">
        <h1 class="font-serif text-xl font-bold leading-snug text-ink-900">{{ paper.title }}</h1>
        <div v-if="canEdit" class="flex shrink-0 gap-2">
          <RouterLink :to="`/paper/${paper.id}/edit`" class="btn-ghost !py-1.5 text-xs">编辑</RouterLink>
          <button class="btn-danger !py-1.5 text-xs" @click="remove">删除</button>
        </div>
      </div>

      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

      <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-600">
        <span v-if="paper.authors">{{ paper.authors }}</span>
        <span v-if="paper.year">· {{ paper.year }}</span>
        <span v-if="paper.venue">· {{ paper.venue }}</span>
        <a v-if="paper.pdf_url" :href="paper.pdf_url" target="_blank" class="text-accent-600 underline">PDF</a>
        <a v-if="paper.arxiv_id" :href="`https://arxiv.org/abs/${paper.arxiv_id}`" target="_blank" class="text-accent-600 underline">arXiv:{{ paper.arxiv_id }}</a>
        <a v-if="paper.doi" :href="`https://doi.org/${paper.doi}`" target="_blank" class="text-accent-600 underline">DOI</a>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <span v-for="t in paper.tags" :key="t" class="tag">{{ t }}</span>
      </div>

      <!-- 论文自身的输入 / 输出（标准模板论文） -->
      <div v-if="paper.input || paper.output" class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="io-input">
          <div class="io-label text-accent-700">输入</div>
          <div class="prose-md" v-html="renderMarkdown(paper.input) || '<span class=&quot;text-ink-400&quot;>（未填写）</span>'"></div>
        </div>
        <div class="io-output">
          <div class="io-label text-ink-600">输出</div>
          <div class="prose-md" v-html="renderMarkdown(paper.output) || '<span class=&quot;text-ink-400&quot;>（未填写）</span>'"></div>
        </div>
      </div>

      <section v-if="paper.one_liner" class="mt-5">
        <h2 class="section-title mb-1">一句话总结</h2>
        <p class="text-sm text-ink-600">{{ paper.one_liner }}</p>
      </section>

      <section v-if="paper.problem" class="mt-5">
        <h2 class="section-title mb-1">问题</h2>
        <div class="prose-md" v-html="renderMarkdown(paper.problem)"></div>
      </section>

      <section v-if="paper.main_results" class="mt-5">
        <h2 class="section-title mb-1">主要结果</h2>
        <div class="prose-md" v-html="renderMarkdown(paper.main_results)"></div>
      </section>

      <section v-if="paper.method" class="mt-5">
        <h2 class="section-title mb-1">方法</h2>
        <div class="prose-md" v-html="renderMarkdown(paper.method)"></div>
      </section>

      <section v-if="paper.notes" class="mt-5">
        <h2 class="section-title mb-1">笔记</h2>
        <div class="prose-md" v-html="notesHtml"></div>
      </section>

      <div class="mt-6 border-t border-ink-100 pt-4">
        <button class="btn-ghost text-xs" @click="copyBibtex">
          {{ copied ? '✓ 已复制' : '复制 BibTeX' }}
        </button>
        <span class="ml-3 text-xs text-ink-400">
          录入：{{ paper.owner?.name }} · 更新于 {{ (paper.updated_at || '').slice(0, 10) }}
        </span>
      </div>
    </div>

    <!-- 定理条目 -->
    <section class="mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="section-title">
          定理条目
          <span class="ml-1 text-sm font-normal text-ink-400">（{{ paper.results?.length || 0 }}）</span>
        </h2>
        <RouterLink v-if="canEdit" :to="`/paper/${paper.id}/results/new`" class="btn-ghost !py-1.5 text-xs">
          + 添加定理
        </RouterLink>
      </div>

      <p v-if="!paper.results?.length" class="card py-8 text-center text-sm text-ink-400">
        这篇论文还没有定理条目。{{ canEdit ? '点右上角「+ 添加定理」，或导入 md 自动拆分。' : '' }}
      </p>

      <div v-else class="space-y-4">
        <div v-for="r in paper.results" :key="r.id" class="card">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-serif text-[15px] font-semibold text-ink-900">{{ r.title }}</h3>
              <p v-if="r.section" class="mt-0.5 text-xs text-ink-400">{{ r.section }}</p>
            </div>
            <div v-if="canEdit" class="flex shrink-0 gap-1.5">
              <RouterLink :to="`/result/${r.id}/edit`" class="btn-ghost !px-2.5 !py-1 text-xs">编辑</RouterLink>
              <button class="btn-danger !px-2.5 !py-1 text-xs" @click="removeResult(r)">删除</button>
            </div>
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
