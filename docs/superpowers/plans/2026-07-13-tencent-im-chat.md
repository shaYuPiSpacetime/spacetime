# 腾讯云 IM 聊天接入实施计划

> **For agentic workers:** 本计划用于后续按任务执行。实现阶段必须先补充测试，再编写实现代码，并在每个任务结束后执行对应验证。

**目标：** 在不破坏现有 Taro 页面和项目业务规则的前提下，接入腾讯云 IM，实现真实私信、悄悄话和消息后台承接。

**架构：** 使用腾讯云 IM SDK V4 `@tencentcloud/lite-chat` 标准版作为实时消息和历史漫游基础设施；本项目后端作为业务规则、鉴权、扣费、回调、Outbox、审计和后台查询的权威层。普通文本由 LiteChat 直发并经消息前回调裁决；悄悄话和官方消息由后端 REST API 发送。页面和交互由现有 Taro 组件自绘，不接入 TUIKit。

**技术栈：** Taro 4.1.9、React 18、TypeScript、`@tencentcloud/lite-chat@4.4.1`、Spring Boot 3.4、Java 21、MyBatis-Plus、MySQL、Redis。

## 全局约束

- `SecretKey` 只能存在后端私有环境变量，不能进入小程序、源码、文档或日志。
- 普通私信最终权限必须由后端 IM 消息前回调裁决，不能只依赖前端按钮禁用。
- 普通文本只调用 LiteChat `sendMessage`，不新增 `/miniapp/message/send-text` 形成双发送链路。
- 悄悄话扣费、发送、回复和补偿必须幂等。
- LiteChat 使用标准版默认入口；基础版缺少历史、会话和已读，专业版的社交关系能力不在本期使用。
- SDK 使用精确版本和锁文件，不使用 `latest` 或范围版本。
- `admin/` 与 `miniapp/` 不互相 import，共享 IM 能力放入 `common/`。
- 页面交互控件必须是真实 Taro 组件，不能使用整页截图、透明热区或不可见覆盖层。
- Taro 兼容性必须先通过微信开发者工具和真机 POC，再进入完整实现。

## 文件结构与职责

- 创建 `miniapp/src/im/liteChatClient.ts`：LiteChat 单例、初始化、登录、登出和 SDK 方法封装。
- 创建 `miniapp/src/im/liteChatEvents.ts`：统一事件订阅和解除。
- 创建 `miniapp/src/im/messageCodec.ts`：版本化 `cloudCustomData` 编解码和校验。
- 创建 `miniapp/src/stores/imStore.ts`：IM 生命周期、网络、会话和未读状态。
- 创建 `miniapp/src/services/imCredential.ts`：IM 凭证接口封装。
- 创建 `miniapp/src/services/message.ts`：消息业务接口封装。
- 创建 `miniapp/src/hooks/useImBootstrap.ts`：小程序登录态和 SDK 生命周期。
- 创建 `miniapp/src/types/message.ts`：会话、消息、悄悄话和通知类型。
- 修改 `miniapp/package.json`：加入经过 POC 验证的 IM SDK 版本。
- 创建 `backend/src/main/java/com/spacetime/common/service/ImAccountService.java` 及实现：IM 账号绑定和 UserSig 签发。
- 创建 `backend/src/main/java/com/spacetime/common/provider/ImProvider.java` 及实现：隔离腾讯云 REST API 和签名细节。
- 创建 `backend/src/main/java/com/spacetime/miniapp/controller/ImCredentialController.java`：向已登录用户提供短期 UserSig。
- 创建 `backend/src/main/java/com/spacetime/common/controller/TencentImCallbackController.java`：接收并校验 IM 回调。
- 创建 `backend/src/main/java/com/spacetime/common/entity/AppUserImAccount.java`、`AppImConversation.java`、`AppImMessage.java`、`AppImWhisper.java`、`AppImNotification.java`、`AppImOutbox.java`、`AppImCallbackLog.java`：本地业务数据。
- 修改 `miniapp/src/pages/chat/index.tsx`：从静态消息切换为真实会话聚合结果。
- 创建 `miniapp/src/pages/message-chat/index.tsx`：私信对话页和自绘聊天 UI。
- 修改或创建 `frontend/src/api/message.ts`、后台消息互动页面和路由：承接后台查询和处理。
- 创建数据库迁移脚本：表结构、唯一索引、幂等索引和审计字段。

