const path = require('path')
const fs = require('fs')
// 加载 .env 环境变量（数据库连接等配置）
// 注意: 必须先于业务模块加载，否则连接池创建时读不到数据库密码
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const express = require('express')
const cors = require('cors')
const routes = require('./routes')
const { startAlertService } = require('./services/alertService')

const app = express()

// 跨域支持：前端开发服务器(5173)直连时使用
app.use(cors())
// JSON 请求体解析
app.use(express.json())

// 业务路由：统一挂载在 /api 前缀下
app.use('/api', routes)

// 健康检查接口：用于验证后端服务是否正常运行
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 生产环境：若前端已构建（frontend/dist 存在），由 Express 直接托管静态资源
// 这样单进程即可同时提供前端页面与后端 API，云服务器部署更简单
const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // SPA 路由回退：非 /api 的 GET 请求返回 index.html（前端路由由 vue-router 接管）
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'))
    }
    next()
  })
}

// 统一错误处理中间件
app.use((err, req, res, next) => {
  console.error('[cs2-alert] error:', err)
  res.status(err.status || 500).json({ message: err.message || '服务器内部错误' })
})

// 启动服务
const PORT = Number(process.env.PORT) || 3000
app.listen(PORT, () => {
  console.log(`[cs2-alert] backend listening on http://localhost:${PORT}`)
  // 启动价格预警定时检测任务（每60秒一轮）
  startAlertService()
})
