import { onBeforeUnmount, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import { getAlertRecords, markAlertRead } from '../api/alerts'

const POLL_INTERVAL = 30 * 1000 // 每30秒轮询一次未读预警

// 全局预警弹窗轮询：在布局组件中挂载一次，任何页面都能收到弹窗提醒
export function useAlertPoller() {
  let timer = null

  const check = async () => {
    try {
      const data = await getAlertRecords({ unread: 1, limit: 10 })
      const unread = data.list || []
      // 最多同时弹 3 条，避免刷屏
      for (const rec of unread.slice(0, 3)) {
        const direction = rec.trigger_type === 1 ? '上涨' : '下跌'
        ElNotification({
          title: `价格预警：${rec.item_name}`,
          type: rec.trigger_type === 1 ? 'success' : 'warning',
          duration: 8000,
          message:
            `${direction} ${Math.abs(Number(rec.change_rate)).toFixed(2)}%！` +
            `触发价 ¥${Number(rec.trigger_price).toFixed(2)}，` +
            `基准价 ¥${Number(rec.base_price).toFixed(2)}`,
        })
        // 弹窗后标记已读，避免重复提醒
        await markAlertRead(rec.id)
      }
    } catch {
      // 轮询失败静默处理，下一轮自动重试
    }
  }

  onMounted(() => {
    check()
    timer = setInterval(check, POLL_INTERVAL)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })
}
