# 消息、私信与通知中心测试报告

## 2026-08-14 小程序消息闭环与生产 30023 诊断报告

### 结论

小程序消息中心代码、后端兼容增量、微信正式构建及 H5 可重复端到端链路均已通过。本轮新增公开资料
稳定用户编号、LiteChat 消息定位举报、平台未读运行时、私信/悄悄话/助手/系统消息页面真实接口接入，
并保持 LiteChat SDK 仅进入消息分包。

生产接口 `GET /api/miniapp/im/credentials` 返回 `30023` 的直接原因不是 KMS，也不是前端请求格式：
生产容器对应的 `prod.env` 与 `runtime.env` 均未配置有效的 `TENCENT_IM_ENABLED`、`SDK_APP_ID`、
`SECRET_KEY` 和回调鉴权参数。仓库与本机可检索配置中也没有真实 TIM 密钥，因此本报告不以占位值、
测试值或伪造 UserSig 宣称现网已恢复。代码侧已具备启用校验、容器变量透传和发布门禁；现网恢复仍需
向生产私密配置写入同一 TIM 应用的真实凭据并重新发布。

### 自动化证据

| 层级 | 命令/范围 | 结果 |
|---|---|---|
| 小程序契约 | `npm run validate:message-closure` | 14 条通过，0 失败 |
| 微信正式构建 | `npm run build:weapp` | 编译成功；84 个页面注册门禁通过；主包 1.37 MiB、总包 2.69 MiB |
| 变更文件 ESLint | 本轮新增/修改的 `.ts/.tsx` | 通过，0 错误 |
| H5 构建 | `MINIAPP_DEV_FIXED_LOGIN=true MINIAPP_MESSAGE_PROVIDER=mock npm run build:h5` | 编译成功，仅有既有体积警告 |
| H5 端到端 | `test-message-mobile-closure-h5.cjs` | 首页、私信发送、拉黑举报、单条举报、悄悄话收发、助手与系统频道全部通过 |
| 后端聚焦 | 举报上下文与公开资料 Service | 通过，0 失败 |
| 后端全量 | Java 21 执行 `mvn test -q` | 退出码 0，0 失败 |
| TIM 部署门禁 | `node scripts/test-prod-tencent-im-config.mjs` | 通过；启用校验、容器透传、流水线接入及仓库无真实密钥均符合要求 |

### 已知基线与外部门禁

1. 全仓 `npm run lint` 被本轮未修改的 3 个 PRD-08 文件中的异常空白字符拦截；本轮变更文件定向 ESLint 已通过。
2. `validate-prod-deploy-config.mjs` 会拒绝历史迁移 `013_prd01_drop_legacy_audit_tables.sql` 中的 `DROP TABLE`；后端发布工作流不执行该综合脚本，本轮未弱化生产 SQL 安全门禁。
3. H5 首次使用真实登录态构建时按设计跳转登录页；切换为固定测试登录态与 Mock Provider 后完整 E2E 通过。生产微信构建已单独验证，测试态不会进入正式产物。
4. 生产 TIM 真实双账号、UserSig 和公网回调复验必须在真实密钥配置后执行；当前 `30023` 在此之前仍会持续出现。

## 2026-08-14 移除应用层 KMS 增量报告

### 结论

PRD-03 消息链路已移除应用层 KMS/AES 依赖，生产环境不再需要配置任何 `MESSAGE_TEXT_*`
参数，消息首页、系统消息初始化、官方助手消息、私信/悄悄话归档和举报取证均不会再因 KMS
未配置而失败。

当前存储口径如下：

| 数据 | 当前存储与读取口径 |
|---|---|
| 系统消息、官方助手消息 | 平台数据库 `title_text/content_text` 受控明文存储，不走 TIM，不依赖 KMS |
| 普通私信、悄悄话 | 由 TIM 投递，同时在 `app_message_record.content_text` 归档受控明文，不依赖 KMS |
| 举报证据 | `community_report_evidence.content_text` 固化受控明文；仍执行独立权限、查看原因、二次确认和审计 |
| Inbox 事件载荷 | `app_message_event_inbox.payload_json` 保存有界业务 JSON，禁止放聊天正文；处理成功、死亡或过期后清空 |

升级现有数据库时必须先执行 `deploy/sql/prod/074_prd03_remove_message_kms.sql`。迁移脚本不删除旧密文字段，
以避免破坏历史数据；旧的未处理密文 Inbox 事件会转为 `dead`，失败原因为
`legacy_kms_payload_unsupported`，需要按原业务事实重新投递。只有旧密文、没有明文字段的历史平台消息或
举报证据无法在移除密钥后恢复正文，界面按“正文不可用”处理。

