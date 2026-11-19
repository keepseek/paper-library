<script setup>
import { ref, onMounted, watch } from 'vue'
import { api } from '../api.js'
import { auth } from '../auth.js'
import PaperCard from '../components/PaperCard.vue'

const papers = ref([])
const tags = ref([])
const loading = ref(false)
const error = ref('')

// 搜索
const query = ref('')
const searching = ref(false)
const searchResults = ref(null) // null = 未搜索，显示列表

// 筛选
const fTag = ref('')
const fStatus = ref('')

async function loadTags() {
  try {
    // 标签从已有论文聚合
    const all = await api('/papers')
    const set = new Set()
    for (const p of all) for (const t of p.tags) set.add(t)
    tags.value = [...set].sort()
  } catch {}
}

async function loadPapers() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (fTag.value) params.set('tag', fTag.value)
    if (fStatus.value) params.set('status', fStatus.value)
    const qs = params.toString()
    papers.value = await api('/papers' + (qs ? '?' + qs : ''))
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function doSearch() {
  const q = query.value.trim()
  if (!q) {
    searchResults.value = null
    return
  }
  searching.value = true
  error.value = ''
  try {
    const { results } = await api('/papers/search?q=' + encodeURIComponent(q))
    searchResults.value = results
  } catch (e) {
    error.value = e.message
  } finally {
    searching.value = false
  }
}

function clearSearch() {
  query.value = ''
  searchResults.value = null
}

watch([fTag, fStatus], () => {
  if (!searchResults.value) loadPapers()
})

onMounted(() => {
  loadPapers()
  loadTags()
})
</script>

<template>
  <div>
    <!-- 反查搜索框 -->
    <div class="card mb-6 !p-5">
      <h1 class="mb-1 text-lg font-bold text-ink-900">用结果描述反查论文</h1>
      <p class="mb-3 text-sm text-ink-400">
        粘贴你读过的"输入 / 输出"描述，例如：输入 边界函数 u ∈ L¹(∂B₁)，输出 极值函数的完整分类
      </p>
      <div class="flex gap-2">
        <input
          v-model="query"
          class="input flex-1"
          placeholder="输入关键词或结果描述（至少 3 个字符）"
          @keyup.enter="doSearch"
        />
        <button class="btn-primary" :disabled="searching" @click="doSearch">
          {{ searching ? '搜索中…' : '搜索' }}
        </button>
        <button v-if="searchResults !== null" class="btn-ghost" @click="clearSearch">清除</button>
      </div>
    </div>

    <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

    <!-- 搜索结果 -->
    <template v-if="searchResults !== null">
      <p class="mb-3 text-sm text-ink-600">
        找到 <b>{{ searchResults.length }}</b> 篇相关论文
      </p>
      <div v-if="searchResults.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div v-for="p in searchResults" :key="p.id" class="card">
          <RouterLink :to="`/paper/${p.id}`" class="font-semibold text-ink-900 hover:text-accent-600">
            {{ p.title }}
          </RouterLink>
          <div class="mt-2 space-y-1 text-sm text-ink-600">
            <p v-if="p.sn_oneliner" class="line-clamp-2">
              <span class="mr-1 text-xs text-ink-400">总结</span>
              <span v-html="p.sn_oneliner"></span>
            </p>
            <p v-if="p.sn_input" class="line-clamp-2">
              <span class="mr-1 text-xs text-ink-400">输入</span>
              <span v-html="p.sn_input"></span>
            </p>
            <p v-if="p.sn_output" class="line-clamp-2">
              <span class="mr-1 text-xs text-ink-400">输出</span>
              <span v-html="p.sn_output"></span>
            </p>
          </div>
        </div>
      </div>
      <p v-else class="py-10 text-center text-sm text-ink-400">
        没有匹配的论文。试试更短的关键词，或检查是否已录入。
      </p>
    </template>

    <!-- 论文列表 -->
    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <h2 class="mr-2 text-base font-semibold text-ink-900">全部论文（{{ papers.length }}）</h2>
        <select v-model="fTag" class="input !w-auto">
          <option value="">全部标签</option>
          <option v-for="t in tags" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-model="fStatus" class="input !w-auto">
          <option value="">全部状态</option>
          <option value="todo">待读</option>
          <option value="reading">在读</option>
          <option value="done">已读</option>
        </select>
        <RouterLink v-if="auth.user" to="/paper/new" class="btn-primary ml-auto">+ 添加论文</RouterLink>
      </div>

      <p v-if="loading" class="py-10 text-center text-sm text-ink-400">加载中…</p>
      <p v-else-if="!papers.length" class="py-10 text-center text-sm text-ink-400">
        还没有论文。{{ auth.user ? '点右上角「+ 添加论文」开始记录。' : '登录后即可添加论文。' }}
      </p>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PaperCard v-for="p in papers" :key="p.id" :paper="p" />
      </div>
    </template>
  </div>
</template>
