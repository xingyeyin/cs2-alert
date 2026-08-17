import http from './http'

// 行情K线相关接口封装
export const getKline = (itemId, params) => http.get(`/market/${itemId}/kline`, { params })
