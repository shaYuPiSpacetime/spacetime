# App 用户完整物理删除 - 测试用例

> **关联文档**：
>
> - 设计说明：`docs/superpowers/specs/2026-09-30-app-user-complete-hard-delete-design.md`
> - 测试报告：`docs/测试文档/App用户完整物理删除-testreport.md`
> **创建日期**：2026-09-30
> **测试模式**：完整模式
> **目标项目**：后端 `backend/`、生产迁移 `deploy/sql/prod/`

---

## 1. 测试策略决策

### 后端评估

| 维度 | 评估结果 | 得分 |
| --- | --- | ---: |
| A 新增/修改接口数 | 复用现有删除与详情接口 | 0 |
| B 状态流转逻辑 | 无新增状态机 | 0 |
| C 纯计算/规则逻辑 | 增加多类间接残留判定 | 1 |
| D 数据关联复杂度 | 跨消息、会话、TIM、举报证据等 4 张以上表 | 2 |
| E 老代码影响范围 | 不修改现有 Service 契约 | 0 |
| F 安全变更 | 不移除权限，继续使用 `user:app:delete` | 0 |
| **总分** |  | **3 → L1 + L2** |

迁移本身另加 JUnit 数据库契约测试，并复用现有 Service 单元测试验证事务内调用顺序和失败短路。

### 前端评估

本次没有前端代码变更，不生成 L4 或前端手动用例。

**最终策略：L1 + L2 + 数据库迁移契约 JUnit + Service 回归**

## 2. 测试数据准备

| 数据需求 | 用途 | 如何准备 | 是否幂等 |
| --- | --- | --- | --- |
| 隔离测试用户 | 验证完整物理删除 | 在目标环境创建专用测试账号，并为其准备消息、会话、悄悄话、通知、TIM 账号和举报证据 | 否，删除后不可重跑 |
| 目标用户 ID 与昵称 | 删除前防误删核验 | 通过 `GET /admin/users/app/{id}` 自动读取，并与显式传入的期望昵称比对 | 是 |
| 管理员 Token | 权限与删除接口调用 | 使用具备 `user:app:detail`、`user:app:delete` 权限的有效 Token | 是 |

生产目标 `U821（小乔公主）` 只能在详情接口返回 `id=821`、`nickname=小乔公主` 后执行。禁止按昵称或手机号查询后直接删除。

## 3. L1 - 接口测试用例

| 用例 ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1-P0-01 | P0 | 删除前身份核验 | `GET /admin/users/app/{id}` | 有效管理员 Token | 显式 `TARGET_USER_ID`、`EXPECTED_NICKNAME` | `code=200`，ID 与昵称完全匹配 | 响应断言 |
| F1-P0-02 | P0 | 完整物理删除 | `DELETE /admin/users/app/{id}` | F1-P0-01 通过且显式开启破坏性测试 | 链式使用已核验 ID | `code=200` | 链式后续 |
| F1-P0-03 | P0 | 删除后主用户不可查询 | `GET /admin/users/app/{id}` | F1-P0-02 通过 | 链式使用已删除 ID | `code=5001` 且 `msg=用户不存在` | 重新查询验证状态 |
| G-P3-01 | P3 | 未登录禁止彻底删除 | `DELETE /admin/users/app/{id}` | 无 Token | 固定无效 ID | HTTP 401 | 响应断言 |

派生脚本：`docs/测试文档/App用户完整物理删除-test-l1.sh`。脚本要求同时设置目标 ID、期望昵称和显式破坏性开关；缺一项只做安全检查或跳过删除。

## 4. L2 - Controller 测试用例

| 用例 ID | 测试方法 | 验证点 | 期望 |
| --- | --- | --- | --- |
| L2-01 | `hardDeleteEndpointShouldUseDedicatedPermission` | DELETE 路由和独立高风险权限 | 路由为 `/admin/users/app/{id}`，权限为 `user:app:delete` |

派生/复用：`backend/src/test/java/com/spacetime/admin/controller/AppUserControllerTest.java`。

## 5. L3 / 数据库契约与 Service 单元测试

| 用例 ID | 测试方法 | 输入 | 期望输出 |
| --- | --- | --- | --- |
| HD-DB-001 | `shouldCoverMessageAndImData` | 迁移 106 | 覆盖旧悄悄话、消息、会话、通知、Inbox、Outbox、TIM 账号和举报证据 |
| HD-DB-002 | `shouldFreezeSharedMessageScopesBeforeDeleting` | 迁移 106 | 删除前固化双方共享会话、消息和悄悄话范围 |
| HD-DB-003 | `shouldDeleteUserReportsAndFrozenEvidence` | 迁移 106 | 用户相关举报案件及冻结证据纳入删除范围 |
| HD-DB-004 | `shouldRollbackWhenMessageResidueRemains` | 迁移 106 | 直接与间接消息残留均触发 `SIGNAL`，由 Spring 事务回滚 |
| HD-SVC-001 | `shouldRejectBlankHardDeleteReason` | 空白删除原因 | 抛出业务异常，不调用清理、会话撤销和审计 |
| HD-SVC-002 | `shouldStopWhenHardDeleteCleanupFails` | 数据库清理异常 | 不撤销登录态，不写删除成功审计 |
| HD-SVC-003 | `shouldRollbackWhenSessionRevocationFails` | 登录态清理异常 | 不写删除成功审计，数据库事务回滚 |

迁移契约：`backend/src/test/java/com/spacetime/common/database/AppUserCompleteHardDeleteMigrationTest.java`。
Service 回归：`backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java`。

## 6. L4 - E2E 浏览器测试用例

不适用：本次无前端变更，且删除属于不可逆高风险操作，不通过自动化浏览器批量执行。

## 7. 前端手动测试用例

不适用。

## 8. 补充用例（来自静态安全复核）

| 用例 ID | 来源 | 审查级别 | 场景 | 期望结果 |
| --- | --- | --- | --- | --- |
| HD-DB-005 | 删除范围静态复核 | Critical | Outbox 仅有聚合 ID、Inbox 仅有业务号时仍存在间接关联 | 残留计数覆盖聚合 ID 和业务号并阻止删主表 |
| HD-DB-006 | 删除范围静态复核 | Critical | 举报证据仅通过案件、消息业务号或会话号关联目标用户 | 证据删除与残留计数均覆盖这些间接关系 |
