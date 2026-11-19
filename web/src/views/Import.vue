<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api.js'

const router = useRouter()
const mdText = ref('')
const fileName = ref('')
const busy = ref(false)
const error = ref('')
const ok = ref('')

function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => (mdText.value = String(reader.result))
  reader.readAsText(file, 'utf-8')
}

async function downloadTemplate() {
  const res = await fetch('/api/papers/md-template')
  const text = await res.text()
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'paper-template.md'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function submit() {
  if (!mdText.value.trim()) {
    error.value = '请先选择或粘贴 md 内容'
    return
  }
  busy.value = true
  error.value = ''
  ok.value = ''
  try {
    const r = await api('/papers/import-md', { method: 'POST', body: { md: mdText.value } })
    if (r.imported) {
      ok.value = `导入成功：自动识别出 ${r.imported} 条「输入/输出」记录，归入 ${r.papers?.length || 0} 篇论文`
      setTimeout(() => router.push('/'), 800)
    } else {
      ok.value = `导入成功：《${r.title}》`
      setTimeout(() => router.push('/paper/' + r.id), 800)
    }
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-1 text-lg font-bold text-ink-900">导入 md 文件</h1>
    <p class="mb-4 text-sm text-ink-400">
      上传 md 文件即可入库。两种格式都支持：① 模板格式（## 输入 / ## 输出 小节）；② 定理整理格式（每条 <b>「**输入**：… / **输出**：…」</b> 自动拆成一条定理条目，按来源论文自动归入对应的论文文件夹）。
      <button class="ml-1 text-accent-600 underline" @click="downloadTemplate">下载模板</button>
    </p>

    <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>
    <p v-if="ok" class="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{{ ok }}</p>

    <div class="card space-y-4">
      <div>
        <label class="label">选择 md 文件</label>
        <input type="file" accept=".md,.markdown,.txt" class="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-100" @change="onFile" />
        <p v-if="fileName" class="mt-1 text-xs text-ink-400">已选择：{{ fileName }}</p>
      </div>

      <div>
        <label class="label">或直接粘贴 md 内容</label>
        <textarea v-model="mdText" class="input font-mono text-xs" rows="14" placeholder="---&#10;title: 论文标题&#10;...&#10;---&#10;&#10;## 输入&#10;..."></textarea>
      </div>

      <button class="btn-primary" :disabled="busy" @click="submit">
        {{ busy ? '导入中…' : '导入' }}
      </button>
    </div>
  </div>
</template>
