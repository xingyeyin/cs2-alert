const pool = require('../config/db')

// 同一条规则同一方向触发的冷却时间（4小时），避免重复轰炸
const COOLDOWN_MS = 4 * 60 * 60 * 1000

// 执行一轮预警检测
async function runAlertCheck() {
  // 取所有启用中的规则（规则提醒开启 + 标的状态启用）
  const [rules] = await pool.query(
    `SELECT r.*, i.name AS item_name, i.code AS item_code
     FROM alert_rules r
     JOIN items i ON i.id = r.item_id
     WHERE r.notify_enabled = 1 AND i.enabled = 1`
  )

  for (const rule of rules) {
    try {
      // 最新价：取该标的最新一条日K收盘价
      const [latest] = await pool.query(
        'SELECT close_price FROM price_history WHERE item_id = ? ORDER BY trade_date DESC LIMIT 1',
        [rule.item_id]
      )
      if (!latest.length) continue
      const latestPrice = Number(latest[0].close_price)

      // 基准价：自定义基准价 或 近7日成交均价
      let basePrice
      if (rule.base_type === 2 && rule.base_price) {
        basePrice = Number(rule.base_price)
      } else {
        const [avgRows] = await pool.query(
          `SELECT AVG(avg_price) AS avg7 FROM (
             SELECT avg_price FROM price_history WHERE item_id = ? ORDER BY trade_date DESC LIMIT 7
           ) t`,
          [rule.item_id]
        )
        if (avgRows[0].avg7 === null) continue
        basePrice = Number(avgRows[0].avg7)
      }
      if (!basePrice) continue

      // 计算涨跌幅
      const changeRate = ((latestPrice - basePrice) / basePrice) * 100
      let triggerType = 0 // 0=不触发, 1=涨, 2=跌
      if (changeRate >= Number(rule.up_threshold)) triggerType = 1
      else if (changeRate <= -Number(rule.down_threshold)) triggerType = 2
      if (!triggerType) continue

      // 冷却期检查：距上次触发不足4小时则跳过
      if (rule.last_triggered_at) {
        const last = new Date(rule.last_triggered_at).getTime()
        if (Date.now() - last < COOLDOWN_MS) continue
      }

      const thresholdValue = triggerType === 1 ? rule.up_threshold : rule.down_threshold
      // 写入触发记录（前端弹窗数据源）
      await pool.query(
        `INSERT INTO alert_records
           (rule_id, item_id, trigger_type, trigger_price, base_price, change_rate, threshold_value, triggered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [rule.id, rule.item_id, triggerType, latestPrice, basePrice, Number(changeRate.toFixed(4)), thresholdValue]
      )
      // 更新规则触发信息
      await pool.query(
        'UPDATE alert_rules SET last_triggered_at = NOW(), trigger_count = trigger_count + 1 WHERE id = ?',
        [rule.id]
      )
      // 同步最新价到标的管理表，供列表快速展示
      await pool.query('UPDATE items SET current_price = ? WHERE id = ?', [latestPrice, rule.item_id])
      console.log(`[alert] 触发预警: ${rule.item_name}(${rule.item_code}) 涨跌幅 ${changeRate.toFixed(2)}%`)
    } catch (err) {
      console.error('[alert] 检测异常:', err.message)
    }
  }
}

// 启动定时检测（默认每60秒一轮，启动时立即执行一次）
function startAlertService(intervalMs = 60 * 1000) {
  runAlertCheck()
  const timer = setInterval(runAlertCheck, intervalMs)
  return timer
}

module.exports = { runAlertCheck, startAlertService }
