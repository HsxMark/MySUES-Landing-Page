# 三旋翼课程表 - 前端（静态部署 / 完整版两用）

本目录是 Next.js 16 (Pages Router) 前端。

## 两种运行方式

### 方式 A：纯前端静态部署（远程无数据库，最简单）

**远程服务器只需要：**

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 可选：配置 Android 下载兜底（拷贝即可用）
cp .env.local.example .env.local
# 编辑 .env.local，填写真实 APK 下载地址 / 版本号

# 3. 构建
npm run build

# 4. 启动（默认端口 3000）
npm start
```

**要点：**
- 页面在**后端不可用时自动兜底**：iOS 下载固定为 TestFlight
  （`https://testflight.apple.com/join/sFcAxekc`），Android 下载使用
  `.env.local` 里配置的地址（默认跳转 GitHub Releases）。
- 无需 PostgreSQL、无需 Docker，单进程即可跑。
- 若服务器上没有 `frontend/.env.local`，将使用内置默认值，照样可构建运行。

> 仅静态部署时，后台 `/admin` 版本管理与动态版本信息不可用
> （它们依赖 FastAPI 后端）。

### 方式 B：完整版（含 FastAPI 后端 + PostgreSQL）

1. 后端跑在 `http://localhost:8000`（见仓库根 README）。
2. `next.config.ts` 已把 `/api/*` 转发到 `BACKEND_URL`（默认 `http://localhost:8000`）。
3. 前端启动：`npm install && npm run build && npm start`。

## 常用命令

```bash
npm install    # 安装依赖
npm run dev    # 开发（热更新）
npm run build  # 生产构建
npm start      # 生产运行（默认 :3000）
npm run lint   # ESLint
```

## 环境变量（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BACKEND_URL` | `http://localhost:8000` | 后端地址，用于 `/api` 转发 |
| `NEXT_PUBLIC_ANDROID_URL` | GitHub Releases | 无后端时 Android 下载地址 |
| `NEXT_PUBLIC_ANDROID_VERSION` | `1.0.0` | 无后端时展示的版本号 |
| `NEXT_PUBLIC_ANDROID_FILENAME` | `sanxuanyi.apk` | 无后端时展示的文件名 |
| `NEXT_PUBLIC_ANDROID_SIZE` | `0` | 无后端时展示的文件大小（字节） |

## Nginx 反向代理示例

生产环境一般用 Nginx 反代到 `:3000` 并配 HTTPS，示例见仓库根 `README.md`。

## 静态资源

- 图标 / 截图：`public/image/mysues/`
- 品牌 logo：`public/image/mysues/MySUES.png`
- iOS TestFlight 徽章：`public/image/mysues/testflight.svg`
