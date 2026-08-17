const express = require('express')
const router = express.Router()
const pool = require('../config/db')

// 日K线行情 + 近7日成交均价（参考基准）
// GET /api/market/:itemId/kline?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:itemId/kline', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId)
    const { start, end } = req.query
    if (!itemId) {
      return res.status(400).json({ message: 'itemId 无效' })
    }

    // 校验标的存在
    const [itemRows] = await pool.query('SELECT id, code, name FROM items WHERE id = ?', [itemId])
    if (itemRows.length === 0) {
      return res.status(404).json({ message: '标的不存在' })
    }

    // 时间范围筛选条件（可选）
    const where = []
    const params = []
    if (start) {
      where.push('trade_date >= ?')
      params.push(start)
    }
    if (end) {
      where.push('trade_date <= ?')
      params.push(end)
    }
    const rangeSql = where.length ? `AND ${where.join(' AND ')}` : ''

    // 日K数据（按日期升序）
    const [candles] = await pool.query(
      `SELECT trade_date AS date,
              open_price  AS open,
              high_price  AS high,
              low_price   AS low,
              close_price AS close,
              avg_price   AS avg,
              volume,
              amount
       FROM price_history
       WHERE item_id = ? ${rangeSql}
       ORDER BY trade_date ASC`,
      [itemId, ...params]
    )

    // 近7个交易日的成交均价均值（取最近7条，不受筛选范围影响）
    const [avgRows] = await pool.query(
      `SELECT AVG(avg_price) AS avg7 FROM (
         SELECT avg_price FROM price_history WHERE item_id = ? ORDER BY trade_date DESC LIMIT 7
       ) t`,
      [itemId]
    )

    res.json({
      item: itemRows[0],
      candles,
      avg7: avgRows[0].avg7 === null ? null : Number(avgRows[0].avg7),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
