<script setup lang="ts">
/**
 * 全局顶层（位于幻灯片之上）：
 *  - 左上角页眉「第 X 课 · 短标题」，取自 headmatter 的 `lesson` 字段；
 *  - 右下角页脚「PPT N · 页码/总页数」，`PPT N` 取自每页 frontmatter 的 `ppt` 字段。
 * 封面页（layout: cover）不显示。
 * 注意：global-bottom.vue 是「幻灯片下方」的图层，会被页面背景遮挡，所以页脚也放在这里。
 * 通过 $nav 读取当前页，保证演示模式与导出 PDF/PNG（逐页渲染）时都正确。
 */
import { computed } from 'vue'
import { configs, useSlideContext } from '@slidev/client'

const { $nav } = useSlideContext()
const lesson = computed(() => (configs as Record<string, any>).lesson ?? configs.title)
const fm = computed(() => $nav.value.currentFrontmatter ?? {})
const hidden = computed(() => fm.value.layout === 'cover')
</script>

<template>
  <template v-if="!hidden">
    <header class="pc-header">{{ lesson }}</header>
    <footer class="pc-footer">
      <span v-if="fm.ppt" class="pc-ppt">PPT {{ fm.ppt }}</span>
      <span>{{ $nav.currentPage }} / {{ $nav.total }}</span>
    </footer>
  </template>
</template>

<style scoped>
.pc-header {
  position: absolute;
  top: 1rem;
  left: 3.5rem;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--pc-muted);
}
.pc-footer {
  position: absolute;
  right: 3.5rem;
  bottom: 1rem;
  display: flex;
  gap: 0.8rem;
  font-size: 0.72rem;
  color: var(--pc-muted);
}
.pc-ppt { color: var(--pc-accent); font-weight: 600; }
</style>
