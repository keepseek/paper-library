<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { auth, logout } from './auth.js'

const router = useRouter()

function onLogout() {
  logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-ink-50">
    <header class="sticky top-0 z-10 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <RouterLink to="/" class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-ink-900">Meng's Blog</span>
          <span class="text-xs text-ink-400">论文库</span>
        </RouterLink>
        <nav class="flex items-center gap-1 text-sm">
          <RouterLink to="/" class="rounded-lg px-3 py-1.5 text-ink-600 hover:bg-ink-50 hover:text-ink-900">
            论文库
          </RouterLink>
          <RouterLink
            v-if="auth.user"
            to="/import"
            class="rounded-lg px-3 py-1.5 text-ink-600 hover:bg-ink-50 hover:text-ink-900"
          >
            导入 md
          </RouterLink>
          <RouterLink
            v-if="auth.user?.role === 'owner'"
            to="/members"
            class="rounded-lg px-3 py-1.5 text-ink-600 hover:bg-ink-50 hover:text-ink-900"
          >
            成员
          </RouterLink>
          <template v-if="auth.user">
            <span class="ml-2 hidden text-xs text-ink-400 sm:inline">{{ auth.user.name }}</span>
            <button @click="onLogout" class="ml-1 rounded-lg px-3 py-1.5 text-ink-600 hover:bg-ink-50">
              退出
            </button>
          </template>
          <RouterLink v-else to="/login" class="btn-primary ml-2 !py-1.5">登录</RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>

    <footer class="border-t border-ink-100 py-6 text-center text-xs text-ink-400">
      Meng's Blog · 论文阅读记录库
    </footer>
  </div>
</template>
