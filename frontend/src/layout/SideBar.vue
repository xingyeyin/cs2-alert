<template>
  <!-- 左侧导航栏 -->
  <el-aside width="220px" class="sidebar">
    <div class="sidebar-logo">CS2 行情预警</div>
    <el-menu
      :default-active="activeMenu"
      router
      class="sidebar-menu"
      background-color="#1f2d3d"
      text-color="#bfcbd9"
      active-text-color="#409eff"
    >
      <el-menu-item index="/items">
        <el-icon><Goods /></el-icon>
        <span>标的管理</span>
      </el-menu-item>
      <el-menu-item index="/market">
        <el-icon><TrendCharts /></el-icon>
        <span>行情K线</span>
      </el-menu-item>
      <el-menu-item index="/alerts">
        <el-icon><Bell /></el-icon>
        <span>价格预警</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Goods, TrendCharts, Bell } from '@element-plus/icons-vue'

const route = useRoute()
// 根据当前路由高亮对应菜单项
const activeMenu = computed(() => route.path)
</script>
