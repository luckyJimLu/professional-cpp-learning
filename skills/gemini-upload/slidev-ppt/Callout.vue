<script setup lang="ts">
/**
 * 提示框：type = info（青蓝）| good（绿）| bad（红）。
 * 用法：<Callout type="bad" title="迷思">掌握新特性 ≠ 高质量软件</Callout>
 */
withDefaults(defineProps<{
  type?: 'info' | 'good' | 'bad'
  title?: string
}>(), { type: 'info' })

const icons = { info: '💡', good: '✅', bad: '❌' } as const
</script>

<template>
  <div class="pc-callout" :class="type">
    <div v-if="title" class="pc-callout-title">{{ icons[type] }} {{ title }}</div>
    <div class="pc-callout-body"><slot /></div>
  </div>
</template>

<style scoped>
.pc-callout {
  border-radius: var(--pc-radius);
  padding: 0.7rem 1rem;
  border: 1px solid var(--pc-border);
  background: var(--pc-surface);
  font-size: 0.92rem;
}
.pc-callout.info { border-left: 4px solid var(--pc-accent); }
.pc-callout.good { border-left: 4px solid var(--pc-good); }
.pc-callout.bad  { border-left: 4px solid var(--pc-bad); }
.pc-callout-title { font-weight: 700; margin-bottom: 0.25rem; }
.pc-callout.info .pc-callout-title { color: var(--pc-accent); }
.pc-callout.good .pc-callout-title { color: var(--pc-good); }
.pc-callout.bad  .pc-callout-title { color: var(--pc-bad); }
.pc-callout-body :deep(p) { margin: 0.2rem 0; }
</style>
