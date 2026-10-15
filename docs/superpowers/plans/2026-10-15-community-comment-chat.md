# 评论人工兜底与聊天复用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Parent integrates scoped commits; workers do not commit or modify Git state.

**Goal:** 检测不可用的评论可安全排人工审核，同会话只保留一个聊天页实例。

**Architecture:** 沿用CommunityAuditPolicy、评论实体和后台CAS审核链路；新增小型私聊导航模块，并保持聊天渲染和滚动逻辑不变。

**Tech Stack:** Java21/Spring Boot3.4/JUnit5，Taro/React18/TypeScript，Node test、Playwright。

## Global Constraints

- 只在master修改，保护已有124项其他未提交内容，不创建分支或PR。
- 待人工评论使用现有 `pending`；人工通过前不得公开、计数或发公开通知；违规REJECT不得自动公开。
- 人工通过保持历史 `machineResult/machineCode/machineDetail`，最终发布/审批状态使用 `status/auditStatus`。
- 同会话当前页不导航；栈内已有页返回复用；账号切换、来源页失效后的异步任务不得继续导航。
- 不修改消息收发、排序、未读和滚动算法；凭据不入文件或日志；使用隔离合成数据。

### Task 1: 评论状态与人工审核闭环

**Ownership:** backend相关Java、对应JUnit、`deploy/sql/prod/113_community_comment_manual_fallback.sql`；不得修改miniapp、frontend或其他文档。

**Files:** `common/community/CommunityAuditPolicy.java`，`miniapp/service/impl/CommunityServiceImpl.java`，`admin/service/impl/CommunityAdminServiceImpl.java`，对应三个Test、Callback回归；必要的新隔离链路Test。

**Interfaces:** 输入 `CommunitySecurityResult` 与机审开关；返回现有 `CommunityCommentResultVO`，待审 `status=pending`、审批PENDING、中文待审核回执。管理端旧审核入口调用现行CAS流程。

- [ ] 添加并运行红灯：关闭机审、UNAVAILABLE、null、REVIEW都落待审；PASS公开；REJECT保持拒绝；待审不会增加公开计数、通知或公开可见。
- [ ] 最小修改策略：`case REVIEW, UNAVAILABLE -> decision("pending", false, false, safeResult)`；关闭机审同样pending；Service按三态设置auditStatus，不把pending写REJECTED。
- [ ] 用合成数据覆盖提交pending→人工approve→公开查询，计数只加一次、历史机审不变、旧版本不能重放；修正旧审核接口的计数和CAS差异。
- [ ] 补配置：`community_comment_status.pending` 中文“待人工审核”；`community.copy.comment_pending` 为“评论已提交，等待人工审核”；迁移须可重复、保留其他配置。
- [ ] 运行聚焦JUnit，报告红绿命令、结果、变更文件和未验证项到 `.runtime/community-chat-20261015/backend-report.md`。

### Task 2: 同会话导航复用

**Ownership:** 主代理；`miniapp/src/utils/privateChatNavigation.ts`、匹配弹窗/主页/推荐/已匹配悄悄话入口、对应Node测试。仅需要时修改auth生命周期通知，不改聊天渲染。

**Interface:** `openPrivateChat(conversationNo: string): Promise<void>`；当前同会话零导航，最近已有同会话 `navigateBack({delta})`，否则 `navigateTo`。在途Promise必须在finally释放，失败可重试；调用方异步resolve前同步ref锁。

- [ ] 用真实导航模块Taro stub编写红灯：当前同会话、深栈复用、不同会话、并发双开、失败重试、账号切换。
- [ ] 匹配弹窗回归必须断言read一次、popup关闭、当前同会话三种导航均为0，不能只用空navigateTo stub。
- [ ] 实现统一模块，接入入口，补来源页活动性检查；保留现有匹配回执行为。
- [ ] 运行新测试及既有聊天缓存、移动端API闭环、匹配弹窗、悄悄话入口回归。

### Task 3: 联调、自检与交付

**Ownership:** 主代理；测试文档、PRD规则增量、管理端标签说明和L4测试；不修改现有用户业务数据。

- [ ] 待审评论小程序反馈验证：按后台响应显示待审，不显示成功公开，不追加公开评论，不增加数量。
- [ ] 用组件/浏览器合成响应和隔离Service数据复现，不伪造真实登录会话；有条件时用已配置测试地址正常登录构造L1数据，无条件明确跳过外部微信实测。
- [ ] 覆盖状态CAS、权限、人工通过后迟到媒体回调不覆盖，提交后返回再进入能看到最终状态。
- [ ] 独立审查本任务diff，修正重要问题；构建miniapp和受影响管理端，填写独立testreport。
- [ ] 同步远端，提交本任务文件并推送master，核对服务端/管理端自动部署；新独立发布目录preview/upload逐包大小与文件哈希一致。
