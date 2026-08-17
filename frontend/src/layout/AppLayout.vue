<template>
  <!-- 全局基础布局：左侧导航 + 右侧顶栏与内容区 -->
  <el-container class="app-layout">
    <SideBar />
    <el-container class="app-main-container">
      <AppHeader />
      <el-main class="app-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import SideBar from './SideBar.vue'
import AppHeader from './AppHeader.vue'
import { useAlertPoller } from '../composables/useAlertPoller'

// 挂载全局预警轮询：达到阈值时前端弹窗提醒
useAlertPoller()
</script>
