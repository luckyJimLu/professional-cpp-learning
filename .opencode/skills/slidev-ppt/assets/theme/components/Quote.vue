<script setup lang="ts">
/**
 * 金句框：琥珀色左边框，英文原文（默认插槽）+ 中文译文 + 作者。
 * 用法：<Quote author="Kent Beck" zh="依赖是……">Dependency is ...</Quote>
 */
defineProps<{
  author: string
  zh?: string
}>()
</script>

<template>
  <figure class="pc-quote">
    <blockquote class="pc-quote-en"><slot /></blockquote>
    <p v-if="zh" class="pc-quote-zh">{{ zh }}</p>
    <figcaption class="pc-quote-author">— {{ author }}</figcaption>
  </figure>
</template>

<style scoped>
.pc-quote {
  margin: 0;
  padding: 0.8rem 1.2rem;
  border-left: 4px solid var(--pc-quote);
  background: rgba(245, 158, 11, 0.08);
  border-radius: 0 var(--pc-radius) var(--pc-radius) 0;
}
.pc-quote-en {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 1.1rem;
  font-style: italic;
  color: var(--pc-quote);
}
.pc-quote-zh { margin: 0.3rem 0 0; color: var(--pc-text); font-size: 0.92rem; }
.pc-quote-author { margin-top: 0.3rem; text-align: right; color: var(--pc-muted); font-size: 0.8rem; }
</style>
