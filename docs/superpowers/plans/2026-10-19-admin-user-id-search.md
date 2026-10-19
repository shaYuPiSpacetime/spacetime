# 管理后台用户 ID 统一搜索 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 App 用户管理及五个审核模块在现有“用户搜索”输入框中支持精确用户 ID 搜索，同时保留所有既有关键词匹配能力。

**Architecture:** 沿用现有 `keyword` 请求参数和页面状态。实名/学历/头像及资料照片/文字审核保留现有候选用户 ID 逻辑；App 用户管理仅在关键词可安全解析为正整数 `Long` 时，把 `app_user.id = keyword` 加入原多字段 OR 条件组。三个共用页面只更新输入提示，并增加静态契约测试。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、JUnit 5、AssertJ、React 18、TypeScript、Node.js `node:test`、Vite。

## Global Constraints

- 只在 `master` 分支修改、提交和 Push，开始及发布前同步最新 `origin/master`。
- 输入框继续使用现有 `keyword` 参数，不新增独立用户 ID 筛选项。
- 统一提示文案为 `用户ID/姓名/昵称/手机号/身份证/标签`。
- 用户 ID 只做精确匹配；空白、非数字、零、负数和超出 `Long` 范围的数字不生成 ID 条件。
- 数字关键词仍同时执行手机号等既有匹配，不改变其他筛选、分页、排序和权限行为。
- 只提交本任务文件，不混入工作区其他任务或用户的未提交内容。

---

## File Map

- `backend/src/main/java/com/spacetime/admin/service/impl/AppUserAdminServiceImpl.java`：为 App 用户关键词查询追加安全的用户 ID 精确条件。
- `backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java`：覆盖数字 ID 关键词和超长数字边界。
- `backend/src/test/java/com/spacetime/admin/service/VerificationAdminServiceImplTest.java`：锁定实名、学历、头像共用服务的用户 ID 搜索行为。
- `backend/src/test/java/com/spacetime/admin/service/ModerationAdminServiceImplTest.java`：锁定资料照片、文字审核共用服务的用户 ID 搜索行为。
- `frontend/src/pages/customers/CustomersPage.tsx`：更新 App 用户管理搜索提示。
- `frontend/src/pages/verify/VerificationManagementPage.tsx`：更新三个认证审核页面的共用搜索提示。
- `frontend/src/pages/moderation/ModerationPage.tsx`：更新两个资料审核页面的共用搜索提示。
- `frontend/scripts/test-admin-user-id-search.mjs`：静态校验三个入口使用统一提示且继续提交 `keyword`。
- `frontend/package.json`：注册定向前端契约测试命令。

### Task 1: App 用户关键词支持精确用户 ID

**Files:**
- Modify: `backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/AppUserAdminServiceImpl.java`

**Interfaces:**
- Consumes: `AppUserPageReq#getKeyword(): String`。
- Produces: `buildUserQueryWrapper(AppUserPageReq)` 在有效数字关键词下生成 `AppUser::getId = Long`，并保留原 OR 条件。

- [ ] **Step 1: 写入数字用户 ID 的失败测试**

在 `AppUserAdminServiceImplTest` 增加：

