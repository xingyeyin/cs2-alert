<template>
  <!-- 顶部导航栏：左侧当前页面标题，右侧平台标识 -->
  <el-header class="app-header">
    <div class="header-title">{{ pageTitle }}</div>
    <div class="header-right">CS2 饰品行情预警平台</div>
  </el-header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 读取路由 meta.title 作为页面标题
const pageTitle = computed(() => route.meta.title || 'CS2 行情预警')
</script>
