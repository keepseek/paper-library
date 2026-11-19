<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'

const route = useRoute()
const router = useRouter()
const isEdit = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({
  title: '',
  authors: '',
  year: '',
  venue: '',
  arxiv_id: '',
  doi: '',
  pdf_url: '',
  status: 'todo',
  visibility: 'lab',
  one_liner: '',
  problem: '',
  input: '',
  output: '',
  main_results: '',
  method: '',
  notes: '',
  tags: ''
})

async function load() {
  if (!route.params.id) return
  isEdit.value = true
  try {
    const p = await api('/papers/' + route.params.id)
    form.value = {
      title: p.title,
      authors: p.authors,
      year: p.year ?? '',
      venue: p.venue || '',
      arxiv_id: p.arxiv_id || '',
      doi: p.doi || '',
      pdf_url: p.pdf_url || '',
      status: p.status,
      visibility: p.visibility,
      one_liner: p.one_liner,
      problem: p.problem,
      input: p.input,
      output: p.output,
      main_results: p.main_results,
      method: p.method,
      notes: p.notes,
      tags: (p.tags || []).join(', ')
    }
  } catch (e) {
    error.value = e.message
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const body = {
      ...form.value,
      year: form.value.year ? Number(form.value.year) : null,
      tags: form.value.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    }
    if (isEdit.value) {
      await api('/papers/' + route.params.id, { method: 'PUT', body })
    } else {
      await api('/papers', { method: 'POST', body })
    }
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-4 text-lg font-bold text-ink-900">{{ isEdit ? '编辑论文' : '添加论文' }}</h1>
    <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

    <div class="card space-y-4">
      <div>
        <label class="label">标题 *</label>
        <input v-model="form.title" class="input" placeholder="论文标题" />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="label">作者</label>
          <input v-model="form.authors" class="input" placeholder="作者1, 作者2" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">年份</label>
            <input v-model="form.year" class="input" placeholder="2026" />
          </div>
          <div>
            <label class="label">期刊/会议</label>
            <input v-model="form.venue" class="input" placeholder="Annals of Math" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="label">arXiv 号</label>
          <input v-model="form.arxiv_id" class="input" placeholder="2601.12345" />
        </div>
        <div>
          <label class="label">DOI</label>
          <input v-model="form.doi" class="input" placeholder="10.xxxx/xxxx" />
        </div>
        <div>
          <label class="label">PDF 链接</label>
          <input v-model="form.pdf_url" class="input" placeholder="https://..." />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">阅读状态</label>
          <select v-model="form.status" class="input">
            <option value="todo">待读</option>
            <option value="reading">在读</option>
            <option value="done">已读</option>
          </select>
        </div>
        <div>
          <label class="label">可见性</label>
          <select v-model="form.visibility" class="input">
            <option value="private">仅自己</option>
            <option value="lab">同门可见</option>
            <option value="public">公开</option>
          </select>
        </div>
      </div>

      <div>
        <label class="label">标签（逗号分隔）</label>
        <input v-model="form.tags" class="input" placeholder="分析, PDE, 极值问题" />
      </div>

      <div>
        <label class="label">一句话总结</label>
        <input v-model="form.one_liner" class="input" placeholder="这篇论文一句话说了什么" />
      </div>

      <div>
        <label class="label">问题背景</label>
        <textarea v-model="form.problem" class="input" rows="3" placeholder="研究什么问题"></textarea>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="label">输入</label>
          <textarea v-model="form.input" class="input" rows="3" placeholder="例如：边界函数 u ∈ L¹(∂B₁)"></textarea>
        </div>
        <div>
          <label class="label">输出</label>
          <textarea v-model="form.output" class="input" rows="3" placeholder="例如：不等式 (1.3) 的证明 + 极值函数分类"></textarea>
        </div>
      </div>

      <div>
        <label class="label">主要结果</label>
        <textarea v-model="form.main_results" class="input" rows="3" placeholder="- 定理 1：..."></textarea>
      </div>

      <div>
        <label class="label">方法</label>
        <textarea v-model="form.method" class="input" rows="3" placeholder="核心思路、关键引理"></textarea>
      </div>

      <div>
        <label class="label">笔记（Markdown + LaTeX）</label>
        <textarea v-model="form.notes" class="input font-mono text-xs" rows="10" placeholder="支持 $...$ 和 $$...$$ 公式"></textarea>
      </div>

      <div class="flex gap-2 border-t border-ink-100 pt-4">
        <button class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <RouterLink to="/" class="btn-ghost">取消</RouterLink>
      </div>
    </div>
  </div>
</template>