### 自动化证据

| 层级 | 命令/范围 | 结果 |
|---|---|---|
| 无 KMS 契约 | 实体、SQL、事件发布、举报冻结与后台受控查看 | 21 条通过，0 失败、0 错误、0 跳过 |
| 消息模块回归 | `*Message*Test` 与举报证据服务 | 137 条通过，0 失败、0 错误、0 跳过 |
| 后端全量 | Java 21 执行 `mvn -o test` | 767 条通过，0 失败、0 错误、0 跳过，`BUILD SUCCESS` |
| 管理后台构建 | `npm.cmd run build` | TypeScript 与 Vite 构建成功，1723 个模块完成转换 |

本轮未编写、未修改小程序前端代码。前端构建仅保留既有 chunk 体积警告，不影响本次改造。

## 2026-08-13 腾讯云 TIM 真实联调增量报告

### 结论

真实 TIM 账号同步、UserSig、REST 投递、悄悄话回复匹配、本地签名回调和数据库回写均已通过。
本轮同时修复两项真实联调发现的问题：Jackson 时间类型此前只配置序列化格式、未配置对应反序列化器，
导致 Redis 悄悄话报价读回失败；生产部署脚本此前未把 `TENCENT_IM_*` 写入容器运行时环境，导致公网
回调返回 `callback is not configured`。

公网生产入口必须在合并并重新发布后端后再次验证，本报告不把“代码已修复”写成“现网已生效”。

### 真实数据证据

| 项目 | 结果 |
| --- | --- |
| 测试用户 | 开发库真实用户 `U78（AACompleteUser01）`、`U79（AACompleteUser02）`，账号状态均为正常 |
| TIM 账号与凭证 | 两个用户账号导入幂等成功，`/miniapp/im/credentials` 返回对应短期 UserSig；报告不记录 UserSig 或 SecretKey |
| 悄悄话申请 | `WSP-C16607A0532E475FB42609D2CBEA4380`，`status=replied`、`deliveryStatus=sent`、`payType=vip_free` |
| 匹配 | `MAT-52E77BBF73A64E5AB1DDBA25CE63932B`，`matchStatus=matched`、`primarySource=whisper_reply` |
| 私信会话 | `CV-EE9B17E5742745279A77CD767453D63F`，`status=active`，双方会话列表均可查询 |
| 请求/回复消息 | 两条 `app_message_record` 均为 `sendStatus=sent`，均保存腾讯返回的 MsgId/MsgKey |
| TIM 漫游反查 | 2026-08-13 通过腾讯 `admin_getroammsg` 反查上述双方账号，返回 `ActionStatus=OK`、`ErrorCode=0`、`MsgCnt=2`、`Complete=1`；云端消息分别为 `MSG-708C11E89C3D4835B496D16F21EA151D / whisper_request` 和 `MSG-EC44288438FB40788761375958902722 / whisper_reply` |
| 控制台统计口径 | 两条消息发送于 2026-08-13 18:52:48、18:55:53；当时控制台日统计页面仅统计至 2026-08-12，因此“昨日单聊消息量=0”不包含本次消息。腾讯文档说明日统计通常次日上午约 10:00 更新，可同时在罗盘实时监控查看今日单聊消息量 |
| 可靠投递 | 两条 `app_message_delivery_outbox` 均为 `status=sent`、`retryCount=0`，并保存与腾讯漫游结果一致的 MsgKey；本地签名回调重放后 `callbackConfirmedAt` 已写入 |
| 已读同步 | 本地签名重放 `C2C.CallbackAfterMsgReport` 均返回 `OK`；接收消息更新为 `read`，成员读水位只前进不回退；腾讯公网已读回调仍需部署后验证 |
| 回调鉴权 | 正确签名返回 `OK`；错误签名返回 `FAIL/callback signature invalid`，不写业务事实 |

### 自动化证据

| 层级 | 命令/范围 | 结果 |
| --- | --- | --- |
| 回归点 | `JacksonConfigTest,RedisWhisperQuoteStoreTest` | 2 条通过，0 失败、0 错误、0 跳过 |
| TIM 聚焦 | UserSig、REST Provider、回调 Controller/Service、Outbox、悄悄话、会话、文档和 SQL 契约 | 51 条通过，0 失败、0 错误、0 跳过 |
| 后端全量 | Java 21 执行 `mvn test` | 766 条通过，0 失败、0 错误、0 跳过，`BUILD SUCCESS` |
| 发布门禁 | `node scripts/test-prod-tencent-im-config.mjs` | 通过；环境变量绑定、启用校验、容器透传、流水线接入和仓库无真实密钥均通过 |
| 生产总校验 | `node scripts/validate-prod-deploy-config.mjs` | TIM 断言通过后，被既有 `013_prd01_drop_legacy_audit_tables.sql` 的生产 SQL 安全门禁拦截；未弱化该门禁，非本轮 TIM 回归 |

