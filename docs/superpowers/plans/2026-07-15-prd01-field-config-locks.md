# PRD01 字段配置锁定 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在“后台管理 → 用户准入 → 字段配置”中落实字段展示、必填属性的固定矩阵，并由后端拒绝绕过前端的非法保存请求。

**Architecture:** 前端继续以 `FIELD_CONFIG_ROWS` 作为页面字段元数据，通过 `displayMode`、`requiredMode` 分别控制开关是否可编辑；历史保存值只合并可配置属性。后端在 `AppConfigAdminServiceImpl` 保存 `prd01.profile.fieldSettings` 前解析 JSON，针对固定展示、固定必填和条件必填字段执行白名单校验，不影响其他配置组及小程序消费逻辑。

**Tech Stack:** React 18、TypeScript、Tailwind、Spring Boot 3.4、Jackson、JUnit 5、Mockito、AssertJ

---

### Task 1: 后端字段固定矩阵校验

**Files:**
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/AppConfigAdminServiceImpl.java`
- Create: `backend/src/test/java/com/spacetime/admin/service/impl/AppConfigAdminServiceImplTest.java`

- [x] **Step 1: 编写失败测试**

覆盖三类请求：固定展示字段提交 `visible=false` 被拒绝；固定必填字段提交 `required=false` 被拒绝；身高固定展示但 `required=false` 可保存。

- [x] **Step 2: 运行测试并确认失败**

Run: `cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn -Dtest=AppConfigAdminServiceImplTest test`

Expected: 新增非法配置用例失败，因为服务尚未校验固定矩阵。

- [x] **Step 3: 实现最小后端校验**

在 `validateConfigType` 的 JSON 格式校验后，对配置键 `prd01.profile.fieldSettings` 解析 `rows`：

```java
private static final Set<String> FIXED_VISIBLE_PROFILE_FIELDS = Set.of(
        "gender", "birthday", "identityType", "identity", "educationLevel",
        "locationProvince", "locationCity", "locationDistrict",
        "height", "weight", "hometownProvince", "hometownCity", "hometownDistrict"
);

private static final Set<String> FIXED_REQUIRED_PROFILE_FIELDS = Set.of(
        "gender", "birthday", "identityType", "identity", "educationLevel",
        "locationProvince", "locationCity"
);
```

`locationDistrict` 的 `required` 为条件必填，后台不允许人工关闭，因此保存值必须为 `true`；前端使用固定徽标表达“条件必填”。

- [x] **Step 4: 运行测试并确认通过**

Run: `cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn -Dtest=AppConfigAdminServiceImplTest test`

Expected: 所有测试通过。

### Task 2: 管理后台字段开关锁定与说明

**Files:**
- Modify: `frontend/src/pages/access/AccessConfigPage.tsx`

- [x] **Step 1: 调整字段元数据**

将性别、出生日期、身份、最高学历、现居省市设为 `displayMode=fixed`、`requiredMode=fixed`；现居区县设为固定展示、固定条件必填；身高、体重、家乡省市区设为固定展示、必填可配置。统一身份字段 ID 为正式字段池的 `identityType`。

- [x] **Step 2: 增加固定原因提示**

固定展示和固定必填控件使用禁用态徽标并提供 `title` 提示；条件必填显示“条件必填”，页面说明明确三个属性分别锁定、配置全端共用。

- [x] **Step 3: 构建前端**

Run: `cd frontend && npm run build`

Expected: TypeScript 与 Vite 构建通过。

### Task 3: 综合验证

**Files:**
- Verify: `backend/src/main/java/com/spacetime/admin/service/impl/AppConfigAdminServiceImpl.java`
- Verify: `frontend/src/pages/access/AccessConfigPage.tsx`

- [x] **Step 1: 运行后端目标测试**

Run: `cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn -Dtest=AppConfigAdminServiceImplTest test`

- [x] **Step 2: 运行前端构建**

Run: `cd frontend && npm run build`

- [x] **Step 3: 检查差异**

Run: `git diff --check`

Expected: 无空白错误；差异仅包含本次计划、PRD 及字段配置前后端代码，不覆盖无关工作区改动。
