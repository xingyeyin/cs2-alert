const express = require('express')
const itemsRouter = require('./items')
const marketRouter = require('./market')
const alertsRouter = require('./alerts')

const router = express.Router()

// 挂载各业务模块路由
router.use('/items', itemsRouter)
router.use('/market', marketRouter)
router.use('/alerts', alertsRouter)

module.exports = router