最终复核补充：部署脚本已通过 Bash 语法校验；`JacksonConfigTest`、
`RedisWhisperQuoteStoreTest` 共 2 条重新执行通过；TIM Callback Controller/Service、REST Provider、
悄悄话 Service 共 24 条重新执行通过。开发服务 `8080`、真实 TIM 联调实例 `8081` 和管理后台
`5173` 健康检查均返回 HTTP 200。部署脚本还会在启用 TIM 时校验 SDKAppID、UserSig 有效期、
协议版本及 HTTP 超时均为正整数，防止错误配置进入运行容器。

### 未完成的外部门禁

1. `https://admin.shikongxiehou.com` 对应生产容器尚未部署本轮运行时变量透传修复；部署后需在腾讯控制台重新校验 URL。
2. 真实举报图片 OSS 和小程序 TIM SDK UI 不在本轮后端联调范围；应用层 KMS 已于 2026-08-14 移除，不再是上线门禁。
3. 本轮未编写、未修改小程序前端代码。

## 2026-08-13 管理后台遗漏菜单闭环增量报告

### 2026-08-13 配置业务链路复核

- 本地前端 `5173`、后端 `8080` 已启动，`/health`、前端代理登录与
  `GET /api/admin/message/config` 均返回成功；开发库当前发布版本为
  `MSG-CFG-INIT-001`，规则作用域为 `global`。
- 复核发现悄悄话服务仍以历史作用域 `message_core` 查询规则，而配置发布、
  数据库唯一作用域和会话服务均使用 `global`。已统一为 `global`，避免悄悄话
  预检/创建错误返回“消息规则尚未发布”，并确保 7 天有效期和 7 天冷却期读取后台发布版本。
- Java 21 聚焦回归覆盖配置服务、会话生命周期、TIM 回调和悄悄话服务，
  共 27 条测试，0 失败、0 错误、0 跳过。
- 全局发送开关实时作用于普通私信 TIM 前回调及悄悄话预检/创建；女性保护、
  悄悄话有效期和冷却期按新建业务对象写入版本快照，不追改历史数据。
- 分类留存基线一期仅展示、不允许页面编辑。其中普通消息留存已接清理调度；
  系统消息可见期、举报证据留存期和高敏审计留存期仍由现有固定值执行，未作为
  本期可配置业务参数开放。

### 结论

本次限定范围内的“消息通知记录查询”和“社交权限与消息配置”已完成前后端、菜单权限与页面合同验证；聊天、私信会话、悄悄话举报继续兼容到现有“社区互动管理 → 举报处理”。“用户通知设置页”“后台通知偏好中心”在技术方案中明确为一期不做，运行页、路由和菜单均未创建。

### 执行证据

| 层级 | 命令/范围 | 结果 |
|---|---|---|
| L2/L3 | Java 21：消息 Controller、查询 Mapper、配置服务、消息记录服务、消息表脚本、举报服务与证据服务 | 62 条通过，0 失败，0 错误，0 跳过 |
| 前端构建 | `frontend/npm.cmd run build` | TypeScript 与 Vite 构建成功，1723 个模块完成转换 |
| L4 合同 | `prd03-admin-closure.spec.ts` | 3 条通过；覆盖固定统计、筛选导出、分级详情、版本配置、一期外入口隐藏、悄悄话证据查看 |
| 静态菜单 | `MessageSchemaSqlTest` | 两个页面菜单、三类聊天举报字典和一期外路由禁入断言通过 |

后端聚焦命令：

```powershell
$env:JAVA_HOME='C:\Users\50449\.jdks\ms-21.0.11'
mvn '-Dtest=MessageAdminQueryMapperContractTest,MessageSchemaSqlTest,MessageAdminControllerContractTest,MessageRecordAdminServiceImplTest,MessageConfigAdminServiceImplTest,CommunityAdminServiceImplTest,MessageReportEvidenceAdminServiceImplTest,MessageChatReportContextResolverTest,ChatReportEvidenceServiceImplTest' test
```

页面合同命令：

```powershell
$env:BASE_URL='http://127.0.0.1:5173'
npx.cmd playwright test e2e-tests/tests/prd03-admin-closure.spec.ts --config=e2e-tests/playwright.config.ts --reporter=list
```

### 验收项结果

