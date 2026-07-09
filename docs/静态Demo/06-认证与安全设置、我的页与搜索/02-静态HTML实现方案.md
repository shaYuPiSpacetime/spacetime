# PRD-06 静态 HTML 实现方案

## 文件结构

```text
docs/静态Demo/06-认证与安全设置、我的页与搜索/
├── 00-文档读取与页面范围.md
├── 01-页面元素清单.md
├── 02-静态HTML实现方案.md
├── 03-静态HTML自测与还原度报告.md
├── 04-静态HTML交付报告.md
├── html/
│   ├── index.html
│   ├── miniapp.html
│   ├── admin.html
│   ├── assets/demo.css
│   ├── assets/demo.js
│   └── mock/demo-data.js
└── 截图证据/
```

## 技术口径

| 项 | 方案 |
|----|------|
| 技术栈 | 原生 HTML/CSS/JS |
| 数据 | `html/mock/demo-data.js` 注入 `window.PRD06_DATA` |
| 样式 | 复用 `docs/静态Demo/shared/base.css`，PRD-06 自定义 `assets/demo.css` |
| 交互 | 搜索 Tab、热词点击、查询/保存 toast、注销提交 toast |
| 运行方式 | 可直接打开 HTML；验证时使用本地静态服务便于截图 |
| 移动端视觉基准 | 用户提供的移动端“我的页”UI 图优先，PRD 有但 UI 图遗漏的内容继续保留 |
| 管理后台视觉基准 | 只读参考 `frontend/src/pages/content/*`、`frontend/src/pages/user-security/*` 与后台布局组件，不修改真实 frontend 代码 |

## 页面实现要点

1. `index.html` 展示总览、概念图、两端入口和 PRD 门禁结论。
2. `miniapp.html` 使用四个手机框同时展示关键移动端页面态，其中“我的页”首屏按用户 UI 图重做，保留状态栏、胶囊、资料区、统计卡、会员横幅、千寻币/邀请好友、菜单和底部 Tab。
3. `admin.html` 参考真实后台白色侧栏、固定顶栏、内容管理配置菜单和 shadcn 风格卡片表格，展示 PRD-06 一期后台配置。
4. Demo 不模拟真实登录、不请求接口、不写本地存储；所有状态为本地 mock。

## 管理后台一期范围评估

| 来源 | 纳入 Demo | 说明 |
|------|-----------|------|
| `content/app-config` | 是 | 协议、关于、搜索、我的页面、设置页面为 PRD-06 一期配置 |
| `content/mobile-entries` | 是 | 我的页、设置页、帮助客服入口为一期配置；不支持新增未知入口 |
| `content/articles` | 是 | 公告、帮助、安全内容、关于我们承接移动端 H5/原生内容 |
| `content/search-hot-words` | 是 | 搜索热词为 P0 |
| `content/search-block-words` | 是 | 搜索屏蔽词为 P0 |
| `user-security/feedback` | 是 | 反馈箱为 P0 |
| `user-security/cancel-requests` | 是 | 注销申请为 P0 |
| `content/operation-logs` | 否 | 后台通用审计，不作为 PRD-06 主 Demo 页面 |
| 安全中心独立移动端页 | 否 | 一期不做独立页，仅保留安全提示内容配置 |

## 验证计划

| 验证项 | 方法 |
|--------|------|
| HTML 可打开 | 本地静态服务访问三页 |
| JS 无运行错误 | 浏览器控制台 / Playwright |
| 桌面截图 | 1440px 宽度截图 |
| 移动端截图 | 390px 宽度截图 |
| 元素级截图 | 单独截取“我的页”手机框 |
| 交互 | 搜索 Tab、热词、后台保存/查询/表格操作、注销提交 |
