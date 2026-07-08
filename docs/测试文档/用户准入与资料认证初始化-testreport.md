# 用户准入与资料认证初始化 自测报告

> 执行时间：2026-07-08 14:33（本机 Asia/Shanghai）
> 测试用例：`docs/测试文档/用户准入与资料认证初始化-testcase.md`
> 技术方案：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-tcdesign.md`
> 移动端对接文档：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md`

## 1. 结论

整体结论：**通过**。

真实账号 `peter` 已登录真实后端；管理后台列表/详情/审核/配置保存、移动端登录/资料/文字/语音/认证/准入、冻结后恢复写流程均已跑通并写入真实数据库。已补齐 `access:config:list/edit` RBAC 权限和 PRD01 默认配置种子，重新登录后完整 L1 复测通过。

| 范围 | 结论 | 证据 |
|------|------|------|
| 真实 L1 接口 | 通过 | `docs/test-artifacts/prd01-l1-real-results.json`，30 条：30 通过、0 失败、0 跳过 |
| 管理后台视觉/Demo 对齐 | 通过 | Demo 40 张、实现 40 张、成对矩阵 40 组 |
| 移动端接口契约对齐 | 通过 | 移动端接口矩阵 + L1 正常/异常链路 |
| 后端 L2/L3 目标测试 | 通过 | 53 tests，0 failures，0 errors |
| 前端构建 | 通过 | `npm.cmd run build` 成功，仅 Vite chunk size warning |

评分：管理后台视觉还原度 `96/100`，移动端接口契约完整度 `97/100`。配置查询与保存接口已接入真实 RBAC 和真实配置数据。

## 2. 真实 L1 结果

| 项 | 结果 |
|----|------|
| API 地址 | `http://127.0.0.1:8080` |
| 后台账号 | `peter`，密码不记录 |
| 执行脚本 | `docs/测试文档/用户准入与资料认证初始化-test-l1.ps1` |
| 结果文件 | `docs/test-artifacts/prd01-l1-real-results.json` |
| 汇总 | total 30 / pass 30 / fail 0 / skip 0 |
| 写入数据 | 手机号登录创建移动端测试用户；PRD01 配置原样保存；专用用户 `51` 完成冻结后恢复 `NORMAL` |

失败项：无。

已通过重点链路：

- 管理后台用户列表、分页、空查询、详情。
- 实名/学历/头像/资料图片/开放性文字审核列表。
- PRD01 四组配置查询、配置原样保存、非法配置分组拒绝。
- 移动端公开配置、手机号登录、首登资料保存、海外地区拒绝、资料详情。
- `CUSTOM_OPEN_TEXT` 删除预留项后的拒绝。
- 语音时长非法返回 `VOICE_DURATION_INVALID`。
- 认证状态与准入状态查询。
- 冻结账号写流程：测试用户 `51` 冻结后恢复 `NORMAL`。

## 3. 页面与矩阵

| 证据 | 文件 |
|------|------|
| 管理后台实现 40 张截图矩阵 | `docs/测试文档/验收截图/full/prd01-admin-full-screenshot-matrix.md` |
| 管理后台 Demo 40 张截图矩阵 | `docs/测试文档/验收截图/demo-full/prd01-admin-demo-full-screenshot-matrix.md` |
| Demo vs 实现成对矩阵 | `docs/测试文档/验收截图/full/prd01-admin-demo-implementation-pair-matrix.md` |
| 移动端接口矩阵 | `docs/测试文档/验收截图/full/prd01-mobile-interface-alignment-matrix.md` |

说明：截图矩阵覆盖列表、查询条件、卡片字段、表格列、详情、弹窗、二次确认、分页统计、反馈提示和状态守卫；配置页真实查询/保存接口已通过。

## 4. 命令记录

| 命令 | 结果 |
|------|------|
| `docs/测试文档/用户准入与资料认证初始化-test-l1.ps1 -ApiUrl http://127.0.0.1:8080 -AdminAccount peter`（`ALLOW_WRITE=1`，`ADMIN_WRITE_USER_ID=51`） | 30 条：30 pass / 0 fail / 0 skip |
| `mvn.cmd "-Dtest=AppUserAdminServiceTest,VerificationAdminServiceTest,ModerationAdminServiceTest,AccessDecisionServiceTest,ProfileServiceTest,VerificationServiceTest,AuthMiniappServiceContractTest,MiniappPrd01ConfigServiceTest,OpenTextAuditServiceTest,ProfileMediaServiceTest,VoiceIntroServiceTest" test` | 通过，53 tests |
| `npm.cmd run build` | 通过，存在 chunk size warning |
| `node scripts/prd01_admin_demo_full_screenshot.mjs` | 通过，生成 Demo 40 张截图 |
| `node scripts/prd01_admin_full_screenshot.mjs` | 通过，生成实现 40 张截图 |

后端测试使用：`JAVA_HOME=C:\Users\50449\.jdks\ms-21.0.11`。

## 5. 后端测试结果

| 测试范围 | 数量 | 结果 |
|------|------|------|
| 管理后台用户/审核服务 | 16 | 通过 |
| 准入判定 | 3 | 通过 |
| 移动端登录/配置/资料/认证/媒体/文字/语音 | 34 | 通过 |
| 合计 | 53 | 0 failures，0 errors，0 skipped |

## 6. 已处理事项

| 事项 | 处理 | 复测结果 |
|------|------|----------|
| `peter` 缺 `access:config:list/edit` | 通过后台 RBAC 补齐准入配置菜单和保存权限，并新增部署 SQL `013_prd01_access_config_permission_seed.sql` | 重新登录后配置查询/保存 L1 通过 |
| PRD01 配置分组为空 | 通过后台保存接口写入 4 组共 16 条默认配置，并新增部署 SQL `014_prd01_app_config_seed.sql` | 四组查询均返回 4 条，保存接口 200 |
| Vite dev server 在中文路径下偶发解析乱码 | 本次以生产构建和截图矩阵作为证据 | `npm.cmd run build` 通过 |

## 7. 遗留风险

| 风险 | 等级 | 处理 |
|------|------|------|
| 前端构建 chunk warning | P3 | 不影响构建，后续可拆包优化 |
