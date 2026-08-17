const express = require('express')
const router = express.Router()
const pool = require('../config/db')

// 列表查询：支持分页、关键词、分类、启用状态筛选
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10))
    const keyword = (req.query.keyword || '').trim()
    const category = req.query.category === undefined || req.query.category === '' ? null : Number(req.query.category)
    const enabled = req.query.enabled === undefined || req.query.enabled === '' ? null : Number(req.query.enabled)

    // 动态拼接查询条件
    const where = []
    const params = []
    if (keyword) {
      where.push('(code LIKE ? OR name LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    if (category !== null) {
      where.push('category = ?')
      params.push(category)
    }
    if (enabled !== null) {
      where.push('enabled = ?')
      params.push(enabled)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    // 总数（用于前端分页）
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM items ${whereSql}`, params)
    const total = countRows[0].total

    // 分页数据
    const offset = (page - 1) * pageSize
    const [rows] = await pool.query(
      `SELECT id, code, name, category, icon_url, enabled, current_price, created_at, updated_at
       FROM items ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    res.json({ total, list: rows })
  } catch (err) {
    next(err)
  }
})

// 新增标的（武器箱 / 纪念包录入）
router.post('/', async (req, res, next) => {
  try {
    const { code, name, category = 0, icon_url = null, current_price = null } = req.body || {}
    if (!code || !name) {
      return res.status(400).json({ message: 'code 和 name 不能为空' })
    }
    const [result] = await pool.query(
      'INSERT INTO items (code, name, category, icon_url, current_price) VALUES (?, ?, ?, ?, ?)',
      [code, name, category, icon_url, current_price]
    )
    res.status(201).json({ id: result.insertId, message: '创建成功' })
  } catch (err) {
    // 捕获 code 唯一键冲突
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '标的代码已存在' })
    }
    next(err)
  }
})

// 更新标的
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { code, name, category, icon_url, current_price } = req.body || {}
    if (!code || !name) {
      return res.status(400).json({ message: 'code 和 name 不能为空' })
    }
    const [result] = await pool.query(
      `UPDATE items
       SET code = ?, name = ?, category = ?, icon_url = ?, current_price = ?
       WHERE id = ?`,
      [code, name, category, icon_url, current_price, id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '标的不存在' })
    }
    res.json({ message: '更新成功' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '标的代码已存在' })
    }
    next(err)
  }
})

// 删除标的
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const [result] = await pool.query('DELETE FROM items WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '标的不存在' })
    }
    res.json({ message: '删除成功' })
  } catch (err) {
    next(err)
  }
})

// 启用 / 停用监控
router.patch('/:id/status', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const enabled = Number(req.body?.enabled)
    if (enabled !== 0 && enabled !== 1) {
      return res.status(400).json({ message: 'enabled 只能为 0 或 1' })
    }
    const [result] = await pool.query('UPDATE items SET enabled = ? WHERE id = ?', [enabled, id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '标的不存在' })
    }
    res.json({ message: enabled ? '已启用监控' : '已停用监控' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
