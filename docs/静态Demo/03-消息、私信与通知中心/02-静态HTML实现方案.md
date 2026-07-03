# 03-消息、私信与通知中心静态 Demo - HTML 实现方案

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-02 | Codex | 定义 PRD-03 静态 Demo 的文件结构、页面合并规则和验证方式 |

---

## 1. 技术形态

| 项 | 方案 |
|----|------|
| 运行方式 | 纯静态 HTML，可直接打开；也可通过本地 HTTP 服务预览 |
| 公共样式 | 复用 `docs/静态Demo/shared/base.css`、`admin.css`、`admin-state.css` |
| 模块样式 | `html/assets/demo.css` |
| 交互脚本 | `html/assets/demo.js` |
| 数据来源 | `html/mock/demo-data.js` |

---

## 2. 页面入口

| 文件 | 入口 |
|------|------|
| `html/index.html` | PRD-03 Demo 总览、范围、边界说明 |
| `html/miniapp.html` | 移动端 Demo |
| `html/admin.html` | 管理后台 Demo |

---

## 3. 后台合并规则实现

| 页面规格 | 实现方式 |
|----------|----------|
| App 用户管理列表-消息字段补充 | 在 `../01-用户准入与资料认证初始化/html/admin.html#ADM-01-PAGE-app-user-management` 的原 App 用户管理卡片中新增“模块补充”按钮，不直铺消息字段 |
| App 用户管理模块补充弹窗-消息互动 Tab | 在 01 原 App 用户管理的模块补充弹窗“消息互动”Tab 中展示消息互动区块；私信、悄悄话、通知、举报记录均带 5 条/页分页组件；03 后台页仅保留合并说明和跳转入口 |
| 举报处理-聊天举报字段补充 | 在 `admin.html#ADM-03-MERGED-report-chat-fields` 中以原举报处理页方式展示聊天上下文字段 |

这些合并承接区不作为独立后台菜单页命名为“字段补充页”，侧边栏文案必须体现“已合并”。

---

## 4. 独立页面实现

| 页面 ID | 文件锚点 |
|---------|----------|
| `ADM-03-PAGE-message-record-query` | `admin.html#ADM-03-PAGE-message-record-query` |
| `ADM-03-PAGE-message-config` | `admin.html#ADM-03-PAGE-message-config` |

---

## 5. 交互范围

| 类型 | 交互 |
|------|------|
| 移动端 | 页面状态切换、消息发送失败重试、悄悄话回复/忽略、通知筛选、邀请响应跳转、全部已读 |
| 管理后台 | 表格渲染、记录类型筛选说明、详情抽屉、高敏查看确认、导出确认、配置保存确认、配置日志抽屉 |

---

## 6. 验证方式

1. 文档检查：确认 Demo 文件存在，HTML 引用路径正确。
2. 静态检查：检查 PRD-03 Demo HTML/CSS/JS 中无待确认或占位标记。
3. 语义检查：确认字段补充类页面没有被做成独立菜单页。
4. 浏览器检查：通过本地 HTTP 服务打开 `index.html`、`miniapp.html`、`admin.html`，检查移动端和后台主要交互。
