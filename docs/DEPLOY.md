# CS2 饰品行情预警平台 - 部署文档

## 1. 环境要求

| 软件 | 版本要求 |
| --- | --- |
| Node.js | 20.19+（本项目开发使用 v24） |
| npm | 10+ |
| MySQL | 8.0+ |

## 2. 数据库导入

### 2.1 本地导入

```bash
# 在项目根目录执行
mysql -u root -p < database/init.sql
```

脚本会自动完成：
- 创建数据库 `cs2_alert`（utf8mb4）
- 创建 4 张表：`items`（标的）、`price_history`（日K行情）、`alert_rules`（预警规则）、`alert_records`（触发记录）
- 写入 2 条示例标的、22 条示例行情、1 条示例预警规则（便于演示，生产可删除）

### 2.2 验证导入

```sql
USE cs2_alert;
SHOW TABLES;
SELECT COUNT(*) FROM items;          -- 预期 2
SELECT COUNT(*) FROM price_history;  -- 预期 22
```

## 3. 后端启动（开发模式）

```bash
cd backend
cp .env.example .env    # Windows: copy .env.example .env
```

编辑 `.env`，将数据库密码改为实际值：

```ini
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=cs2_alert
```

安装依赖并启动：

```bash
npm install
npm start        # 或 npm run dev（文件变更自动重启）
```

启动后：
- 健康检查：`curl http://localhost:3000/api/health` 返回 `{"status":"ok",...}`
- 预警检测任务自动运行：每 60 秒扫描一次启用中的规则，命中阈值写入 `alert_records`

## 4. 前端启动（开发模式）

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。开发服务器已配置 `/api` 代理到 `http://localhost:3000`，无跨域问题。

## 5. 前端打包

```bash
cd frontend
npm run build
```

产物输出到 `frontend/dist/`，可直接用 Nginx 托管，或交给后端托管（见 6.1）。

## 6. 生产部署（云服务器）

### 6.1 方式一：Express 单进程托管（推荐，最简单）

后端已内置静态托管：只要 `frontend/dist` 存在，启动后端后单端口同时提供页面与 API。

```bash
# 1. 本地打包后，将整个项目上传到服务器
# 2. 服务器上安装依赖并启动
cd backend
npm install --omit=dev
npm start
```

访问 `http://服务器IP:3000` 即可使用，`/api` 与页面路由均由 Express 处理。

### 6.2 方式二：Nginx 托管前端 + 反向代理 API

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    root /var/www/cs2-alert/frontend/dist;
    index index.html;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 7. 云服务器上线步骤

### 7.1 服务器准备

以 Ubuntu / CentOS 为例：

```bash
# 安装 Node.js 20+（推荐 nvm 或官方源）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 MySQL 8
sudo apt-get install -y mysql-server
sudo systemctl enable --now mysql
```

### 7.2 安全组 / 防火墙

在云厂商控制台（阿里云/腾讯云等）安全组中放行：
- `3000` 端口（单进程模式）或 `80/443`（Nginx 模式）
- `3306` 端口**不要**对外开放（仅本机访问数据库）

### 7.3 上传代码并初始化

```bash
cd /var/www
git clone <你的仓库地址> cs2-alert   # 或 scp/宝塔上传
cd cs2-alert

# 导入数据库
mysql -u root -p < database/init.sql

# 配置后端环境变量
cd backend
cp .env.example .env
vim .env   # 修改 DB_PASSWORD 等
npm install --omit=dev
```

### 7.4 进程守护（推荐 pm2）

```bash
sudo npm install -g pm2
cd /var/www/cs2-alert/backend
pm2 start src/app.js --name cs2-alert
pm2 save
pm2 startup   # 按提示执行输出命令，实现开机自启

pm2 logs cs2-alert    # 查看日志
pm2 restart cs2-alert # 重启
```

## 8. 公网访问配置

### 8.1 直接 IP 访问

启动后直接访问 `http://服务器公网IP:3000`（需安全组放行 3000）。

### 8.2 绑定域名 + HTTPS

1. 域名解析：在 DNS 服务商添加 A 记录，指向服务器公网 IP
2. Nginx 配置 80 端口站点（见 6.2）
3. 申请免费证书并启用 HTTPS：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

certbot 会自动改写 Nginx 配置并开启 443。

## 9. 常见问题

| 问题 | 解决方法 |
| --- | --- |
| 后端启动报 `Access denied for user 'root'` | 检查 `backend/.env` 中 `DB_PASSWORD` 是否正确 |
| 页面打不开但 API 正常 | 确认 `frontend/dist` 已构建，或 Nginx root 指向正确 |
| 端口被占用 | 修改 `backend/.env` 的 `PORT`，并同步修改前端 `vite.config.js` 代理 |
| 预警不触发 | 确认：规则 `notify_enabled=1`、标的状态为启用、`price_history` 有数据、未在 4 小时冷却期内 |
| 前端打包体积警告 | 属于 ECharts 体积提示，不影响功能；可按需做代码分割 |

## 10. 目录速览

```
cs2预警/
├── frontend/    # Vue3 + Vite + Element Plus + ECharts
├── backend/     # Express + mysql2（含预警定时检测服务）
├── database/    # init.sql 建库建表脚本
└── docs/        # 本部署文档
```
