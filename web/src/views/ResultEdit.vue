<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'

const route = useRoute()
const router = useRouter()

// 两种模式：
//   /paper/:id/results/new  → 新建（parentId = route.params.id）
//   /result/:id/edit        → 编辑（resultId = route.params.id）
const parentId = ref(null)
const resultId = ref(null)
const parentTitle = ref('')
const saving = ref(false)
const error = ref('')

const backTo = computed(() => (parentId.value || resultId.value ? '/paper/' + (parentId.value || resultId.value) : '/'))

const form = ref({
  title: '',
  section: '',
  input: '',
  output: '',
  notes: '',
  tags: ''
})

async function load() {
  error.value = ''
  if (route.path.includes('/results/new')) {
    parentId.value = Number(route.params.id)
    try {
      const p = await api('/papers/' + parentId.value)
      parentTitle.value = p.title
    } catch (e) {
      error.value = e.message
    }
  } else {
    resultId.value = Number(route.params.id)
    try {
      const r = await api('/papers/' + resultId.value)
      form.value = {
        title: r.title,
        section: r.section || '',
        input: r.input,
        output: r.output,
        notes: r.notes,
        tags: (r.tags || []).join(', ')
      }
      if (r.parent_id) {
        const p = await api('/papers/' + r.parent_id)
        parentTitle.value = p.title
        parentId.value = r.parent_id
      }
    } catch (e) {
      error.value = e.message
    }
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const body = {
      ...form.value,
      tags: form.value.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    }
    if (resultId.value) {
      await api('/papers/results/' + resultId.value, { method: 'PUT', body })
    } else {
      await api('/papers/' + parentId.value + '/results', { method: 'POST', body })
    }
    router.push('/paper/' + (parentId.value || resultId.value))
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
    <div class="mb-2 flex items-center gap-2 text-xs text-ink-400">
      <RouterLink :to="backTo" class="hover:text-accent-600">
        ← {{ parentTitle ? `《${parentTitle}》` : '返回论文' }}
      </RouterLink>
    </div>

    <h1 class="mb-4 font-serif text-lg font-bold text-ink-900">
      {{ resultId ? '编辑定理条目' : '添加定理条目' }}
    </h1>
    <p v-if="error" class="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

    <div class="card space-y-4">
      <div>
        <label class="label">定理名称 *</label>
        <input v-model="form.title" class="input" placeholder="例如：（1.6）球上 Poisson 延拓最佳不等式" />
      </div>

      <div>
        <label class="label">所属章节</label>
        <input v-model="form.section" class="input" placeholder="例如：一、L¹ 等周不等式 / 2. 主要引理" />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="label">输入</label>
          <textarea v-model="form.input" class="input" rows="4" placeholder="例如：边界函数 u ∈ L¹(∂B₁)"></textarea>
        </div>
        <div>
          <label class="label">输出</label>
          <textarea v-model="form.output" class="input" rows="4" placeholder="例如：不等式 (1.3) 的证明 + 极值函数分类"></textarea>
        </div>
      </div>

      <div>
        <label class="label">备注（Markdown + LaTeX）</label>
        <textarea v-model="form.notes" class="input font-mono text-xs" rows="6" placeholder="支持 $...$ 和 $$...$$ 公式"></textarea>
      </div>

      <div>
        <label class="label">标签（逗号分隔）</label>
        <input v-model="form.tags" class="input" placeholder="Carleman, 极值问题" />
      </div>

      <div class="flex gap-2 border-t border-ink-100 pt-4">
        <button class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <RouterLink :to="`/paper/${parentId || resultId}`" class="btn-ghost">取消</RouterLink>
      </div>
    </div>
  </div>
</template>
