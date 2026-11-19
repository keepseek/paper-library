<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  paper: { type: Object, required: true }
})

const STATUS = {
  todo: { label: '待读', cls: 'bg-ink-100 text-ink-600' },
  reading: { label: '在读', cls: 'bg-amber-100 text-amber-700' },
  done: { label: '已读', cls: 'bg-emerald-100 text-emerald-700' }
}
</script>

<template>
  <RouterLink :to="`/paper/${paper.id}`" class="card block transition-shadow hover:shadow-md">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-semibold leading-snug text-ink-900 hover:text-accent-600">{{ paper.title }}</h3>
      <span class="badge shrink-0" :class="STATUS[paper.status]?.cls || STATUS.todo.cls">
        {{ STATUS[paper.status]?.label || paper.status }}
      </span>
    </div>
    <p v-if="paper.one_liner" class="mt-2 line-clamp-2 text-sm text-ink-600">{{ paper.one_liner }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-1.5">
      <span v-for="t in paper.tags" :key="t" class="tag">{{ t }}</span>
      <span class="ml-auto text-xs text-ink-400">
        {{ [paper.year, paper.venue].filter(Boolean).join(' · ') }}
      </span>
    </div>
  </RouterLink>
</template>
