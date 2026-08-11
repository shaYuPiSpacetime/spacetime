# 消息、私信与通知中心测试报告

> 执行日期：2026-08-11
> 对应方案：`docs/技术方案/2026-07-31-消息、私信与通知中心-tcdesign.md`
> 测试用例：`docs/测试文档/消息私信通知中心-testcase.md`
> 结论：**本地后端、开发库真实接口、管理后台页面闭环通过；腾讯云 TIM 双账号和生产 KMS 仍待外部环境联调**

## 1. 执行结果

| 层级 | 执行内容 | 结果 |
|------|----------|------|
| L2/L3 全量 | Java 21 下执行后端完整 Maven `clean test` | 721 条执行，0 失败，0 错误，0 跳过 |
| PRD-03 聚焦 | 表结构、消息已读、四类未读、后台四列表、高敏权限、富媒体拦截与 Controller 契约 | 41 条通过，0 失败，0 错误，0 跳过 |
| 数据库迁移 | 本地 dev MySQL 执行 `070_prd03_message_center_closure.sql` | 43 条语句执行成功；已读字段和联合索引存在 |
| 真实流程数据 | 选择现有正常 App 用户，幂等执行 `071_prd03_message_interaction_demo_seed.sql` | 18 条语句执行成功；重复执行后数量稳定 |
| L1 真实接口 | 两个真实用户的摘要及四列表，服务端固定 `size=5` | 通过；请求 `size=100` 仍返回 5 条，列表不返回正文 |
| 高敏查看 | 私信/悄悄话专用端点、原因、权限、审计、禁止缓存 | 通过；允许、拒绝、异常均留审计，成功返回唯一审计编号，`Cache-Control=no-store` |
| 权限快照回归 | 登录后新增高敏权限，Redis Token 仍为旧权限快照 | 通过；拦截器用数据库当前权限放行并同步请求上下文，无需重新登录 |
| 管理后台 | React 构建 + Playwright 真实登录、真实数据、弹窗交互、权限禁用态与并发切换 | 构建通过；3 条端到端用例通过 |
| 腾讯云 TIM | 双账号、UserSig、公网前后回调、REST 投递、漫游历史 | 未执行：当前未提供可验收的测试应用和公网回调环境 |
| 生产 KMS | 系统/助手消息及举报证据加解密、轮换 | 未执行：当前未提供生产 KMS 资源 |
| 小程序前端 | LiteChat SDK 与页面改造 | 不在本轮范围，未编写或修改小程序前端代码 |

## 2. 真实数据与接口证据

测试数据没有新建虚构 `app_user`，而是选择开发库已有正常用户“小红 U2”和“小刚 U3”，只新增
PRD-03 消息业务数据。

| 用户 | 消息未读 | 私信未读 | 悄悄话未读 | 平台兼容未读 | 私信总数/首屏 | 悄悄话总数/首屏 | 系统助手总数/首屏 | 举报总数/首屏 |
|------|----------|----------|------------|--------------|---------------|-----------------|-------------------|---------------|
| 小红 U2 | 10 | 3 | 1 | 7 | 8 / 5 | 5 / 5 | 8 / 5 | 6 / 5 |
| 小刚 U3 | 3 | 1 | 0 | 2 | 8 / 5 | 3 / 3 | 4 / 4 | 6 / 5 |

覆盖状态：

| 模块 | 已验证状态/范围 | 主要表 |
|------|---------------|--------|
| 私信消息 | `queued`、`sent`、`failed`；`unread`、`read`、`not_applicable`；失败原因 | `app_message_record`、`app_message_conversation`、`app_message_conversation_member` |
| 悄悄话 | `pending`、`replied`、`expired`、`invalid`；`sent`、`failed`；申请/回复消息映射 | `app_message_whisper`、`app_message_record` |
| 系统/助手消息 | system/assistant 混合时间排序；read/unread | `app_system_message`、`app_assistant_message` |
| 举报 | `pending`、`processing`、`valid`、`invalid`、`merged` | `community_report` |
| 高敏审计 | `context_type=app_user_message`、查看原因、管理员、目标；`allowed`、`denied`、`error` 结果 | `app_message_sensitive_access_log` |

接口核验还确认：`messageUnreadCount = privateUnreadCount + whisperUnreadCount + assistantUnreadCount + systemUnreadCount`；
`platformUnreadCount` 继续作为悄悄话、助手、系统三类之和的兼容字段。

## 3. 页面验收

Playwright 使用真实管理员登录和真实后端数据执行以下流程：

1. 进入 App 用户管理，搜索“小红”。
2. 打开“心动 & 消息”，切换“消息互动”。
3. 校验私信消息、悄悄话、系统/助手消息、举报四个面板始终存在。
4. 校验四个面板固定显示“5条/页”，数据超过 5 条时首屏只渲染 5 条。
5. 校验普通列表不出现私信正文。
6. 点击“查看高敏”，填写原因并二次确认，取得审计编号。
7. 关闭高敏弹窗后，外层用户弹窗、消息 Tab 和列表状态保持不变。
8. 快速从“小红”切换到“小刚”，延迟返回的旧用户请求不得覆盖当前用户数据。
9. 私信与悄悄话显示“昵称（U编号）”，昵称缺失时才回退脱敏用户编号。
10. 顶部不再展示“高敏查看审计”说明卡；无高敏权限时眼睛图标禁用，悬停提示“无查看权限”。

验收截图：

- `docs/测试文档/证据/消息互动后台真实数据.png`
- `docs/测试文档/证据/消息互动后台真实数据-下半区.png`
- `docs/测试文档/证据/消息互动查看高敏二次确认.png`

## 4. 执行命令与结果

```powershell
$env:JAVA_HOME='C:\Users\50449\.jdks\ms-21.0.11'
cd backend
mvn clean test
```

```text
Tests run: 721, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

```powershell
cd frontend
npm run build
npx playwright test --config=e2e-tests/playwright.config.ts --retries=0 prd03-message-interaction-real.spec.ts
```

```text
Frontend: 1720 modules transformed, build success
Playwright: 3 passed
```

E2E 在后端健康检查稳定后执行且关闭自动重试，单次直接通过。构建仅保留既有的单个 chunk
超过 500 kB 警告，不影响本轮功能验收。

高敏 403 缺陷回归：`PermissionInterceptorTest` 与 `AppUserMessageAdminServiceImplTest` 共 6 条通过；
真实接口 `MSG-DEMO-PRD03-007` 返回 HTTP 200、正文 1 条；高敏页面 Playwright 用例 1 条通过。

## 5. 未执行与上线门禁

1. 腾讯云测试应用可用后，补双账号普通私信、悄悄话 REST 投递、前回调拒绝、后回调归档、TIM 已读和本地已读对账。
2. 生产 KMS Provider、密钥轮换及最小权限账号仍需部署验证；不得以开发密钥替代生产验收。
3. 聊天正文留存周期、举报取证及注销清理仍需法务/隐私书面复核后开放生产流量。
4. 首版只支持文本与 Unicode Emoji；图片、视频、语音、文件和贴纸不在本轮验收范围。

## 6. 最终判定

- 后端代码、数据库迁移和真实接口：**通过**。
- 管理后台构建、真实数据展示和高敏交互：**通过**。
- 小程序前端：**未改动，符合交付边界**。
- 腾讯 TIM 与生产 KMS：**未验收，等待外部环境**。
