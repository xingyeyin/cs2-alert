import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import './assets/styles/global.css'

const app = createApp(App)

// 注册 Element Plus 组件库（中文语言包）
app.use(ElementPlus, { locale: zhCn })
// 注册路由
app.use(router)

app.mount('#app')
