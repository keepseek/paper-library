<script setup>
import { ref, computed } from 'vue'
import { store, allTags, search } from '../data.js'
import PaperCard from '../components/PaperCard.vue'

const query = ref('')
const fTag = ref('')
const results = ref(null) // null = 未搜索，显示列表

const tags = computed(() => allTags())

const filteredPapers = computed(() => {
  if (!fTag.value) return store.papers
  return store.papers.filter((p) => (p.tags || []).includes(fTag.value))
})

const totalResults = computed(() =>
  store.papers.reduce((n, p) => n + (p.results?.length || 0), 0)
)

function doSearch() {
  const q = query.value.trim()
  if (!q) {
    results.value = null
    return
  }
  results.value = search(q)
}

function clearSearch() {
  query.value = ''
  results.value = null
}

// 搜索预览用纯文本摘要：公式折叠为 [公式]
function excerpt(text, n = 160) {
  if (!text) return ''
  const plain = text
    .replace(/\$\$[\s\S]*?\$\$/g, ' [公式] ')
    .replace(/\$[^$\n]*\$/g, ' [公式] ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > n ? plain.slice(0, n) + '…' : plain
}

function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div>
    <!-- 反查搜索框 -->
    <div class="card mb-6 !p-5">
      <h1 class="mb-1 font-serif text-lg font-bold text-ink-900">用结果描述反查论文</h1>
      <p class="mb-3 text-sm text-ink-400">
        粘贴你读过的"输入 / 输出"描述，例如：输入 边界函数 u ∈ L¹(∂B₁)，输出 极值函数的完整分类
      </p>
      <div class="flex gap-2">
        <input
          v-model="query"
          class="input flex-1"
          placeholder="输入关键词或结果描述"
          @keyup.enter="doSearch"
        />
        <button class="btn-primary" @click="doSearch">搜索</button>
        <button v-if="results !== null" class="btn-ghost" @click="clearSearch">清除</button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <template v-if="results !== null">
      <p class="mb-3 text-sm text-ink-600">
        找到 <b>{{ results.length }}</b> 条相关记录
      </p>
      <div v-if="results.length" class="space-y-3">
        <div v-for="(h, i) in results" :key="i" class="card">
          <div class="mb-1 flex items-center gap-2">
            <span
              class="badge"
              :class="h.kind === 'paper' ? 'bg-ink-900 text-paper-50' : 'bg-accent-50 text-accent-700 border border-accent-200'"
            >
              {{ h.kind === 'paper' ? '论文' : '定理' }}
            </span>
            <span v-if="h.kind === 'result'" class="text-xs text-ink-400">
              来自
              <RouterLink :to="`/paper/${h.paper.id}`" class="text-accent-600 underline">
                《{{ h.paper.title }}》
              </RouterLink>
            </span>
          </div>
          <RouterLink
            :to="`/paper/${h.paper.id}`"
            class="font-serif text-[15px] font-semibold text-ink-900 hover:text-accent-600"
          >
            {{ h.kind === 'result' ? h.result.title : h.paper.title }}
          </RouterLink>
          <div v-if="h.kind === 'result'" class="mt-2 space-y-1 text-sm text-ink-600">
            <p v-if="excerpt(h.result.input)" class="line-clamp-2">
              <span class="mr-1 text-xs text-ink-400">输入</span>{{ excerpt(h.result.input) }}
            </p>
            <p v-if="excerpt(h.result.output)" class="line-clamp-2">
              <span class="mr-1 text-xs text-ink-400">输出</span>{{ excerpt(h.result.output) }}
            </p>
          </div>
          <p v-else class="mt-1 text-xs text-ink-500">
            {{ h.paper.authors }}
            <template v-if="h.paper.year"> · {{ h.paper.year }}</template>
            <template v-if="h.paper.venue"> · {{ h.paper.venue }}</template>
          </p>
        </div>
      </div>
      <p v-else class="py-10 text-center text-sm text-ink-400">
        没有匹配的记录。试试更短的关键词，或检查是否已录入。
      </p>
    </template>

    <!-- 论文列表 -->
    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <h2 class="mr-2 font-serif text-base font-semibold text-ink-900">
          全部论文（{{ filteredPapers.length }}）
        </h2>
        <select v-model="fTag" class="input !w-auto">
          <option value="">全部标签</option>
          <option v-for="t in tags" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <p v-if="store.error" class="py-10 text-center text-sm text-red-600">{{ store.error }}</p>
      <p v-else-if="!store.loaded" class="py-10 text-center text-sm text-ink-400">加载中…</p>
      <p v-else-if="!filteredPapers.length" class="py-10 text-center text-sm text-ink-400">
        还没有论文。在 Agentero vault 的 papers/ 下新建论文笔记后，运行 node sync-vault.mjs 同步。
      </p>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PaperCard v-for="p in filteredPapers" :key="p.id" :paper="p" />
      </div>
      <p v-if="store.loaded && !store.error" class="mt-6 text-center text-xs text-ink-300">
        共 {{ store.papers.length }} 篇论文 · {{ totalResults }} 条定理
        <template v-if="store.generatedAt"> · 数据更新于 {{ fmtDate(store.generatedAt) }}</template>
      </p>
    </template>
  </div>
</template>
