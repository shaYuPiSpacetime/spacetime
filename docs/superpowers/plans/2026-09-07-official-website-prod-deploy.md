# 时空邂逅官网生产部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建蓝白色调的“时空邂逅 / 成家立业”功能介绍官网，并让 `https://www.shikongxiehou.com` 通过有效 HTTPS 证书稳定访问。

**Architecture:** 源码放在 `docs/官网/`，与 `docs/静态Demo/` 同级；管理后台镜像将其复制到 `/usr/share/nginx/html/website/`，与运行态 `/demo/` 同级。公网 Nginx 根据 Host 将官网域名改写到 `/website/`，继续复用现有 `admin-web` 静态容器，并用独立 Let's Encrypt 证书覆盖裸域名与 `www`。

**Tech Stack:** 语义化 HTML5、原生 CSS、少量原生 JavaScript、Node.js 静态契约测试、Docker、Nginx、Certbot、GitHub Actions。

## Global Constraints

- 官网主题固定为蓝白色调，保持简洁，只介绍一期真实功能。
- 产品名称使用“时空邂逅”，产品能力使用“成家立业”小程序当前一期范围。
- 不编造 ICP 备案号、用户数量、合作机构、奖项或客户评价。
- 页面必须满足 WCAG 2.1 AA 基础要求：语义结构、键盘焦点、跳转主内容、正文对比度、44px 触控目标、减少动态效果。
- 桌面内容最大宽度 1200px，采用 8px 间距基线；正文不小于 16px，关键介绍正文采用 18px。
- 不引入第三方前端依赖、外部字体、跟踪脚本或远程图片，首屏应在普通网络下快速打开。
- 不修改后台 `/api/`、`admin.shikongxiehou.com` 或静态 Demo 的现有路由行为。
- 证书覆盖 `shikongxiehou.com` 与 `www.shikongxiehou.com`，裸域名统一跳转到 `www`。
- 不读取、提交或输出任何生产密码、私钥、Token、Cookie。

---

### Task 1: 官网静态契约测试

**Files:**
- Create: `scripts/test-official-website.mjs`
- Test: `scripts/test-official-website.mjs`

**Interfaces:**
- Consumes: `docs/官网/index.html`、`docs/官网/styles.css`、`docs/官网/app.js`。
- Produces: `node scripts/test-official-website.mjs`，对官网结构、文案、无障碍、响应式和部署引用给出确定性校验。

- [ ] **Step 1: Write the failing test**

测试使用 `node:assert/strict` 读取三个官网文件，并断言：文件存在；页面含一个 `<h1>`、`header/nav/main/footer`、`#main-content` 跳转链接、四个功能区、公司主体文案和备案占位说明；页面不含虚构 ICP 号；样式含蓝白语义 token、`:focus-visible`、`prefers-reduced-motion`、`clamp()` 与 `@media (min-width:`；脚本只处理当前年份和移动导航状态。

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-official-website.mjs`

Expected: FAIL，提示 `docs/官网/index.html` 不存在。

- [ ] **Step 3: Keep the test focused**

测试只验证用户可观察的页面与部署契约，不匹配具体像素坐标，不依赖网络或生产环境。

### Task 2: 蓝白功能介绍官网

**Files:**
- Create: `docs/官网/index.html`
- Create: `docs/官网/styles.css`
- Create: `docs/官网/app.js`
- Test: `scripts/test-official-website.mjs`

**Interfaces:**
- Consumes: Task 1 的静态契约；`docs/需求文档/一期上线目标.md` 的一期产品范围。
- Produces: 可直接由任意静态服务器托管的官网目录。

- [ ] **Step 1: Implement semantic content**

页面依次包含：跳转主内容、品牌导航、首屏价值主张、真实认证/智能推荐/社区互动/安全沟通四项能力、三步使用说明、安全与隐私说明、微信小程序提示和合规页脚。主体展示使用仓库中已验证的“上海兴家立业网络科技”，不擅自补写未经核实的企业全称；主按钮跳到“核心功能”，次按钮跳到“如何使用”，不提供无法兑现的下载或注册动作。

- [ ] **Step 2: Implement the visual system**

在 `:root` 定义蓝色、强调蓝、白色、文字、弱文字、边框、背景、阴影、间距、圆角和字体 token。使用 CSS 渐变、几何光晕与真实 DOM 卡片构成首屏产品视觉，不依赖位图；基础布局从 320px 开始，768px 与 1024px 逐步增强。

- [ ] **Step 3: Implement minimal behavior**

`app.js` 设置页脚年份，切换移动导航的 `aria-expanded` 与可见状态；Escape 和点击导航链接时关闭菜单。

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-official-website.mjs`

Expected: PASS，输出 `官网静态契约校验通过`。

### Task 3: 镜像打包与流水线契约

**Files:**
- Modify: `scripts/validate-prod-deploy-config.mjs`
- Modify: `.dockerignore`
- Modify: `frontend/Dockerfile`
- Modify: `.github/workflows/deploy-admin-prod.yml`

**Interfaces:**
- Consumes: `docs/官网/`。
- Produces: 管理后台镜像中的 `/usr/share/nginx/html/website/`，以及官网源码变化触发的生产构建。

- [ ] **Step 1: Add failing deploy assertions**

