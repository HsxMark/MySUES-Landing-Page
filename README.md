# 三旋翼课程表

三旋翼课程表 (SANXUANYI) 是一款校园生活助手 App 的官方网站/落地页，提供课表查询、成绩查询、考试信息等功能。

## 项目简介

本项目是一个全栈 Web 应用，用于展示三旋翼课程表 App 并分发其 Android / iOS 版本。

- **前端**: Next.js 16 + HeroUI v3 + Tailwind CSS v4
- **后端**: FastAPI + PostgreSQL
- **部署**: Docker Compose + Nginx

## 快速开始

### 纯前端静态部署（最简单，无数据库）

**远程服务器只需要：**

```bash
git clone https://github.com/HsxMark/MySUES-Landing-Page.git
cd MySUES-Landing-Page/frontend

npm install
npm run build
npm start        # 默认 http://localhost:3000
```

就这 4 步，无需 Docker、无需 PostgreSQL。页面在后端不可用时自动兜底：
- **iOS** 下载 → TestFlight（内置链接）
- **Android** 下载 → GitHub Releases（可用 `cp .env.local.example .env.local` 改为自己的 APK 直链）

> 完整版（含 FastAPI 后端 + PostgreSQL，支持 `/admin` 版本管理与动态版本信息）见下文。

### Docker Compose (完整版)

```bash
# 启动所有服务
docker compose up --build

# 访问地址:
# - 前端: http://localhost:3000
# - 后端 API: http://localhost:8000
# - API 文档: http://localhost:8000/api/docs
# - 管理后台: http://localhost:3000/admin
```

### 本地开发

#### 前端

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

#### 后端

```bash
# 依赖: PostgreSQL

cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# 创建数据库
psql -U postgres -c "CREATE DATABASE sanxuanyi;"

# 启动
uvicorn app.main:app --reload --port 8000
```

---

## 生产环境部署

### 第一步：准备服务器

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录以使 docker 组生效

# 安装 Nginx 和 Certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 第二步：克隆项目

```bash
cd /opt
sudo git clone https://github.com/your-org/MySUES-Landing-Page.git
sudo chown -R $USER:$USER MySUES-Landing-Page
cd MySUES-Landing-Page
```

### 第三步：配置环境变量

在项目根目录创建 `.env` 文件：

```bash
cat > .env << 'EOF'
# 管理员账号（必须修改）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here

# JWT 密钥（必须修改，建议64字符以上）
JWT_SECRET=your-64-char-random-secret-key-please-change-this-in-production
JWT_EXPIRE_HOURS=24
EOF
```

生成安全的 JWT 密钥：

```bash
openssl rand -base64 48
```

### 第四步：启动服务

```bash
docker compose up -d --build

# 验证服务状态
docker compose ps
# 应显示 postgres, backend, frontend 均为 running (healthy)

# 查看日志
docker compose logs -f
```

### 第五步：配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/sanxuanyi
```

写入以下内容（将 `your-domain.com` 替换为实际域名）：

```nginx
# ============================================
# 三旋翼课程表 - Nginx 配置
# ============================================

# HTTP -> HTTPS 重定向
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # 其他请求重定向到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # ----- SSL 证书 -----
    # 首次部署时注释掉这部分，获取证书后再启用
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ----- 安全头 -----
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ----- Gzip 压缩 -----
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # ----- 前端 (Next.js) -----
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ----- 后端 API -----
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # APK 下载超时
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # 上传大小限制
        client_max_body_size 100M;
    }

    # ----- 健康检查 -----
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # ----- 静态资源缓存 -----
    # Next.js 静态文件（含 hash，可长期缓存）
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 图片文件
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

### 第六步：启用站点并获取 SSL 证书

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/sanxuanyi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 首次部署：临时使用 HTTP（注释掉 HTTPS server block）
# 编辑配置文件，注释掉 443 端口的 server 块

# 重载 Nginx
sudo systemctl reload nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 证书获取成功后，恢复 HTTPS 配置
sudo systemctl reload nginx

# 测试自动续期
sudo certbot renew --dry-run
```

### 第七步：验证部署

```bash
# 检查服务状态
docker compose ps

# 测试前端
curl -I https://your-domain.com

# 测试后端 API
curl https://your-domain.com/api/apps/by-slug/mysues

