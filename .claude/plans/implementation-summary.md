# Implementation Summary

Appended by the implementer after each work session.

---

## YYYY-MM-DD: [Feature / Fix Title]

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `path/to/file` | created / modified / deleted | What changed |

### Deviations from Plan
<!-- Any differences between the architect's plan and what was implemented -->

### Notes
<!-- Implementation decisions, caveats, follow-up items -->

---

## 2026-06-16: PRD-07 推广裂变正式口径续写

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `backend/src/main/java/com/spacetime/admin/service/PromotionSettlementAdminService.java` | modified | 移除后台结算页面创建结算单能力，只保留列表、确认、发放 |
| `backend/src/main/java/com/spacetime/admin/service/impl/PromotionSettlementAdminServiceImpl.java` | modified | 删除旧 create 实现；确认/发放后刷新代理统计快照 |
| `backend/src/main/java/com/spacetime/admin/dto/request/PromotionSettlementCreateReq.java` | deleted | 删除首版不再暴露的后台创建结算单请求 DTO |
| `backend/src/test/java/com/spacetime/admin/controller/PromotionSettlementControllerTest.java` | modified | 从 POST 创建用例改为 confirm/paid 状态流转用例 |
| `backend/src/test/java/com/spacetime/admin/service/PromotionSettlementAdminServiceImplTest.java` | modified | 结算状态改为 `unsettled -> confirmed -> paid`，补统计刷新断言 |
| `backend/src/test/java/com/spacetime/miniapp/controller/PromotionInviteControllerTest.java` | modified | 小程序接口测试改用精确 VO 与正式 `normal_user` 来源 |
| `backend/src/test/java/com/spacetime/miniapp/service/PromotionInviteSeedDataTest.java` | modified | 造数脚本改为正式来源枚举和 `unsettled` 结算状态 |
| `frontend/src/api/promotion.ts` | modified | 前端 API 切到正式 invite-relations/invite-rewards/materials 路径，移除结算创建 API |
| `frontend/src/pages/promotion/PromotionManagement.tsx` | modified | 来源、结算状态、操作按钮改为正式 PRD-07 口径 |
| `frontend/src/router/index.tsx` | modified | 新增正式推广路由，旧路由重定向到正式路径 |

### Deviations from Plan

- 前端仍暂用 `PromotionManagement.tsx` 单组件承载 5 个旧面板，未完成正式 9 页面拆分。
- 代理结算系统任务服务尚未补齐，本次先确保后台页面不再暴露手动创建入口。

### Notes

- 后端 `JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test -DskipTests` 通过。
- 前端 `npm run build` 通过。
- 完整 `mvn test` 被本机 Mockito inline ByteBuddy attach 限制阻断，所有 Mockito 测试在初始化 MockMaker 前失败，未进入业务断言。
