# 时空邂逅官网上线验收报告

## 1. 验收结论

- 结论：通过。
- 生产地址：`https://www.shikongxiehou.com/`
- 生产提交：`f34d07e feat(site): launch official website`
- 页面源码：`docs/官网/`
- 镜像目录：`/usr/share/nginx/html/website/`，与 `/usr/share/nginx/html/demo/` 同级。
- 备案状态：未提供真实 ICP 备案号，页面只展示“备案信息将在审核通过后展示”，未编造编号。

## 2. 交付范围

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 蓝白官网 | 已完成 | `docs/官网/index.html`、`styles.css`、`app.js` |
| 品牌标识 | 已完成 | 页头与页脚统一使用用户提供的 `docs/官网/assets/shikongxiehou-logo.png` |
| 功能介绍 | 已完成 | 真实认证、智能推荐、社区互动、安全沟通 |
| 响应式 | 已完成 | 390px 与 1440px 截图，无横向溢出 |
| 无障碍基础 | 已完成 | 单一 H1、语义地标、跳到主内容、键盘焦点、ARIA 移动导航、减少动态效果 |
| 镜像持久化 | 已完成 | `frontend/Dockerfile` 复制官网到 `/usr/share/nginx/html/website/` |
| 域名与 HTTPS | 已完成 | `www` 返回 200；裸域名和 HTTP 入口跳转到 `https://www...` |
| 自动续期 | 已完成 | `/mnt/data/spacetime-prod/deploy/scripts/renew-site-cert.sh` 每周一、周四 04:17 执行 |
| 既有服务回归 | 已完成 | 管理后台与 `/demo/` 均返回 200 |

## 3. 设计快速评审

| 领域 | 规则 | 结果 | 严重度 |
| --- | --- | --- | --- |
| Accessibility | WCAG 2.1 AA 语义、焦点、触控与对比度 | 通过；正文 17.85:1、辅助正文 7.58:1、主蓝链接 5.99:1 | 无问题 |
| Usability | 首屏核心信息和主要动作清晰 | 通过；首屏直接说明产品定位，主动作仅为了解功能 | 无问题 |
| UX | 信息结构围绕用户理解顺序 | 通过；价值主张 → 功能 → 使用方式 → 安全 → 关于我们 | 无问题 |
| UI | 单一焦点、8px 间距基线、最大宽度与 token | 通过；蓝白统一，视觉层级明确 | 无问题 |
| Typography | 系统字体、流式字号、可读行长 | 通过；不依赖外部字体，标题使用 `clamp()` | 无问题 |
| Color | 主色 + 中性色，正文 AA 对比度 | 通过；颜色不作为唯一信息信号 | 无问题 |
| Responsive | 移动优先、内容断点、44px 触控目标 | 通过；390px 无横向溢出，移动导航可用 | 无问题 |
| Landing Page | 一个主要目标，首屏价值清晰 | 通过；不提供虚构下载、注册或用户数据 | 无问题 |

Critical：0；Important：0；Recommendation：0。

## 4. 验证记录

### 4.1 静态与构建

```text
node scripts/test-official-website.mjs
官网静态契约校验通过

node scripts/validate-prod-deploy-config.mjs
生产部署静态配置校验通过

bash -n deploy/scripts/deploy-prod-local.sh deploy/scripts/renew-site-cert.sh
退出码 0

npm --prefix frontend run build
✓ 1723 modules transformed.
✓ built in 2.58s
```

管理后台构建保留既有大分包提示，本次官网为独立静态文件，不进入该 JavaScript 分包。

### 4.2 浏览器

- 390×844：`documentElement.scrollWidth === documentElement.clientWidth === 390`。
- 品牌 Logo：2 个实例均加载完成，原始尺寸 1000×1000，展示裁切框 200×76，无横向溢出。
- 移动导航：`aria-expanded` 从 `false` 切换为 `true`，点击锚点后恢复 `false`。
- 键盘焦点：链接获得 3px 实线焦点环。
- 控制台错误：0。
- 桌面截图：`docs/测试文档/验收截图/官网/desktop.png`。
- 移动截图：`docs/测试文档/验收截图/官网/mobile.png`。

### 4.3 生产运行态

```text
https://www.shikongxiehou.com/          HTTP/2 200
https://shikongxiehou.com/              HTTP/2 301 -> https://www.shikongxiehou.com/
http://www.shikongxiehou.com/           HTTP/1.1 301 -> https://www.shikongxiehou.com/
https://admin.shikongxiehou.com/        200
https://admin.shikongxiehou.com/demo/   200
```

证书信息：

```text
subject=CN=www.shikongxiehou.com
issuer=Let's Encrypt YE1
SAN=shikongxiehou.com, www.shikongxiehou.com
notAfter=2026-12-06 00:44:46 GMT
```

管理端生产流水线 `34074155714` 完成并成功重建 admin 容器。随后共享部署流程重建 backend 与 Nginx，最终检查三个容器均为 `running`，Nginx `nginx -t` 通过，新 admin 镜像内存在 `website/index.html`、`styles.css` 和 `app.js`。

## 5. 发布与恢复说明

- 证书持久目录：`/mnt/data/spacetime-prod/letsencrypt`。
- ACME Webroot：`/mnt/data/spacetime-prod/acme`。
- 续期日志：`/var/log/spacetime/site-cert-renew.log`。
- 切换前配置备份：`/mnt/data/spacetime-prod/deploy/nginx-prod/conf.d/default.conf.pre-official-site`。
- 本次切换先在临时目录配合真实证书执行 `nginx -t`，再替换运行容器；原 admin 和 Demo 路由未改变。

## 6. 后续合规项

取得真实 ICP 备案号后，将页脚占位文案替换为备案号，并链接到工信部备案系统；如取得公安备案号，再补充对应真实链接。企业完整法定名称也应以备案主体材料为准，当前只展示仓库已有并可验证的“上海兴家立业网络科技”。