### 任务 1：完成 Taro IM SDK POC

**目标：** 固定 `@tencentcloud/lite-chat@4.4.1`，验证当前 Taro 4.1.9 能否稳定完成 IM 初始化、登录、两账号收发、历史、会话、未读/已读和断线重连。

- [ ] 精确安装 `@tencentcloud/lite-chat@4.4.1` 标准版，提交 `package-lock.json`，记录微信开发者工具版本、基础库版本和构建结果。
- [ ] 验证默认入口 `import TencentCloudChat from '@tencentcloud/lite-chat'`，不引入 TUIKit、basic 或 professional 入口。
- [ ] 使用后端临时 UserSig 接口，不在前端写 SecretKey。
- [ ] 验证官方要求的 socket/request/upload/download 合法域名、SDK_READY、SDK_NOT_READY、KICKED_OUT、网络变化和 UserSig 过期事件。
- [ ] 验证 iOS、Android 真机双向收发、历史分页、会话更新、未读、已读、前后台和断网重连。
- [ ] 记录微信开发者工具的主包/总包体积增量和重复依赖，作为进入完整开发的门禁。
- [ ] POC 不通过时停止扩大代码改动，评估原生小程序聊天子包或其他兼容集成路径。

验收：真机上两个测试账号可以收发文本并拉取历史消息；构建产物不包含 SecretKey。

### 任务 2：落地 IM 账号与 UserSig

**后端接口：** `GET /miniapp/im/credentials`

- [ ] 编写 `ImCredentialControllerTest`，覆盖未登录、冻结用户、正常用户和 UserSig 过期时间。
- [ ] 实现 `AppUserImAccount` 绑定本项目用户与稳定 `imUserId`。
- [ ] 实现 `ImProvider.generateUserSig`，SecretKey 从配置属性读取。
- [ ] 返回 `{imUserId, userSig, expireAt, sdkAppId}`，不返回 SecretKey。
- [ ] 小程序在登录成功后初始化 SDK 并处理 SDK_READY、KICKED_OUT 和过期重登。

验收：后端单测通过；小程序能用本项目登录态重新获取 UserSig；重复请求不创建重复 IM 账号。

### 任务 3：落地会话、消息副本和回调

**回调接口：** `POST /internal/tencent-im/callback/{callbackPathToken}`，按 `CallbackCommand` 白名单分发。

- [ ] 编写回调控制器测试，覆盖错误 token、错误 SDKAppID、未知命令、未知 IM UserID、非法协议、允许发送、拒绝发送和重复回调。
- [ ] 创建会话、消息、通知、Outbox、回调日志和审计表，增加 `(sdk_app_id, msg_key)` 等唯一索引。
- [ ] 定义 `cloudCustomData` V1 协议：`v`、`bizType`、`conversationNo`、`bizId`、`clientMsgId`、`traceId`。
- [ ] 消息前回调使用 Redis 权限快照和有超时上限的本地查询校验账号、认证、匹配、女性保护、拉黑和封禁；权限数据不可用时失败关闭。
- [ ] 消息后回调以 MsgKey 为主键、MsgId 为辅助索引幂等落库并更新未读摘要。
- [ ] 回调只执行快速校验和入队，耗时通知和统计异步处理。

验收：直接调用 SDK 不能绕过业务限制；同一消息回调重复到达只产生一条本地消息记录。

### 任务 4：替换消息列表静态数据

**小程序接口：**

