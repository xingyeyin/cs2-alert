import axios from 'axios'
import { ElMessage } from 'element-plus'

// 统一的 axios 实例：所有请求走 /api 前缀（开发环境由 Vite 代理到后端）
const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 响应拦截器：统一错误提示
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || '网络请求失败，请稍后重试'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default http
