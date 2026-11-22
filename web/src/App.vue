<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-paper-50">
    <header class="sticky top-0 z-10 border-b border-ink-100 bg-paper-50/90 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <RouterLink to="/" class="flex items-baseline gap-2">
          <span class="font-serif text-lg font-bold tracking-wide text-ink-900">Meng's Blog</span>
          <span class="text-xs tracking-widest text-ink-400">论文阅读记录库</span>
        </RouterLink>
        <nav class="flex items-center gap-1 text-sm">
          <RouterLink to="/" class="rounded-md px-3 py-1.5 text-ink-600 hover:bg-paper-100 hover:text-ink-900 router-link-active:!bg-paper-100 router-link-active:!text-ink-900 router-link-active:font-medium">
            论文库
          </RouterLink>
          <RouterLink to="/pdfs" class="rounded-md px-3 py-1.5 text-ink-600 hover:bg-paper-100 hover:text-ink-900 router-link-active:!bg-paper-100 router-link-active:!text-ink-900 router-link-active:font-medium">
            PDF 库
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>

    <footer class="border-t border-ink-100 py-6 text-center text-xs tracking-widest text-ink-400">
      MENG'S BLOG · 论文阅读记录库 · 数据由 Agentero vault 同步
    </footer>
  </div>
</template>
