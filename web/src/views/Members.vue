<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'

const members = ref([])
const busy = ref(false)
const error = ref('')
const newInvite = ref(null)
const inviteEmail = ref('')

async function load() {
  error.value = ''
  try {
    members.value = await api('/members')
  } catch (e) {
    error.value = e.message
  }
}

async function createInvite() {
  busy.value = true
  error.value = ''
  newInvite.value = null
  try {
    newInvite.value = await api('/members/invite', {
      method: 'POST',
      body: { email: inviteEmail.value || undefined }
    })
    inviteEmail.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function remove(m) {
  if (!confirm(`确定删除成员 ${m.name}（${m.email}）？其录入的论文也会一并删除。`)) return
  try {
    await api('/members/' + m.id, { method: 'DELETE' })
    load()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-4 text-lg font-bold text-ink-900">成员管理</h1>
    <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

    <div class="card mb-4">
      <h2 class="mb-2 text-sm font-semibold text-ink-900">邀请同门</h2>
      <div class="flex gap-2">
        <input v-model="inviteEmail" class="input flex-1" placeholder="（可选）指定邮箱" />
        <button class="btn-primary" :disabled="busy" @click="createInvite">生成邀请码</button>
      </div>
      <div v-if="newInvite" class="mt-3 rounded-lg bg-accent-50 px-4 py-3 text-sm">
        邀请码：<code class="font-mono text-base font-bold text-accent-700">{{ newInvite.code }}</code>
        <span class="ml-2 text-xs text-ink-400">7 天内有效，用于注册</span>
        <button
          class="ml-2 text-xs text-accent-600 underline"
          @click="navigator.clipboard.writeText(newInvite.code)"
        >
          复制
        </button>
      </div>
    </div>

    <div class="card">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-ink-100 text-left text-xs text-ink-400">
            <th class="py-2">昵称</th>
            <th class="py-2">邮箱</th>
            <th class="py-2">角色</th>
            <th class="py-2">论文数</th>
            <th class="py-2">加入时间</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.id" class="border-b border-ink-50">
            <td class="py-2 font-medium text-ink-900">{{ m.name }}</td>
            <td class="py-2 text-ink-600">{{ m.email }}</td>
            <td class="py-2">
              <span class="badge" :class="m.role === 'owner' ? 'bg-accent-50 text-accent-700' : 'bg-ink-100 text-ink-600'">
                {{ m.role === 'owner' ? '所有者' : '成员' }}
              </span>
            </td>
            <td class="py-2 text-ink-600">{{ m.paper_count }}</td>
            <td class="py-2 text-ink-400">{{ (m.created_at || '').slice(0, 10) }}</td>
            <td class="py-2 text-right">
              <button v-if="m.role !== 'owner'" class="text-xs text-red-600 hover:underline" @click="remove(m)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
