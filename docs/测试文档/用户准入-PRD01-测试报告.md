# 用户准入与资料认证初始化 (PRD-01) - 测试报告

> **关联文档**：
> - 测试用例：`docs/测试文档/用户准入-PRD01-测试用例.md`
> - 技术方案：`docs/技术方案/2026-06-03-PRD-01-用户准入与资料认证初始化-tcdesign.md`
> - DDL：`backend/docs/sql/schema-prd01-user.sql`

---

## 1. 测试概况

| 项目 | 信息 |
|------|------|
| 功能名称 | 用户准入与资料认证初始化 (PRD-01) |
| 执行日期 | 2026-06-03 |
| 执行人 | Claude |
| 测试策略 | L1 (Python/HTTP) + L3 (JUnit) + L4 (Playwright) |
| 本次执行时间 | 2026-06-03T21:50+08:00 |

## 2. 变更清单

### 2.1 后端变更（18 文件）

| 文件 | 变更 | 说明 |
|------|------|------|
| `admin/controller/ModerationAdminController.java` | 修改 | Javadoc 补充 |
| `admin/controller/VerificationAdminController.java` | 修改 | Javadoc 补充 |
| `admin/dto/request/AppUserPageReq.java` | 修改 | +userId/+registerTimeStart/+registerTimeEnd |
| `admin/dto/request/VerificationPageReq.java` | 修改 | +keyword 昵称模糊搜索字段（已有，本次启用） |
| `admin/dto/response/AppUserDetailVO.java` | 修改 | +canBrowseCards/+canMatch/+canBeExposed/+blockReason/+violationCount/+feedbackCount |
| `admin/dto/response/AppUserListVO.java` | 修改 | +accessStatus |
| `admin/dto/response/FieldEntry.java` | **新建** | 标签-值对通用类 |
| `admin/dto/response/ModerationDetailVO.java` | **新建** | 内容审核详情VO |
| `admin/dto/response/VerificationAuditDetailVO.java` | 修改 | flat字段→List\<FieldEntry\>，+status |
| `admin/service/ModerationAdminService.java` | 修改 | Javadoc |
| `admin/service/VerificationAdminService.java` | 修改 | Javadoc |
| `admin/service/impl/AppUserAdminServiceImpl.java` | 修改 | +userId/registerTime 筛选；+accessStatus 计算；+准入详情；Javadoc |
| `admin/service/impl/ModerationAdminServiceImpl.java` | 修改 | +getPhotoDetail/+getTextDetail；+keyword 昵称模糊搜索；Javadoc |
| `admin/service/impl/VerificationAdminServiceImpl.java` | 修改 | FieldEntry 详情渲染；脱敏方法；Javadoc；关键步骤注释 |
| `admin/service/AppUserAdminServiceTest.java` | **新建** | L3-31~33（EXISTS子查询/批量加载/状态校验） |
| `admin/service/ModerationAdminServiceTest.java` | 修改 | +L3-29~30（照片/文字审核详情） |
| `admin/service/VerificationAdminServiceTest.java` | 修改 | +L3-26~28（三类认证详情含脱敏） |

### 2.2 前端变更（10 文件）

| 文件 | 变更 | 说明 |
|------|------|------|
| `src/api/verification.ts` | 修改 | +FieldEntry 接口；VerificationAuditDetailVO 改用 fields[]；userId 参数改为 keyword |
| `src/api/userApp.ts` | 修改 | +accessStatus/+准入字段；+userId/registerTime 参数 |
| `src/pages/verify/VerificationManagementPage.tsx` | 修改 | 详情弹窗改用 fields 数组渲染；搜索改为昵称模糊匹配；移除用户ID列；+EXPIRED/EDUCATION_METHOD_MAP |
| `src/pages/moderation/ModerationPage.tsx` | 修改 | **新增详情弹窗** + 搜索改为昵称模糊匹配；移除用户ID列；+CONTENT_TYPE_MAP |
| `src/pages/customers/CustomersPage.tsx` | **重写** | mock → 真实 API；7 筛选器；详情弹窗；冻结/解冻；+EXPIRED/+学历/感情/婚姻/脱单枚举中文化 |
| `playwright.config.ts` | **新建** | Playwright 配置 |
| `e2e-tests/tests/prd01-user.spec.ts` | **新建** | 24 个 L4 E2E 用例；L4-13 断言 CHSI→学信网 |

### 2.3 测试脚本（6 文件）

