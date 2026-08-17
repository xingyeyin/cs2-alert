# CS2 饰品行情预警平台

基于前后端分离架构的 CS2 武器箱 / 纪念包行情监控与价格预警平台。

## 技术栈

- 前端：Vue 3 + Vite + Element Plus + ECharts + Axios
- 后端：Node.js + Express + mysql2
- 数据库：MySQL 8.0

## 目录结构

```
cs2预警/
├── frontend/    # Vue3 前端（Vite 构建）
├── backend/     # Node.js + Express 后端
├── database/    # 数据库建表脚本 init.sql
└── docs/        # 部署文档
```

## 快速开始

### 1. 初始化数据库

```bash
mysql -u root -p < database/init.sql
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env   # 修改数据库账号密码
npm install
npm start
```

后端默认运行在 `http://localhost:3000`。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务默认运行在 `http://localhost:5173`，已配置 `/api` 代理到后端。

### 4. 生产部署

```bash
cd frontend && npm run build    # 打包到 frontend/dist
cd ../backend && npm start      # Express 自动托管 dist，单端口访问
```

完整部署流程（数据库导入、Nginx、云服务器、域名 HTTPS）见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 功能模块

1. 全局基础布局（侧边栏 + 顶部导航）
2. 标的管理（武器箱 / 纪念包增删改查、启用 / 停用监控）
3. 行情 K 线（日 K 线图、近 7 日成交均价基准线、时间范围筛选）
4. 价格预警（用户自定义涨跌阈值、前端弹窗提醒、配置持久化）

详细部署说明见 [docs/DEPLOY.md](docs/DEPLOY.md)。