- `GET /miniapp/message/conversations`
- `GET /miniapp/message/unread-summary`

- [ ] 编写消息列表服务测试，覆盖已认证、未认证、无会话、官方消息置顶和未读汇总。
- [ ] 实现 `message.ts` API 封装和 `message.ts` 类型定义。
- [ ] 将 `miniapp/src/pages/chat/index.tsx` 的硬编码 rows 替换为接口聚合数据。
- [ ] 保持现有蓝湖页面布局，增加加载、空态、失败重试和消息服务降级态。

验收：未认证用户不展示用户私信；已认证用户能看到真实 IM 会话摘要和未读数。

### 任务 5：实现自绘私信对话页

**小程序页面：** `miniapp/src/pages/message-chat/index.tsx`

- [ ] 编写消息状态转换测试，覆盖发送中、已发送、失败、重试、已读、女性保护和会话失效。
- [ ] 使用 Taro `View`、`Text`、`ScrollView`、`Input` 等真实组件绘制聊天页面。
- [ ] 使用 IM SDK 拉取历史消息并监听新消息事件。
- [ ] 进入会话调用已读回执，退出页面解除监听，避免重复订阅。
- [ ] 进入页面查询 `/miniapp/message/conversations/{conversationNo}/state` 改善提示；普通文本只调用一次 LiteChat `sendMessage`，最终由消息前回调拦截。

验收：弱网、重复点击发送、进入/退出会话和新消息到达时页面状态正确；控件均为可见真实组件。

### 任务 6：实现悄悄话状态机和扣费闭环

**后端接口：**

- `POST /miniapp/message/whispers`
- `POST /miniapp/message/whispers/{whisperId}/reply`
- `POST /miniapp/message/whispers/{whisperId}/ignore`

- [ ] 编写服务测试，覆盖会员免费次数、千寻币扣费、余额不足、重复发送、回复匹配、暂不回应、过期和失败补偿。
- [ ] 实现 `Idempotency-Key` 贯穿资格校验、支付、Outbox、IM REST API 发送和补偿。
- [ ] 实现 `PENDING -> SENDING -> SENT/FAILED -> COMPENSATING -> COMPENSATED` 状态机和退避重试。
- [ ] 使用 V1 协议的 `bizType=whisper`、`bizId=whisperId` 和 `conversationNo`。
- [ ] 小程序自绘悄悄话卡片和回复/暂不回应操作区。

验收：扣费和消息创建不会出现一成功一失败的不可追溯状态；回复只会触发一次匹配成功。

### 任务 7：实现官方消息、通知和后台承接

- [ ] 后端实现官方助手消息、站内通知和消息模板接口。
- [ ] 后台新增消息互动 Tab、消息通知记录、聊天举报字段和规则配置。
- [ ] 按角色限制消息摘要和原文查看，原文查看写入审计日志。
- [ ] 实现封禁、禁言、拉黑后会话失效和通知联动。

验收：后台可以按用户、会话、消息类型和时间查询；处理聊天举报能追溯会话和消息 ID。

### 任务 8：执行验证

- [ ] 后端：使用项目指定 JDK 执行 `cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test`。
- [ ] 前端：执行 `cd frontend && npm run build`。
- [ ] 小程序：执行 `cd miniapp && npm run build:weapp`，再用微信开发者工具和真机验证。
- [ ] 添加 IM 聊天测试用例文档和测试报告，L1/L4 缺少真实 SDKAppID、账号或环境时明确跳过，不伪造数据。
- [ ] 使用密钥扫描确认仓库和构建产物没有 SecretKey。
- [ ] 验证回调 P95/P99、重复回调、Outbox 积压、对账差异和消息副本同步延迟监控。
- [ ] 灰度验证功能开关和回滚：关闭发送入口后仍继续消费已产生的回调和 Outbox。

完成标准：普通私信、悄悄话、官方消息、未读/已读、权限拦截、举报审计和自绘 UI 全部有可验证证据。
