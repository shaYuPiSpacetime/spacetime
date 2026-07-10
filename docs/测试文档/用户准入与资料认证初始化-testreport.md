# 用户准入与资料认证初始化 - 测试报告

> 关联文档：
> - 测试用例：`docs/测试文档/用户准入与资料认证初始化-testcase.md`
> - 技术方案：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-tcdesign.md`
> - 移动端对接文档：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md`

## 1. 测试概况

| 项目 | 信息 |
|------|------|
| 功能名称 | 用户准入与资料认证初始化 |
| 测试环境 | `http://127.0.0.1:8080` |
| 执行日期 | `2026-07-09 21:44` |
| 执行人 | Codex |
| 后端版本 | 当前工作区变更，Java 21 |
| 测试策略 | L1 接口回归 + L3 Service 单元/全量 Maven 测试 |
| 测试模式 | 增量模式：统一审核表改造后重新回归 |

## 2. 测试结果汇总

| 层级 | 总数 | 通过 | 失败 | 跳过 | 通过率 |
|------|------|------|------|------|--------|
| L1 接口测试 | 96 | 96 | 0 | 0 | 100% |
| L2/L3 Maven 测试 | 152 | 151 | 0 | 1 | 99.3% |
| 合计 | 248 | 247 | 0 | 1 | 99.6% |

判定结果：通过。

判定依据：本轮没有失败用例；唯一跳过项是既有 `PromotionInviteSeedDataTest`，与本需求无关。

## 3. L1 接口测试

```text
执行命令: powershell.exe -NoProfile -ExecutionPolicy Bypass -File "docs/测试文档/用户准入与资料认证初始化-unified-audit-l1.ps1"
结果文件: docs/test-artifacts/prd01-unified-audit-l1-results.json
汇总: total=96 pass=96 fail=0 skip=0
```

| 覆盖范围 | 结果证据 |
|----------|----------|
| 后端启动 | `GET /health` 返回 `code=200`、`data=ok` |
| 后台登录 | `peter` 登录成功，获取 token，权限数 91 |
| 移动端登录与首登 | 手机号登录创建测试用户 `59`，首登 4 步和完成接口通过 |
| 实名认证 | 机审通过，后台实名列表可查 |
| 头像认证 | 上传头像生成待审核记录，同媒体 ID 认证后机审通过 |
| 学历认证 | 构造通过、驳回、失效、待审核多状态 |
| 资料图片 | 构造相册通过、待审核、驳回、失效；背景图通过 |
| 开放性文字 | `ABOUT_ME`、`HOPE_THEY_KNOW`、`PROFILE_QA` 通过；`CUSTOM_OPEN_TEXT` 拒绝 |
| 语音介绍 | 合法语音机审通过；非法时长返回错误 |
| 后台筛选 | 状态筛选、审核来源筛选、`REVIEWING` 记录筛选均通过 |
| 后台详情 | 实名、头像、学历、资料图片、开放文字详情均返回成功 |
| 移动端状态 | `/miniapp/verify/status`、`/miniapp/profile/access-status` 通过 |
| 用户管理 | App 用户列表和详情实时派生审核状态通过 |
| 数据库校验 | 新审核记录、审核历史、状态/来源分布、旧表不存在均通过 |

### 3.1 数据库状态覆盖

| 项 | 结果 |
|----|------|
| 测试用户 | `userId=59` |
| 手工种子审核中记录 | `auditRecordId=128` |
| 状态覆盖 | `PENDING=2`、`REVIEWING=1`、`APPROVED=8`、`REJECTED=3`、`EXPIRED=2` |
| 审核来源覆盖 | `MACHINE=7`、`MANUAL=9` |
| 审核历史覆盖 | 总数 `30`，机审 `21`，管理员操作 `9` |
| 旧表校验 | `app_user_verification`、`app_user_verification_record`、`app_user_profile_media`、`app_user_open_text_audit`、`app_user_voice_intro_record` 均不存在 |
| 旧字段校验 | `app_user.voice_intro_url`、`app_user.voice_intro_duration`、`app_user.voice_intro_audit_status`、`app_user.voice_intro_record_id`、`app_user.voice_intro_reject_reason`、`app_user.profile_bg_media_id`、`app_user_audit_record.object_id`、`app_user_audit_record.object_key`、`app_user_audit_record.current_effective`、`app_user_audit_record.education_level`、`app_user_audit_record.submit_payload_json`、`app_user_audit_record.masked_payload_json` 均不存在 |

## 4. L2/L3 Maven 测试

```text
执行命令: cd backend; mvn.cmd "test" "-Denforcer.skip=true"
JDK: C:\Users\50449\.jdks\ms-21.0.11
汇总: Tests run: 152, Failures: 0, Errors: 0, Skipped: 1
```

本轮新增 `AppUserAuditServiceTest`，覆盖：

| 测试点 | 结果 |
|--------|------|
| 提交审核默认状态与历史 | 通过 |
| 人工审核通过并切换当前有效记录 | 通过 |
| 系统失效写历史 | 通过 |
| 三重认证通过数实时派生 | 通过 |

## 5. 失败用例明细

无。

## 6. 跳过用例明细

| 用例 | 层级 | 场景 | 跳过原因 | 是否需要补测 |
|------|------|------|----------|--------------|
| `PromotionInviteSeedDataTest` | L3 | 推广邀请种子数据 | 既有测试跳过，非本模块 | 否 |

## 7. 本轮未纳入重新执行的证据

管理后台 1:1 页面截图矩阵、Demo vs 实现截图矩阵、前端构建在上一轮已产出。本次改造聚焦统一审核表、后端接口和真实数据库链路，没有重新跑前端截图矩阵；如继续进入前端验收，应按 `Codex需求到验收标准流程.md` 重新执行全量页面截图对齐。

## 8. 结论

统一审核表改造后的管理后台接口、移动端接口、审核状态机、审核历史、真实数据库写入、旧表删除和旧字段删除校验已通过本轮测试。当前后端服务已重启为最新代码，最终接口回归结果来自 PID 29592 的最新进程。
