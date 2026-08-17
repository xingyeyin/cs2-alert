import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layout/AppLayout.vue'

// 路由表：所有页面均挂载在全局布局之下
const routes = [
  {
    path: '/',
    component: AppLayout,
    redirect: '/items',
    children: [
      {
        path: 'items',
        name: 'Items',
        component: () => import('../views/ItemsView.vue'),
        meta: { title: '标的管理' },
      },
      {
        path: 'market',
        name: 'Market',
        component: () => import('../views/MarketView.vue'),
        meta: { title: '行情K线' },
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('../views/AlertsView.vue'),
        meta: { title: '价格预警' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