```java
@Test
@DisplayName("用户列表关键词应支持精确用户ID并保留手机号搜索")
void shouldSearchExactUserIdFromKeyword() {
    TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUser.class);
    Page<AppUser> page = new Page<>(1, 9, 0);
    page.setRecords(List.of());
    when(appUserDao.selectPage(any(), any())).thenReturn(page);

    AppUserPageReq req = new AppUserPageReq();
    req.setPage(1);
    req.setSize(9);
    req.setKeyword("1882");

    service.getUserPage(req);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<LambdaQueryWrapper<AppUser>> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
    verify(appUserDao).selectPage(any(), captor.capture());
    assertThat(captor.getValue().getSqlSegment())
            .containsPattern("(^|\\s|\\()id =")
            .containsPattern("(^|\\s|\\()phone LIKE");
    assertThat(captor.getValue().getParamNameValuePairs()).containsValue(1882L);
}
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```powershell
cd backend
mvn -Dtest=AppUserAdminServiceImplTest#shouldSearchExactUserIdFromKeyword test
```

Expected: FAIL，因为现有关键词 SQL 中没有 `id =`，参数集合也没有 `1882L`。

- [ ] **Step 3: 添加超长数字边界测试**

```java
@Test
@DisplayName("用户列表超长数字关键词不应触发用户ID解析异常")
void shouldIgnoreOverflowingUserIdKeyword() {
    TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUser.class);
    Page<AppUser> page = new Page<>(1, 9, 0);
    page.setRecords(List.of());
    when(appUserDao.selectPage(any(), any())).thenReturn(page);

    AppUserPageReq req = new AppUserPageReq();
    req.setPage(1);
    req.setSize(9);
    req.setKeyword("999999999999999999999999999999");

    assertThatCode(() -> service.getUserPage(req)).doesNotThrowAnyException();
}
```

- [ ] **Step 4: 实现安全解析与 OR 条件**

在 `buildUserQueryWrapper` 前解析候选 ID：

```java
Long keywordUserId = parsePositiveUserId(req.getKeyword());
```

把现有关键词 `.and(...)` 改成语句块，在原条件末尾追加：

```java
.and(StrUtil.isNotBlank(req.getKeyword()), w -> {
    w.like(AppUser::getNickname, req.getKeyword())
            .or().like(AppUser::getSchool, req.getKeyword())
            .or().like(AppUser::getTags, req.getKeyword())
            .or().like(AppUser::getPhone, req.getKeyword())
            .or().like(AppUser::getOpenid, safeKeyword)
            .or().exists("SELECT 1 FROM app_user_audit_record ar WHERE ar.user_id = app_user.id"
                    + " AND ar.deleted = 0"
                    + " AND (ar.real_name LIKE '%" + safeKeyword + "%'"
                    + " OR ar.bound_phone LIKE '%" + safeKeyword + "%'"
                    + " OR ar.id_card LIKE '%" + safeKeyword + "%')");
    if (keywordUserId != null) {
        w.or().eq(AppUser::getId, keywordUserId);
    }
})
```

新增同类私有方法：

```java
private Long parsePositiveUserId(String keyword) {
    if (StrUtil.isBlank(keyword)) {
        return null;
    }
    String normalized = keyword.trim();
    if (!normalized.matches("\\d+")) {
        return null;
    }
    try {
        long userId = Long.parseLong(normalized);
        return userId > 0 ? userId : null;
    } catch (NumberFormatException ignored) {
        return null;
    }
}
```

- [ ] **Step 5: 运行定向测试确认 GREEN**

Run:

```powershell
cd backend
mvn -Dtest=AppUserAdminServiceImplTest test
```

Expected: `BUILD SUCCESS`，新增测试和既有手机号测试均通过。

- [ ] **Step 6: 提交后端核心行为**

```powershell
git add backend/src/main/java/com/spacetime/admin/service/impl/AppUserAdminServiceImpl.java backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java
git commit -m "feat(admin): support app user id keyword search"
```

### Task 2: 锁定五个审核模块的既有用户 ID 搜索

**Files:**
- Modify: `backend/src/test/java/com/spacetime/admin/service/VerificationAdminServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/admin/service/ModerationAdminServiceImplTest.java`

**Interfaces:**
- Consumes: `VerificationPageReq#setKeyword("1882")`。
- Produces: 审核记录分页条件包含 `user_id IN (...)`，参数集合包含 `1882L`。

- [ ] **Step 1: 添加 Verification 共用服务回归测试**

```java
@Test
@DisplayName("实名、学历和头像审核用户搜索应支持精确用户ID")
void shouldSearchVerificationUsersByExactUserId() {
    when(appUserDao.selectList(any())).thenReturn(List.of());
    when(auditRecordDao.selectList(any())).thenReturn(List.of());
    when(auditRecordDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
            .thenReturn(new Page<>(1, 20, 0));
    VerificationPageReq req = new VerificationPageReq();
    req.setPage(1);
    req.setSize(20);
    req.setKeyword("1882");

    service.getRealNamePage(req);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<LambdaQueryWrapper<AppUserAuditRecord>> captor =
            ArgumentCaptor.forClass(LambdaQueryWrapper.class);
    verify(auditRecordDao).selectPage(any(Page.class), captor.capture());
    assertThat(captor.getValue().getSqlSegment()).contains("user_id IN");
    assertThat(captor.getValue().getParamNameValuePairs()).containsValue(1882L);
}
```

- [ ] **Step 2: 添加 Moderation 共用服务回归测试**

```java
@Test
@DisplayName("资料图片和文字审核用户搜索应支持精确用户ID")
void shouldSearchModerationUsersByExactUserId() {
    when(appUserDao.selectList(any())).thenReturn(List.of());
    when(auditRecordDao.selectList(any())).thenReturn(List.of());
    when(auditRecordDao.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
            .thenReturn(new Page<>(1, 20, 0));
    VerificationPageReq req = new VerificationPageReq();
    req.setPage(1);
    req.setSize(20);
    req.setKeyword("1882");

    service.getPhotoPage(req);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<LambdaQueryWrapper<AppUserAuditRecord>> captor =
            ArgumentCaptor.forClass(LambdaQueryWrapper.class);
    verify(auditRecordDao).selectPage(any(Page.class), captor.capture());
    assertThat(captor.getValue().getSqlSegment()).contains("user_id IN");
    assertThat(captor.getValue().getParamNameValuePairs()).containsValue(1882L);
}
```

- [ ] **Step 3: 运行审核模块测试**

```powershell
cd backend
mvn -Dtest=VerificationAdminServiceImplTest,ModerationAdminServiceImplTest test
```

Expected: `BUILD SUCCESS`。这是对已存在服务行为的回归锁定，不需要修改生产服务代码。

- [ ] **Step 4: 提交审核回归门禁**

```powershell
git add backend/src/test/java/com/spacetime/admin/service/VerificationAdminServiceImplTest.java backend/src/test/java/com/spacetime/admin/service/ModerationAdminServiceImplTest.java
git commit -m "test(admin): cover audit user id search"
```

