const express = require('express')
const router = express.Router()
const pool = require('../config/db')

// ---------- 预警规则 ----------

// 规则列表（可按标的筛选）
router.get('/rules', async (req, res, next) => {
  try {
    const itemId = req.query.itemId ? Number(req.query.itemId) : null
    const params = []
    let whereSql = ''
    if (itemId) {
      whereSql = 'WHERE r.item_id = ?'
      params.push(itemId)
    }
    const [rows] = await pool.query(
      `SELECT r.id, r.item_id, r.rule_name, r.base_type, r.base_price,
              r.up_threshold, r.down_threshold, r.notify_enabled,
              r.last_triggered_at, r.trigger_count, r.created_at, r.updated_at,
              i.name AS item_name, i.code AS item_code
       FROM alert_rules r
       JOIN items i ON i.id = r.item_id
       ${whereSql}
       ORDER BY r.id DESC`,
      params
    )
    res.json({ list: rows })
  } catch (err) {
    next(err)
  }
})

// 新增规则（默认阈值 ±5%，可任意修改）
router.post('/rules', async (req, res, next) => {
  try {
    const {
      item_id,
      rule_name = null,
      base_type = 1,
      base_price = null,
      up_threshold = 5.0,
      down_threshold = 5.0,
      notify_enabled = 1,
    } = req.body || {}

    if (!item_id) {
      return res.status(400).json({ message: 'item_id 不能为空' })
    }
    if (Number(up_threshold) < 0 || Number(down_threshold) < 0) {
      return res.status(400).json({ message: '阈值不能为负数' })
    }

    const [itemRows] = await pool.query('SELECT id FROM items WHERE id = ?', [item_id])
    if (itemRows.length === 0) {
      return res.status(404).json({ message: '标的不存在' })
    }

    const [result] = await pool.query(
      `INSERT INTO alert_rules
         (item_id, rule_name, base_type, base_price, up_threshold, down_threshold, notify_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item_id, rule_name, base_type, base_price, up_threshold, down_threshold, notify_enabled]
    )
    res.status(201).json({ id: result.insertId, message: '预警规则创建成功' })
  } catch (err) {
    next(err)
  }
})

// 更新规则
router.put('/rules/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const {
      item_id,
      rule_name,
      base_type,
      base_price,
      up_threshold,
      down_threshold,
      notify_enabled,
    } = req.body || {}
    if (!item_id) {
      return res.status(400).json({ message: 'item_id 不能为空' })
    }
    if (Number(up_threshold) < 0 || Number(down_threshold) < 0) {
      return res.status(400).json({ message: '阈值不能为负数' })
    }
    const [result] = await pool.query(
      `UPDATE alert_rules
       SET item_id = ?, rule_name = ?, base_type = ?, base_price = ?,
           up_threshold = ?, down_threshold = ?, notify_enabled = ?
       WHERE id = ?`,
      [item_id, rule_name, base_type, base_price, up_threshold, down_threshold, notify_enabled, id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '规则不存在' })
    }
    res.json({ message: '规则更新成功' })
  } catch (err) {
    next(err)
  }
})

// 删除规则
router.delete('/rules/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const [result] = await pool.query('DELETE FROM alert_rules WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '规则不存在' })
    }
    res.json({ message: '规则删除成功' })
  } catch (err) {
    next(err)
  }
})

// ---------- 触发记录 ----------

// 触发记录列表（unread=1 只查未读，供前端弹窗轮询）
router.get('/records', async (req, res, next) => {
  try {
    const unread = req.query.unread === '1' ? 1 : null
    const itemId = req.query.itemId ? Number(req.query.itemId) : null
    const limit = Math.min(100, Number(req.query.limit) || 50)

    const where = []
    const params = []
    if (unread === 1) {
      where.push('r.is_read = 0')
    }
    if (itemId) {
      where.push('r.item_id = ?')
      params.push(itemId)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const [rows] = await pool.query(
      `SELECT r.id, r.rule_id, r.item_id, r.trigger_type, r.trigger_price,
              r.base_price, r.change_rate, r.threshold_value, r.is_read, r.triggered_at,
              i.name AS item_name, ar.rule_name
       FROM alert_records r
       JOIN items i ON i.id = r.item_id
       LEFT JOIN alert_rules ar ON ar.id = r.rule_id
       ${whereSql}
       ORDER BY r.triggered_at DESC
       LIMIT ?`,
      [...params, limit]
    )
    res.json({ list: rows })
  } catch (err) {
    next(err)
  }
})

// 标记记录已读（弹窗展示后调用）
router.post('/records/:id/read', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const [result] = await pool.query('UPDATE alert_records SET is_read = 1 WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '记录不存在' })
    }
    res.json({ message: '已标记为已读' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