| 验收项 | 结果 |
|---|---|
| 统计卡片不受筛选条件影响，“今日私信”按自然日统计 | 通过 |
| 导出复用已提交的页面筛选条件，且不导出正文 | 通过 |
| 列表按钮命名为“详情”，用户编号和昵称正常展示 | 通过 |
| 私信/悄悄话正文必须经独立权限、原因和审计查看 | 通过 |
| 系统消息/助手消息在详情中直接展示明文 | 通过 |
| 配置规则走不可变版本发布；全局安全开关走独立即时接口 | 通过 |
| 悄悄话有效期、到期冷却期为两个独立输入 | 通过 |
| 一期不做功能只写技术方案，不出现在运行页面 | 通过 |

截图：

- `docs/测试文档/截图/PRD03后台补漏/消息通知记录查询.png`
- `docs/测试文档/截图/PRD03后台补漏/社交权限与消息配置.png`
- `docs/测试文档/截图/PRD03后台补漏/悄悄话举报证据.png`

### 未执行与门禁

- 本轮已在本机 `8080` 后端和 `5173` 前端完成登录、配置查询及前端代理接口烟测；未执行会改变现网消息状态的真实发送/开关切换操作。
- 未在真实 MySQL 执行 `070_prd03_message_center_closure.sql` 增量段；已通过 SQL 合同测试验证菜单、字典及禁入项。部署前仍需在目标库执行并核对 RBAC 树。
- 腾讯云 TIM 双账号与真实 OSS 仍属于既有外部环境门禁；举报正文改为受控明文后不再存在 KMS 解密门禁。

> 最近执行日期：2026-08-13  
> 对应方案：`docs/技术方案/2026-07-31-消息、私信与通知中心-tcdesign.md`  
> 测试用例：`docs/测试文档/消息私信通知中心-testcase.md`  
> 对接文档：`docs/技术方案/2026-07-31-消息、私信与通知中心-mobile-api-handoff.md`  
> 结论：**2026-08-13 后端全量与消息模块聚焦回归通过；本轮新增 TIM 生命周期绑定、TIM 消息定位已读/举报和迁移索引均通过；此前开发库真实接口和管理后台页面闭环证据继续有效；腾讯云 TIM 双账号与真实 OSS 仍待外部环境联调；应用层 KMS 已于 2026-08-14 移除。**

## 0. 2026-08-13 增量回归

| 项目 | 验证内容 | 结果 |
|------|----------|------|
| 后端全量 | Java 21 执行 `mvn -q test` | 757 条，0 失败，0 错误，0 跳过，退出码 0 |
| 本轮聚焦 | 数据库/文档契约、会话 Mapper、TIM 回调、私信 Service、聊天举报解析 6 类 | 50 条，0 失败，0 错误，0 跳过，退出码 0 |
| 消息首页 | 首页不强依赖 TIM；只返回平台库会话投影、最新消息摘要和未读数据；删除废弃 TIM 字段 | 通过 |
| 悄悄话列表 | `received + pending`、`received + processed` 使用独立游标；`sent` 只允许 `pending`；逐字段契约与动作权限 | 通过 |
| 悄悄话详情 | 正文只在详情返回；申请双方均可举报正文；接收方可逻辑隐藏，底层业务事实保留 | 通过 |
| 回复匹配 | 回复正文由后端投递 TIM；成功后更新悄悄话、创建匹配与私信会话；重复请求幂等 | 通过 |
| 来源绑定 | `recommendation`、`profile`、`community_post`、`community_comment`、`whisper_reverse` 及业务编号校验 | 通过 |
| 举报凭证 | 举报凭证上传票据、图片格式/大小/数量、OSS URL 归属和举报请求字段 | 通过 |
| 数据库契约 | 悄悄话来源、接收方隐藏、举报凭证字段及中文枚举注释 | 通过 |
| 文档契约 | 当前公开路由、字段和前端对接流程均有说明；已删除兼容字段不得重新出现 | 通过 |
| TIM 生命周期 | 发送后与已读回调按事件业务时间绑定当时会话；旧回调不得污染重新匹配后的新会话 | 通过 |
| TIM 定位 | 平台已读补偿和单条私信举报可用 `timMessageId/timMsgKey` 定位，跨会话或冲突定位拒绝 | 通过 |
| 数据库索引 | 会话用户对+生命周期时间索引、消息会话+TIM 消息 ID 索引在基础和增量脚本中幂等声明 | 通过 |
| 对接文档 | 补举报原因字典，修正本地 `localOutboxId` 边界，删除首页重复字段定义和废弃字段 | 通过 |
| 小程序前端 | 本轮只交付后端和对接文档 | 未编写、未修改 |

