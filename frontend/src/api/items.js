import http from './http'

// 标的管理相关接口封装
export const getItems = (params) => http.get('/items', { params })

export const createItem = (data) => http.post('/items', data)

export const updateItem = (id, data) => http.put(`/items/${id}`, data)

export const deleteItem = (id) => http.delete(`/items/${id}`)

export const updateItemStatus = (id, enabled) => http.patch(`/items/${id}/status`, { enabled })