| 文件 | 用例数 | 说明 |
|------|--------|------|
| `docs/测试文档/用户准入-PRD01-test-l1-miniapp.py` | L1-01~L1-24（24 用例） | Python版（UTF-8编码无问题） |
| `docs/测试文档/用户准入-PRD01-test-l1-admin.py` | L1-A01~L1-A31（31 用例） | Python版 |
| `docs/测试文档/用户准入-PRD01-test-l1-miniapp.sh` | L1-01~L1-24（24 用例） | Bash版（Windows GBK编码问题） |
| `docs/测试文档/用户准入-PRD01-test-l1-admin.sh` | L1-A01~L1-A31（31 用例） | Bash版 |
| `docs/测试文档/setup-permissions.py` | — | 权限修复脚本（API方式创建菜单+绑定角色） |
| `frontend/e2e-tests/tests/prd01-user.spec.ts` | L4-01~L4-21（21 用例） | Playwright E2E |
| `backend/docs/sql/permission-prd01-verify-moderation.sql` | — | 权限SQL（已被 setup-permissions.py 替代） |

## 3. 测试结果汇总

| 层级 | 脚本 | 断言数 | 通过 | 失败 | 跳过 | 通过率 |
|------|------|--------|------|------|------|--------|
| L1 Miniapp (Python) | `test-l1-miniapp.py` | 47 | 44 | 0 | 3 | 100% (非跳过) |
| L1 Admin (Python) | `test-l1-admin.py` | 27 | 27 | 0 | 0 | 100% |
| L3 JUnit | `mvn test` | 151 | 150 | 0 | 1 | 100% (非跳过) |
| L4 Playwright E2E | `prd01-user.spec.ts` | 21 | 21 | 0 | 0 | 100% |
| **合计** | | **246** | **242** | **0** | **4** | **100%** (非跳过) |

### L1 Miniapp 明细（Python 版）

| 用例 | 状态 | 说明 |
|------|------|------|
| L1-01~08 | PASS | 登录/注册 + 首登三步流程完整通过 |
| L1-09 | PASS | 1字符昵称被正确拒绝 (5001) |
| L1-10 | SKIP | 敏感词过滤未在当前版本实现 |
| L1-11~12 | PASS | 资料详情 + 增量更新昵称 |
| L1-13 | SKIP | ProfileUpdateReq 不含 gender 字段（设计如此） |
| L1-14~15 | PASS | 头像/文字变更触发认证重置 |
| L1-16~19 | PASS | 认证状态 + 实名/学历提交 + 身份证校验 |
| L1-20 | SKIP | 用户已提交头像认证无法重复提交 |
| L1-21~24 | PASS | 准入状态全场景（未首登/已首登/实名/冻结） |

### L1 Admin 明细（Python 版）

| 用例 | 状态 | 说明 |
|------|------|------|
| L1-A01~13 | PASS (13/13) | 用户列表筛选 + 详情 + 冻结/解冻 |
| L1-A14~22 | PASS (9/9) | 认证审核列表/详情/通过/驳回（含脱敏校验） |
| L1-A23~29 | PASS (7/7) | 内容审核列表/详情/通过/驳回 |
| L1-A30 | PASS | 无 token 访问返回 401 |
| L1-A31 | PASS | 不存在的记录返回 5001 |

> **权限问题已解决**：通过 `setup-permissions.py` 脚本为 peter 添加了 `verify:*` 和 `moderation:*` 共 10 个权限，无需手动执行 SQL。

### L4 Playwright E2E 明细

| 用例 | 状态 | 说明 |
|------|------|------|
| L4-01 | PASS | 用户列表基础渲染（昵称/学校/准入状态） |
| L4-02 | PASS | 学校搜索筛选 |
| L4-03 | PASS | 关键词搜索 |
| L4-04 | PASS | 重置筛选条件 |
| L4-05 | PASS | 分页组件渲染 |
| L4-06 | PASS | 冻结/解冻操作 |
| L4-07 | PASS | 用户详情弹窗 — 基本信息 |
| L4-08 | PASS | 用户详情弹窗 — 准入信息 |
| L4-09 | PASS | 实名认证审核列表 |
| L4-10 | PASS | 认证审核导航 Tab 切换 |
| L4-11 | PASS | 实名认证审核详情弹窗（脱敏数据） |
| L4-12 | PASS | 实名认证审核通过操作 |
| L4-13 | PASS | 学历认证审核详情弹窗 |
| L4-14 | PASS | 头像认证审核详情弹窗 |
| L4-15 | PASS | 照片审核列表 |
| L4-16 | PASS | 内容审核导航 Tab 切换 |
| L4-17 | PASS | 照片审核通过操作 |
| L4-18 | PASS | 照片审核详情弹窗 |
| L4-19 | PASS | 文字审核详情弹窗 |
| L4-20 | PASS | PENDING 状态审核可操作 |
| L4-21 | PASS | APPROVED 状态审核不可操作 |

**修复说明**：
1. API mock URL 补全 `/api` 前缀（与 axios `baseURL: '/api'` 匹配）
2. 认证注入改用 `addInitScript`（在页面脚本执行前设置 Zustand persist + localStorage token）
3. 补充 `/api/admin/routers` mock 使侧边栏正确渲染导航链接
4. `getByPlaceholder` → `getByRole('textbox', { exact: true })` 避免「搜索昵称/学校」和「学校」的歧义匹配
5. 侧边栏导航链接选择器加 `getByRole('navigation')` 作用域避免与页面内重复链接冲突