本轮最终聚焦回归覆盖 6 个关键测试类、50 条用例，全部通过；后端全量共 179 个测试报告、757 条用例。
`MessageMobileHandoffDocumentTest` 持续用于阻止代码接口与移动端对接文档再次漂移。

本轮没有重新执行腾讯云 TIM 双账号和真实 OSS 上传；相关能力使用 Mock/契约测试验证，仍属于上线前外部环境门禁。应用层 KMS 已于 2026-08-14 移除，不再需要联调。

## 1. 2026-08-11 历史验收基线

以下为上一轮已经完成的真实开发库、管理后台页面与高敏权限验收记录。本轮未重复执行这些外部环境流程，
保留作为既有验收证据；本轮代码结果以“2026-08-13 增量回归”为准。

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
| 应用层 KMS | 系统/助手消息、事件载荷及举报证据 | 已移除：由受控明文、权限和审计承接，不再需要生产 KMS 资源 |
| 小程序前端 | 腾讯云 TIM SDK 与页面改造 | 不在本轮范围，未编写或修改小程序前端代码 |

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
2. 部署前先执行 `074_prd03_remove_message_kms.sql`，并确认运行环境不再配置或依赖 `MESSAGE_TEXT_*` 参数。
3. 聊天正文留存周期、举报取证及注销清理仍需法务/隐私书面复核后开放生产流量。
4. 首版只支持文本与 Unicode Emoji；图片、视频、语音、文件和贴纸不在本轮验收范围。

## 6. 最终判定

- 后端代码、数据库迁移和真实接口：**通过**。
- 管理后台构建、真实数据展示和高敏交互：**通过**。
- 小程序前端：**未改动，符合交付边界**。
- 腾讯 TIM：**真实联调证据见本报告顶部 2026-08-13 增量报告，公网回调仍需随生产发布复验**；应用层 KMS：**已移除，不适用**。

## 7. 2026-08-13 管理后台异常修复回归

- 数据库：已执行 PRD-03 消息迁移与 `071_prd03_message_mobile_contract.sql`，悄悄话、举报、系统消息和官方助手详情依赖字段已补齐。
- 后端自动化：`AuthServiceImplTest`、`MessageConfigAdminServiceImplTest`、`MessageRecordAdminServiceImplTest`、消息管理契约及相关服务测试共 **32 条通过，0 失败**。
- 前端构建：React/TypeScript 生产构建通过，仅保留既有 chunk 体积提示。
- peter 真实接口：登录、消息列表、悄悄话列表、举报列表、三类消息详情、开关切换与恢复、配置保存、中文导出全部 HTTP 200。
- 页面交互：消息筛选改为 300ms 防抖自动查询；列表、详情与导出枚举中文化（含 `system_tip`、助手分类）；隐藏当前配置版本卡片，但保留版本并发控制。E2E 已覆盖私信、悄悄话高敏详情以及系统/官方助手明文详情。

本轮异常修复判定：**通过**。全局发送开关已在验证后恢复原状态；配置保存验证生成了一个内容相同的新版本，符合版本化发布设计。

## 8. 2026-08-13 系统消息与官方助手明文展示

- 系统消息和官方助手使用 `title_text/content_text` 直接存储明文；应用代码不再读取旧密文字段。
- 管理后台详情直接展示标题、正文，不展示 App 端 `actionText`（如“查看详情”）。
- 开发库已为前 3 个 App 用户各生成 2 条系统消息和 2 条官方助手消息，共 12 条明文演示记录。
- 后端相关测试 **28 条通过**；前端生产构建通过；管理后台 Playwright **3 条通过**。
- peter 真实接口查询 12 条演示记录，标题、正文正确且后台 `actionText=null`。

本轮判定：**通过**。私信、悄悄话与举报证据保留独立权限、二次确认和审计，存储方式已于 2026-08-14 改为受控明文。

## 9. 2026-08-13 peter 旧会话开关权限兼容

- 根因：旧登录会话已包含 `message:config:edit`，但 Redis 用户上下文没有后来新增的角色编码，服务端二次风控校验因此拒绝。
- 修复：仅当会话角色为空时，按当前管理员 ID 从数据库补查启用角色；仍只允许 `risk/risk_control/super_admin`，没有扩大普通配置编辑权限。
- 自动化：`MessageConfigAdminServiceImplTest` 与 `AuthServiceImplTest` 共 **10 条通过**。
- 真实验证：构造 `roles=null` 的 peter 旧会话，成功关闭全局发送后再次恢复为开启；最终开关状态保持开启。
