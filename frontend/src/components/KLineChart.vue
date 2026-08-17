<template>
  <div ref="chartRef" class="kline-chart"></div>
</template>

<script setup>
import * as echarts from 'echarts'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // 日K数据: [{ date, open, high, low, close, avg, volume, amount }]
  candles: { type: Array, default: () => [] },
  // 近7日成交均价（参考基准线）
  avg7: { type: Number, default: null },
})

const chartRef = ref()
let chart = null

// 渲染K线图：蜡烛图 + 近7日均价基准虚线 + 缩放工具
const render = () => {
  if (!chart) return
  const dates = props.candles.map((c) => c.date)
  // ECharts 蜡烛图数据顺序: [开盘, 收盘, 最低, 最高]
  const kData = props.candles.map((c) => [c.open, c.close, c.low, c.high])

  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          const p = params[0]
          const c = props.candles[p?.dataIndex]
          if (!c) return ''
          return `${c.date}<br/>开 ${c.open}　高 ${c.high}<br/>低 ${c.low}　收 ${c.close}<br/>均价 ${c.avg}`
        },
      },
      legend: { data: ['日K', '近7日均价'], top: 4 },
      grid: { left: 60, right: 20, top: 36, bottom: 64 },
      xAxis: { type: 'category', data: dates, boundaryGap: true },
      yAxis: { type: 'value', scale: true },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', height: 20, bottom: 8 },
      ],
      series: [
        {
          name: '日K',
          type: 'candlestick',
          data: kData,
          // 中国习惯配色: 红涨绿跌
          itemStyle: {
            color: '#ef232a',
            color0: '#14b143',
            borderColor: '#ef232a',
            borderColor0: '#14b143',
          },
          // 近7日均价作为横向基准虚线
          markLine:
            props.avg7 === null
              ? undefined
              : {
                  symbol: 'none',
                  silent: true,
                  label: { formatter: `近7日均价 ${props.avg7.toFixed(2)}` },
                  lineStyle: { type: 'dashed', color: '#409eff', width: 1.5 },
                  data: [{ yAxis: props.avg7 }],
                },
        },
      ],
    },
    true
  )
}

// 数据变化时重新渲染
watch(
  () => [props.candles, props.avg7],
  () => nextTick(render)
)

onMounted(() => {
  chart = echarts.init(chartRef.value)
  render()
  window.addEventListener('resize', handleResize)
})

const handleResize = () => chart?.resize()

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.kline-chart {
  width: 100%;
  height: 100%;
  min-height: 420px;
}
</style>
