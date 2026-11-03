# Nocturne — 静态部署说明 / Static deployment guide

**版本 Version:** v1.0.0 · 前端构建产物（纯静态，无服务端依赖）

---

## 1. 这是什么 / What is this

```
nocturne-static-v1.0.0/
├── index.html                     ← 唯一入口页面
├── assets/
│   ├── index-*.js                 ← React 19 + GSAP + Lenis + 全部交互（gzip ≈ 156 kB）
│   └── index-*.css                ← 设计系统与全部样式（gzip ≈ 17 kB）
├── fonts/                         ← 自托管字体（5 × woff2，约 145 kB）
├── og.jpg                         ← 社交分享图（1200 × 630）
└── DEPLOY.md                      ← 本文件
```

单页应用，**没有客户端路由**，不需要 SPA rewrite 规则；所有资源引用都是**相对路径**，
因此既可以部署在域名根目录，也可以放在任意子目录（如 `/showcase/nocturne/`）。

无 API、无环境变量、无第三方请求（字体已本地化）。

---

## 2. 部署方式 / How to deploy

把本目录里的**全部文件**上传到任意静态托管即可：

| 平台 | 做法 |
| --- | --- |
| Nginx / Apache | 解压到站点根目录（或子目录），确保静态文件可读 |
| 阿里云 OSS / 腾讯云 COS / AWS S3 | 上传对象，开启静态网站托管，默认首页 `index.html` |
| Cloudflare Pages / Netlify / Vercel | 直接拖入该目录作为发布目录（Build command 留空） |
| GitHub Pages | 推送到 `gh-pages` 分支（相对路径可放在仓库子路径下） |
| 本地自测 | `python -m http.server 8080` 后访问 `http://localhost:8080/` |

### 注意 / Notes

1. **必须通过 HTTP(S) 访问**，不要直接双击 `index.html`（`file://` 会拦截 ES Module 与字体加载）。
2. 建议的 MIME 类型：`.js → text/javascript`、`.css → text/css`、`.woff2 → font/woff2`、`.jpg → image/jpeg`。
3. 建议缓存策略：
   - `/assets/*`、`/fonts/*` → `Cache-Control: public, max-age=31536000, immutable`
   - `/index.html` → `Cache-Control: no-cache`
4. 已开启 gzip/br 压缩的服务器无需额外处理；未开启时 JS 约 482 kB、CSS 约 87 kB（未压缩）。
5. 若托管在子目录，无需修改任何文件——相对路径会自动解析。

---

## 3. 验证记录 / Verified

- 根路径部署（`http://127.0.0.1:5181/`）与子路径部署（`…/nocturne/dist-static/`）均通过：
  - 6 个 section 正常挂载，WebGL 上下文正常
  - 4 个字体文件、2 个 bundle 全部加载成功
  - 控制台 0 error / 0 warning，0 失败请求，0 第三方请求
  - 桌面 1440×900 与移动 390×844 无横向溢出

---

## 4. 版本

```
v1.0.0 · 2026-11 · 静态产物
```

Fictional studio, real engineering. 这是前端素养演示项目，非真实商业机构。
