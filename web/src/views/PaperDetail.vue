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
  if (!confirm('确定删除这篇论文？此操作不可恢复。')) return
  try {
    await api('/papers/' + paper.value.id, { method: 'DELETE' })
    router.push('/')
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
        <h1 class="text-xl font-bold leading-snug text-ink-900">{{ paper.title }}</h1>
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

      <!-- 输入 / 输出 高亮区 -->
      <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-accent-100 bg-accent-50 p-3">
          <div class="mb-1 text-xs font-semibold text-accent-700">输入</div>
          <div class="prose-md" v-html="renderMarkdown(paper.input) || '<span class=&quot;text-ink-400&quot;>（未填写）</span>'"></div>
        </div>
        <div class="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <div class="mb-1 text-xs font-semibold text-emerald-700">输出</div>
          <div class="prose-md" v-html="renderMarkdown(paper.output) || '<span class=&quot;text-ink-400&quot;>（未填写）</span>'"></div>
        </div>
      </div>

      <section v-if="paper.one_liner" class="mt-5">
        <h2 class="mb-1 text-sm font-semibold text-ink-900">一句话总结</h2>
        <p class="text-sm text-ink-600">{{ paper.one_liner }}</p>
      </section>

      <section v-if="paper.problem" class="mt-5">
        <h2 class="mb-1 text-sm font-semibold text-ink-900">问题</h2>
        <div class="prose-md" v-html="renderMarkdown(paper.problem)"></div>
      </section>

      <section v-if="paper.main_results" class="mt-5">
        <h2 class="mb-1 text-sm font-semibold text-ink-900">主要结果</h2>
        <div class="prose-md" v-html="renderMarkdown(paper.main_results)"></div>
      </section>

      <section v-if="paper.method" class="mt-5">
        <h2 class="mb-1 text-sm font-semibold text-ink-900">方法</h2>
        <div class="prose-md" v-html="renderMarkdown(paper.method)"></div>
      </section>

      <section v-if="paper.notes" class="mt-5">
        <h2 class="mb-1 text-sm font-semibold text-ink-900">笔记</h2>
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
  </div>
</template>