# 测试健康检查
curl https://your-domain.com/health
```

---

## 运维命令

### 日常操作

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f              # 所有服务
docker compose logs -f backend      # 仅后端
docker compose logs -f --tail=100   # 最近100行

# 重启服务
docker compose restart backend
docker compose restart frontend

# 停止/启动
docker compose stop
docker compose start
```

### 更新部署

```bash
cd /opt/MySUES-Landing-Page
git pull
docker compose up -d --build
```

### 数据库操作

```bash
# 进入 PostgreSQL
docker compose exec postgres psql -U postgres -d sanxuanyi

# 备份数据库
docker compose exec postgres pg_dump -U postgres sanxuanyi > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup.sql | docker compose exec -T postgres psql -U postgres -d sanxuanyi
```

### 调试

```bash
# 进入后端容器
docker compose exec backend bash

# 进入前端容器
docker compose exec frontend sh

# 检查端口占用
sudo lsof -i :3000
sudo lsof -i :8000

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

---

## 项目结构

```
.
├── frontend/                  # Next.js 前端
│   ├── src/
│   │   ├── pages/            # 页面路由 (Pages Router)
│   │   ├── components/       # React 组件
│   │   └── styles/           # 全局样式
│   ├── public/               # 静态资源
│   └── Dockerfile
│
├── backend/                   # FastAPI 后端
│   ├── app/
│   │   ├── main.py           # 入口文件
│   │   ├── models/           # 数据库模型
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routers/          # API 路由
│   │   └── services/         # 业务逻辑
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml.example # Docker 编排配置
└── CLAUDE.md                  # AI 开发助手指南
```

---

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/apps` | 获取所有 App |
| GET | `/api/apps/by-slug/{slug}` | 按 slug 获取 App 详情 |
| GET | `/api/apps/by-slug/{slug}/release` | 获取指定平台最新发布信息 |
| POST | `/api/apps/by-slug/{slug}/startup` | 上报 App 启动/安装 |
| GET | `/api/apps/{app_id}` | 获取 App 详情 |
| GET | `/api/apps/{app_id}/versions` | 获取版本列表 |
| GET | `/api/apps/{app_id}/versions/{version_id}/download/{filename}` | 下载版本文件 |
| GET | `/health` | 健康检查 |
| GET | `/api/docs` | Swagger 文档 |

### 认证接口

通过 `POST /api/auth/login` 获取 JWT Token，请求头添加 `Authorization: Bearer <token>`。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录获取 Token |
| GET | `/api/apps/by-slug/{slug}/metrics` | 获取 App 安装/活跃统计 |
| POST | `/api/apps` | 创建 App |
| PUT | `/api/apps/{app_id}` | 更新 App |
| DELETE | `/api/apps/{app_id}` | 删除 App |
| POST | `/api/apps/{app_id}/versions` | 发布新版本 |
| DELETE | `/api/apps/{app_id}/versions/{version_id}` | 删除版本 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL 连接字符串 |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `change-this-password` | 管理员密码 |
| `JWT_SECRET` | `change-this-secret-key` | JWT 签名密钥 |
| `JWT_EXPIRE_HOURS` | `24` | Token 过期时间 (小时) |
| `APP_FILE_CACHE_DIR` | `/tmp/sanxuanyi-app-cache` | APK 下载缓存目录 |

---

## 故障排查

### 502 Bad Gateway

```bash
# 检查 Docker 服务是否运行
docker compose ps

# 检查后端健康
curl http://127.0.0.1:8000/health

# 检查前端健康
curl http://127.0.0.1:3000

# 查看 Nginx 错误
sudo tail -20 /var/log/nginx/error.log
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose ps postgres
docker compose exec postgres pg_isready -U postgres

# 查看数据库日志
docker compose logs postgres
```

### 前端编译失败

```bash
# 查看构建日志
docker compose logs frontend

# 重新构建（不使用缓存）
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 16 | React 框架 (Pages Router) |
| HeroUI | v3 beta | UI 组件库 |
| Tailwind CSS | v4 | 原子化 CSS |
| Motion | - | 动画库 (Framer Motion) |
| TypeScript | strict | 类型安全 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| FastAPI | 0.115+ | 异步 Web 框架 |
| SQLAlchemy | 2.0 | 异步 ORM |
| PostgreSQL | 16 | 数据库 |
| PyJWT | - | JWT 认证 |

---

## License

MIT
