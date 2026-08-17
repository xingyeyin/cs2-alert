import http from './http'

// 预警规则接口
export const getAlertRules = (params) => http.get('/alerts/rules', { params })

export const createAlertRule = (data) => http.post('/alerts/rules', data)

export const updateAlertRule = (id, data) => http.put(`/alerts/rules/${id}`, data)

export const deleteAlertRule = (id) => http.delete(`/alerts/rules/${id}`)

// 触发记录接口
export const getAlertRecords = (params) => http.get('/alerts/records', { params })

export const markAlertRead = (id) => http.post(`/alerts/records/${id}/read`)