### Task 3: 三个共用输入框展示用户 ID 搜索能力

**Files:**
- Create: `frontend/scripts/test-admin-user-id-search.mjs`
- Modify: `frontend/package.json`
- Modify: `frontend/src/pages/customers/CustomersPage.tsx`
- Modify: `frontend/src/pages/verify/VerificationManagementPage.tsx`
- Modify: `frontend/src/pages/moderation/ModerationPage.tsx`

**Interfaces:**
- Consumes: 三个页面现有 `keyword` 状态与 API 请求参数。
- Produces: 统一提示文案 `用户ID/姓名/昵称/手机号/身份证/标签`。

- [ ] **Step 1: 创建失败的前端静态契约测试**

```javascript
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedPlaceholder = 'placeholder="用户ID/姓名/昵称/手机号/身份证/标签"';
const pages = [
  'src/pages/customers/CustomersPage.tsx',
  'src/pages/verify/VerificationManagementPage.tsx',
  'src/pages/moderation/ModerationPage.tsx',
];

for (const page of pages) {
  test(`${page} keeps the shared keyword search and advertises user ID`, async () => {
    const source = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.ok(source.includes(expectedPlaceholder), `${page} should include the unified placeholder`);
    assert.match(source, /keyword/);
  });
}
```

- [ ] **Step 2: 运行静态测试确认 RED**

```powershell
cd frontend
node --test scripts/test-admin-user-id-search.mjs
```

Expected: 3 个测试均因缺少 `用户ID/` 前缀而失败。

- [ ] **Step 3: 注册测试命令并更新三个提示文案**

在 `frontend/package.json` 的 `scripts` 中增加：

```json
"test:admin-user-id-search": "node --test scripts/test-admin-user-id-search.mjs"
```

把三个页面中的：

```tsx
placeholder="姓名/昵称/手机号/身份证/标签"
```

统一替换为：

```tsx
placeholder="用户ID/姓名/昵称/手机号/身份证/标签"
```

- [ ] **Step 4: 运行静态测试确认 GREEN**

```powershell
cd frontend
npm run test:admin-user-id-search
```

Expected: `3` tests passed，`0` failed。

- [ ] **Step 5: 构建管理后台**

```powershell
cd frontend
npm run build
```

Expected: TypeScript 与 Vite 构建成功。

- [ ] **Step 6: 提交前端交互文案和门禁**

```powershell
git add frontend/package.json frontend/scripts/test-admin-user-id-search.mjs frontend/src/pages/customers/CustomersPage.tsx frontend/src/pages/verify/VerificationManagementPage.tsx frontend/src/pages/moderation/ModerationPage.tsx
git commit -m "feat(admin): expose user id in shared search"
```

### Task 4: 综合验证、推送与发布核验

**Files:**
- Verify only: all files listed above
- Read before miniapp upload: `docs/流程规范/小程序体验版发布与分包缓存校验.md`

**Interfaces:**
- Consumes: Tasks 1-3 的提交。
- Produces: `master` 上的已验证变更、管理后台/后端自动部署结论，以及按仓库规范生成的全新小程序体验版目录和上传证据。

- [ ] **Step 1: 运行全部定向后端测试**

```powershell
cd backend
mvn -Dtest=AppUserAdminServiceImplTest,VerificationAdminServiceImplTest,ModerationAdminServiceImplTest test
```

Expected: `BUILD SUCCESS`，无失败或错误。

- [ ] **Step 2: 运行前端契约与构建**

```powershell
cd frontend
npm run test:admin-user-id-search
npm run build
```

Expected: 3 个契约测试通过且 Vite 构建成功。

- [ ] **Step 3: 核对本任务差异和工作区隔离**

```powershell
git diff --check origin/master...HEAD
git status --short
git show --stat --oneline HEAD
```

Expected: 无空白错误；提交只包含计划列出的任务文件，用户原有未提交内容仍保留且未进入提交。

- [ ] **Step 4: 发布前再次同步远端**

```powershell
git fetch origin
git merge-base --is-ancestor origin/master HEAD
```

若远端有新提交，先按固定分支规则在 `master` 同步；发生冲突则停止发布并报告，不强制覆盖。

- [ ] **Step 5: 推送 master 并核对远端哈希**

```powershell
git push origin master
git rev-parse HEAD
git ls-remote origin refs/heads/master
```

Expected: 两个哈希一致。

- [ ] **Step 6: 核对管理后台和后端自动部署**

查询该提交对应的 GitHub Actions checks；管理后台构建和后端部署必须成功。若任一失败，不得声称线上生效。

- [ ] **Step 7: 按小程序发布规范生成全新发布目录并上传体验版**

完整执行 `docs/流程规范/小程序体验版发布与分包缓存校验.md`：从当次最新 `origin/master` 建立独立发布目录，核对源文件与复制文件哈希，比较 preview/upload 各分包字节数，再上传新体验版。

- [ ] **Step 8: 最终验收记录**

报告以下证据：提交哈希、定向测试结果、前端构建结果、自动部署状态、小程序体验版版本/上传结果，以及六个模块统一提示和用户 ID 精确查询的实现范围。
