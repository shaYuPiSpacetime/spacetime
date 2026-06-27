# PRD-01 管理后台与小程序 Demo 实施计划

## 摘要
- 采用现有 React 生态：后台复用 `frontend/` 的 React 18 + Vite + Tailwind，小程序复用 `miniapp/` 的 Taro 4 + React 18。
- 交付 PRD-01 P0 主链路 demo：后台 App 用户卡片宫格与画像抽屉，小程序登录、轻量引导、强引导、三重认证与准入拦截主流程。
- UI 依据使用本地 `.lanhu-ref`、现有切图、PRD 页面规格；后台保留现有鉴权，不新增免登录入口。

## 关键改动
- 后台：将 [CustomersPage.tsx](/Users/bobo/IdeaProjects/shayupi/spacetime/frontend/src/pages/customers/CustomersPage.tsx) 从表格重塑为卡片宫格，增加统计卡、筛选区、分页、用户画像抽屉、批量导入/导出演示弹窗；头像审核按钮跳转现有 `/verify/avatar`。
- 后台数据：扩展 `AppUserListVO/AppUserDetailVO` 的 demo 展示字段，优先用现有接口数据，缺字段时在页面层补 demo fixture，不改后端接口。
- 小程序：补齐 PRD 缺口，新增“身份选择”页并注册路由；调整登录轻量引导顺序为 `性别 -> 出生日期 -> 身份 -> 学历 -> 现居地 -> 基本资料`。
- 小程序：复用现有 `LoginProfileShell`、`VerificationShell` 和蓝湖资源，补核心准入拦截 demo 页/弹窗，保证主流程可点通。

## 接口与类型
- 不新增后端 API，不改数据库，不改 `request` 全局拦截器。
- 扩展 `miniapp/src/types/login.ts`：`LoginStep` 增加 `identity`，`LoginUserInfo.identity` 统一承接“在校生/职场人”。
- 后台新增前端内部展示模型，例如 `AdminUserCardItem`、`VerificationPoint`、`ProfileDrawerSection`，仅服务 demo 渲染。

## 测试与验收
- 按本机要求，实施后不执行编译、构建、dev server 或测试命令。
- 静态验收：确认后台 `/customers` 为卡片宫格，画像抽屉可打开，导入/导出弹窗可见，头像审核跳转存在。
- 静态验收：确认小程序 `app.config.ts` 注册身份页，登录流程跳转顺序正确，强引导和三重认证页面仍可串联。
- 可选人工验收由你本地运行：后台登录后访问 `/customers`；小程序从 `/pages/login/index` 进入首登流程。

## 假设
- 未收到进一步选择时，默认复用现有两个工程、做 P0 主链路、使用本地 UI 稿。
- “最流行前端框架”按 React 落地；Stack Overflow 2025 技术调查中 React 在 Web frameworks/technologies 使用率为 44.7%，且本仓库现有前端也已采用 React。来源：https://survey.stackoverflow.co/2025/technology
- 当前蓝湖邀请链接缺少 `pid`，不能直接通过 MCP 拉取最新画板；本轮以仓库内 `.lanhu-ref` 与 PRD 中 Figma/蓝湖说明为准。
- 当前可用子代理工具要求用户明确提出并行/子代理工作才可启用；本计划默认不派发子代理。