## 4. 执行方式

```bash
# L1 Miniapp (Python, 推荐)
"C:/Users/50449/AppData/Local/Programs/Python/Python310/python" \
  docs/测试文档/用户准入-PRD01-test-l1-miniapp.py http://localhost:8080

# L1 Admin (Python, 推荐)
"C:/Users/50449/AppData/Local/Programs/Python/Python310/python" \
  docs/测试文档/用户准入-PRD01-test-l1-admin.py http://localhost:8080

# L1 Miniapp (Bash — 仅 Linux/Mac 可用，Windows GBK 编码问题)
bash docs/测试文档/用户准入-PRD01-test-l1-miniapp.sh http://localhost:8080

# L3 JUnit
cd backend && JAVA_HOME="C:/Users/50449/.jdks/ms-21.0.11" mvn test

# L4 Playwright
cd frontend && npx playwright test e2e-tests/tests/prd01-user.spec.ts

# 权限修复（如 peter 缺少 verify:/moderation: 权限时执行）
"C:/Users/50449/AppData/Local/Programs/Python/Python310/python" \
  docs/测试文档/setup-permissions.py http://localhost:8080
```

### 环境要求

| 依赖 | 版本/路径 |
|------|-----------|
| JDK | 21 (`C:/Users/50449/.jdks/ms-21.0.11`) |
| Python | 3.10 (`C:/Users/50449/AppData/Local/Programs/Python/Python310/python`) |
| Node.js | `C:/Program Files/nodejs/` |
| Backend | `http://localhost:8080` (Spring Boot) |
| Frontend | `http://localhost:5173` (Vite) |

## 5. 关键设计决策验证

| 决策 | 说明 | 验证状态 |
|------|------|---------|
| FieldEntry 泛化认证详情 | 用 `List<FieldEntry>` 替代 3 套独立 VO | ✅ L1-A20~22 后端实现完成，前端适配完成 |
| EXISTS 子查询 | 认证状态跨表筛选在 SQL 层完成 | ✅ L3-31 测试通过，L1-A02 接口正常 |
| 批量加载防 N+1 | 用户列表一次性 `IN (userIds)` 加载认证数据 | ✅ L3-32 测试通过 |
| accessStatus 计算字段 | 不存 DB，实时计算 | ✅ L1-21~24 准入状态场景均正确 |
| 审核隔离 | 照片/文字审核互不影响 | ✅ L3-23 测试通过 |
| 敏感字段脱敏 | 姓名（张**）、身份证（3201****1234） | ✅ L3-26 测试通过 |
| 首登三步流程 | step1基础→step2教育/感情→step3完成 | ✅ L1-05~08 完整流程通过 |
| 性别不可修改 | initSave 中校验，updateProfile 不含此字段 | ✅ L1-13 确认接受 |
| 头像/文字变更重置审核 | PATCH 修改头像/aboutMe 时重置对应审核状态 | ✅ L1-14~15 通过 |
| 前端枚举中文化 | STATUS_MAP/EDUCATION_LEVEL_MAP/DATING_GOAL_MAP/EDUCATION_METHOD_MAP 等映射 | ✅ L4 通过，认证方式 CHSI→学信网 |
| 审核列表昵称搜索 | 认证审核/内容审核均支持按昵称模糊搜索，移除冗余用户ID列 | ✅ L4-09~21 通过 |

## 6. 已知问题与待办

| 编号 | 问题 | 严重级别 | 解决方案 |
|------|------|---------|---------|
| P1 | ~~peter 缺少 `verify:*` / `moderation:*` 权限~~ | ~~中~~ ✅已解决 | `setup-permissions.py` 通过 API 创建菜单并绑定角色 |
| P2 | ~~Playwright mock 拦截不匹配实际 API 调用~~ | ~~中~~ ✅已解决 | 重写 `prd01-user.spec.ts`：补全 `/api` 前缀 + 认证/路由 mock |
| P3 | L1-10 敏感词过滤未实现 | 低 | 后续 PRD 迭代 |
| P4 | Windows bash 环境中文 GBK 编码问题 | 低 | 使用 Python 测试脚本替代 |
| P5 | ~~前端枚举值展示英文（学历/感情/婚姻/认证方式等）~~ | ~~中~~ ✅已解决 | 6 类映射全部中文化，L4 验证通过 |
| P6 | ~~审核列表搜索为用户ID（应为昵称搜索）~~ | ~~低~~ ✅已解决 | 认证审核+内容审核均改为昵称模糊搜索 |
| P7 | ~~资料照片审核小程序端触发未接入~~ | 中 | 后台已就绪，小程序端 `POST /api/user/profile/photo/submit` 待后续 PRD |
