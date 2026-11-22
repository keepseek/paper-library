<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  paper: { type: Object, required: true }
})
</script>

<template>
  <RouterLink :to="`/paper/${paper.id}`" class="card block transition-shadow hover:shadow-md">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-serif text-[15px] font-semibold leading-snug text-ink-900 hover:text-accent-600">
        {{ paper.title }}
      </h3>
      <span
        class="badge shrink-0"
        :class="paper.is_read ? 'bg-ink-900 text-paper-50' : 'border border-ink-200 bg-paper-100 text-ink-400'"
      >
        {{ paper.is_read ? '已读' : '未读' }}
      </span>
    </div>
    <p v-if="paper.authors" class="mt-1.5 text-xs text-ink-500">
      {{ paper.authors }}
      <template v-if="paper.year"> · {{ paper.year }}</template>
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-1.5">
      <span v-for="t in paper.tags" :key="t" class="tag">{{ t }}</span>
      <span class="ml-auto flex items-center gap-2 text-xs text-ink-400">
        <span v-if="paper.results?.length" class="font-medium text-accent-600">
          {{ paper.results.length }} 条定理
        </span>
        <span v-if="paper.venue">{{ paper.venue }}</span>
      </span>
    </div>
  </RouterLink>
</template>
