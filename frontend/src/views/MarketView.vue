<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>行情K线</span>
      </div>
    </template>

    <!-- 筛选工具栏：标的 + 时间范围 -->
    <div class="toolbar">
      <el-select v-model="itemId" placeholder="选择标的" style="width: 260px" @change="loadKline">
        <el-option
          v-for="it in items"
          :key="it.id"
          :label="`${it.name}（${it.code}）`"
          :value="it.id"
        />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :shortcuts="shortcuts"
        style="width: 320px"
        @change="loadKline"
      />
      <el-button type="primary" plain @click="loadKline">刷新</el-button>
    </div>

    <!-- 近7日成交均价参考基准 -->
    <el-alert
      :title="`近7日成交均价参考基准：¥${avg7 === null ? '--' : Number(avg7).toFixed(2)}`"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    />

    <!-- K线图 -->
    <div class="chart-box" v-loading="loading">
      <KLineChart v-if="candles.length" :candles="candles" :avg7="avg7" />
      <el-empty v-else description="该时间范围内暂无行情数据" />
    </div>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getItems } from '../api/items'
import { getKline } from '../api/market'
import KLineChart from '../components/KLineChart.vue'

const items = ref([])
const itemId = ref(null)
const dateRange = ref([])
const candles = ref([])
const avg7 = ref(null)
const loading = ref(false)

// 时间范围快捷选项
const shortcuts = [
  {
    text: '近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return [start, end]
    },
  },
  {
    text: '近30天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return [start, end]
    },
  },
  {
    text: '近90天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 89)
      return [start, end]
    },
  },
]

// 默认时间范围: 近30天
const defaultRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
}

// 加载K线数据
const loadKline = async () => {
  if (!itemId.value) return
  loading.value = true
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.start = dateRange.value[0]
      params.end = dateRange.value[1]
    }
    const data = await getKline(itemId.value, params)
    candles.value = data.candles
    avg7.value = data.avg7
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 初始化标的列表并默认选中第一个
  const data = await getItems({ page: 1, pageSize: 100 })
  items.value = data.list
  if (items.value.length) {
    itemId.value = items.value[0].id
    dateRange.value = defaultRange()
    loadKline()
  }
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.chart-box {
  height: 480px;
}
</style>
