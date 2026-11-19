<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../api.js'
import { auth } from '../auth.js'

const router = useRouter()
const mode = ref('login') // login | register
const form = ref({ email: '', password: '', name: '', inviteCode: '' })
const busy = ref(false)
const error = ref('')

async function submit() {
  busy.value = true
  error.value = ''
  try {
    const path = mode.value === 'login' ? '/auth/login' : '/auth/register'
    const body =
      mode.value === 'login'
        ? { email: form.value.email, password: form.value.password }
        : { email: form.value.email, password: form.value.password, name: form.value.name, inviteCode: form.value.inviteCode }
    const { token, user } = await api(path, { method: 'POST', body })
    setToken(token)
    auth.user = user
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <div class="card">
      <div class="mb-4 flex rounded-lg bg-ink-50 p-1 text-sm">
        <button
          class="flex-1 rounded-md py-1.5 font-medium transition-colors"
          :class="mode === 'login' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'"
          @click="mode = 'login'"
        >
          登录
        </button>
        <button
          class="flex-1 rounded-md py-1.5 font-medium transition-colors"
          :class="mode === 'register' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'"
          @click="mode = 'register'"
        >
          注册
        </button>
      </div>

      <p v-if="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <div class="space-y-3">
        <div v-if="mode === 'register'">
          <label class="label">昵称</label>
          <input v-model="form.name" class="input" placeholder="怎么称呼你" />
        </div>
        <div>
          <label class="label">邮箱</label>
          <input v-model="form.email" type="email" class="input" placeholder="you@example.com" @keyup.enter="submit" />
        </div>
        <div>
          <label class="label">密码</label>
          <input v-model="form.password" type="password" class="input" placeholder="至少 6 位" @keyup.enter="submit" />
        </div>
        <div v-if="mode === 'register'">
          <label class="label">邀请码</label>
          <input v-model="form.inviteCode" class="input" placeholder="所有者生成的邀请码" />
          <p class="mt-1 text-xs text-ink-400">第一个注册的用户自动成为所有者，无需邀请码。</p>
        </div>
        <button class="btn-primary w-full justify-center" :disabled="busy" @click="submit">
          {{ busy ? '…' : mode === 'login' ? '登录' : '注册' }}
        </button>
      </div>
    </div>
  </div>
</template>