在生产部署校验中断言 Dockerfile 含 `COPY docs/官网/ /usr/share/nginx/html/website/`，`.dockerignore` 放行 `docs/官网/**`，管理后台工作流监听 `docs/官网/**` 并执行官网契约测试。

- [ ] **Step 2: Run deploy test to verify it fails**

Run: `node scripts/validate-prod-deploy-config.mjs`

Expected: FAIL，提示缺少官网 COPY 或 workflow path。

- [ ] **Step 3: Implement image packaging**

放行官网目录、复制官网静态文件，并在工作流构建镜像前执行 `node scripts/test-official-website.mjs`。

- [ ] **Step 4: Run deploy test to verify it passes**

Run: `node scripts/validate-prod-deploy-config.mjs`

Expected: PASS，输出 `生产部署静态配置校验通过`。

### Task 4: 官网域名、HTTPS 与续期

**Files:**
- Modify: `deploy/nginx-prod/conf.d/default.conf`
- Modify: `deploy/docker-compose.prod.yml`
- Modify: `deploy/scripts/deploy-prod-local.sh`
- Create: `deploy/scripts/renew-site-cert.sh`
- Modify: `deploy/server.prod.env.example`
- Modify: `scripts/validate-prod-deploy-config.mjs`

**Interfaces:**
- Consumes: 生产机 `/mnt/data/spacetime-prod/letsencrypt` 证书目录和 `/mnt/data/spacetime-prod/acme` Webroot。
- Produces: HTTP 自动跳转、裸域名规范化、`www` 官网代理、ACME challenge 服务和可重复续期命令。

- [ ] **Step 1: Add failing HTTPS assertions**

断言 Nginx 同时声明两个官网域名、使用 `/etc/letsencrypt/live/www.shikongxiehou.com/fullchain.pem`、裸域名跳转到 `https://www.shikongxiehou.com`、官网请求改写到 `/website/`；部署脚本挂载 Let's Encrypt 与 ACME 目录；续期脚本执行 Certbot webroot 续期并重载 Nginx。

- [ ] **Step 2: Run deploy test to verify it fails**

Run: `node scripts/validate-prod-deploy-config.mjs`

Expected: FAIL，提示官网 server block 或证书挂载缺失。

- [ ] **Step 3: Implement Nginx and renewal support**

添加 80/443 官网 server block，保留后台 server block；`deploy-prod-local.sh` 新增 `SITE_SSL_DIR`、`ACME_WEBROOT`，校验证书并挂载；`renew-site-cert.sh` 用 `certbot/certbot` 的 webroot 模式更新双域名证书，成功后执行 `nginx -t` 和 reload。

- [ ] **Step 4: Run configuration verification**

Run: `node scripts/validate-prod-deploy-config.mjs`

Run: `docker run --rm -v "$PWD/deploy/nginx-prod/conf.d:/etc/nginx/conf.d:ro" -v "$PWD/deploy/nginx-prod/ssl:/etc/nginx/ssl:ro" nginx:1.27-alpine nginx -t`

Expected: Node 校验通过；Nginx 本地校验在提供官网证书测试夹具后通过，生产机最终以真实证书再次执行 `nginx -t`。

### Task 5: 浏览器验收与生产上线

**Files:**
- Create: `docs/验收报告/2026-09-07-时空邂逅官网-acceptance.md`
- Create: `docs/测试文档/验收截图/官网/desktop.png`
- Create: `docs/测试文档/验收截图/官网/mobile.png`

**Interfaces:**
- Consumes: 完成的官网、生产镜像、DNS A 记录 `112.124.59.146`。
- Produces: 可复核的桌面/移动截图、构建结果、TLS 结果和线上状态码。

- [ ] **Step 1: Build and serve locally**

Run: `npm --prefix frontend run build`

Run: `python3 -m http.server 4174 --directory docs/官网`

Expected: 前端构建通过；本地官网返回 HTTP 200。

- [ ] **Step 2: Browser QA**

使用 1440×1000 与 390×844 视口验证无横向滚动、导航可用、锚点正确、键盘焦点可见，并生成两张截图。按快速评审记录 Critical / Important / Recommendation；上线前必须清零 Critical 与 Important。

- [ ] **Step 3: Bootstrap production certificate**

在生产机停止 Nginx 的最短窗口内，用 `certbot/certbot` standalone 模式签发 `shikongxiehou.com` 与 `www.shikongxiehou.com` 证书到 `/mnt/data/spacetime-prod/letsencrypt`，随后立即恢复 Nginx；不在日志中输出私钥。

- [ ] **Step 4: Deploy durable source and runtime**

通过现有生产发布链路构建含官网的 admin 镜像并同步 Nginx/脚本；若流水线等待时间影响当前交付，可先将 `docs/官网/` 热同步到运行容器的 `/usr/share/nginx/html/website/`，再部署持久化镜像。

- [ ] **Step 5: Verify production**

Run: `curl -fsSI https://www.shikongxiehou.com/`

Run: `curl -fsSI https://shikongxiehou.com/`

Run: `openssl s_client -connect www.shikongxiehou.com:443 -servername www.shikongxiehou.com </dev/null 2>/dev/null | openssl x509 -noout -ext subjectAltName -dates`

Expected: `www` 返回 200；裸域名 301 到 `www`；证书 SAN 同时包含两个域名且处于有效期。
