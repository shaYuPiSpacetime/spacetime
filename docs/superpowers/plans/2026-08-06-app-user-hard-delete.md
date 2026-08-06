# App 用户彻底删除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在管理后台 App 用户管理中增加受权限控制的彻底删除能力，清除用户账号、认证、关系、社区、商业化、推广、推荐与登录态，使同一手机号可以重新注册并完整重走首登认证流程。

**Architecture:** 管理端新增 `DELETE /admin/users/app/{id}`，Controller 仅负责参数校验和权限拦截，Service 负责二次确认、审计与事务，公共 DAO 通过专用 Mapper 调用数据库幂等清理过程，公共会话服务负责撤销该用户全部小程序 Token。数据库 `066` 迁移在旧全流程重置 SQL 基础上补齐 2026-08-03 之后新增的数据表，并只给超级管理员授予独立删除权限。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL 8、Redis、React 18、TypeScript、Vite、Tailwind、Playwright。

## Global Constraints

- 保持后端 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` 六层依赖。
- 删除为硬删除且不可恢复，只允许具备 `user:app:delete` 权限的管理员操作。
- 请求必须同时携带精确确认文本 `DELETE U{用户ID}` 和 2～200 字删除原因。
- 删除范围包含用户主表、认证材料、业务关联与 Redis 登录态；OSS 实体文件不在同步事务中删除，由存储生命周期清理孤立对象。
- 保留一条不含原始证件号、openid、unionid、完整手机号的 `content_operation_log` 删除审计。
- 不修改或覆盖当前工作区已有的 `bobo-todo.md`。
- 本轮实现、测试和构建，不自动写生产数据库、不自动发布。

---

### Task 1: 先建立数据库清理与权限契约

**Files:**
- Create: `backend/src/test/java/com/spacetime/common/database/AppUserHardDeleteSchemaSqlTest.java`
- Create: `deploy/sql/prod/066_app_user_admin_hard_delete.sql`
- Create: `deploy/sql/ops/2026-08-06-rollback-app-user-admin-hard-delete.sql`

**Interfaces:**
- Consumes: 旧脚本 `deploy/sql/ops/2026-08-03-reset-17366629764-full-flow.sql`。
- Produces: 持久数据库过程 `spacetime_delete_app_user_data(IN p_user_id BIGINT)` 与权限 `user:app:delete`。

- [ ] **Step 1: 写失败的迁移契约测试**

```java
@Test
@DisplayName("066 应提供通用用户清理过程并覆盖认证、社区和 PRD-08 数据")
void migrationShouldCoverAllUserDomains() throws IOException {
    String sql = readProjectFile("deploy/sql/prod/066_app_user_admin_hard_delete.sql");
    assertThat(sql)
            .contains("CREATE PROCEDURE spacetime_delete_app_user_data")
            .contains("DELETE FROM app_user_audit_record")
            .contains("DELETE FROM community_comment_like")
            .contains("DELETE FROM community_content_preference")
            .contains("DELETE FROM community_post_draft")
            .contains("DELETE FROM community_view_history")
            .contains("DELETE FROM ct_ideal_snapshot_candidate")
            .contains("DELETE FROM ct_ideal_filter_snapshot")
            .contains("DELETE FROM ct_recommend_preference")
            .contains("DELETE FROM ct_recommend_view_log")
            .contains("DELETE FROM app_user WHERE id = p_user_id")
            .contains("user:app:delete");
}
```

- [ ] **Step 2: 运行测试并确认因 `066` 不存在而失败**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AppUserHardDeleteSchemaSqlTest test`

Expected: FAIL，错误明确指向 `deploy/sql/prod/066_app_user_admin_hard_delete.sql` 不存在。

- [ ] **Step 3: 实现通用清理过程与权限种子**

`066` 必须按以下固定顺序执行：

```sql
-- 理想型/推荐：候选先于快照
DELETE FROM ct_ideal_snapshot_candidate
 WHERE candidate_user_id = p_user_id
    OR snapshot_id IN (SELECT id FROM ct_ideal_filter_snapshot WHERE user_id = p_user_id);
DELETE FROM ct_ideal_filter_snapshot WHERE user_id = p_user_id;
DELETE FROM ct_recommend_view_log WHERE user_id = p_user_id OR candidate_user_id = p_user_id;
DELETE FROM ct_recommend_preference WHERE user_id = p_user_id;

-- 认证与用户主表：主表最后删除
DELETE FROM app_user_audit_history WHERE user_id = p_user_id;
DELETE FROM external_provider_task WHERE user_id = p_user_id;
DELETE FROM app_user_audit_record WHERE user_id = p_user_id;
DELETE FROM app_user WHERE id = p_user_id AND deleted = 0;
```

完整过程还必须包含旧脚本的商业化、关系、推广、注销、安全与设置清理，并新增：`community_comment_like`、`community_content_preference`、`community_post_draft`、`community_user_restriction`、`community_view_history`、`community_media_audit_task`、用户内容对应的 `community_audit_record` 与 `community_event_outbox`。推广域额外覆盖 `promotion_agent_event.user_id`，并在 `promotion_source_trace` 中同时清理 `inviter_id`、`visitor_user_id`、`invitee_user_id`；过程不自行 `COMMIT`，由 Spring `@Transactional` 控制提交/回滚；删除主表行数不是 1 时使用 `SIGNAL SQLSTATE '45000'` 终止。

权限种子使用现有父菜单和超级管理员模式：

```sql
INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status, remark, create_time, update_time)
SELECT parent.id, '删除App用户', 'F', 'user:app:delete', 10, 0, 'ENABLED',
       '彻底删除App用户及认证和关联数据', NOW(), NOW()
  FROM sys_menu parent
 WHERE parent.perms='user:app:list' AND parent.menu_type='C' AND parent.deleted=0
   AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms='user:app:delete' AND deleted=0)
 LIMIT 1;

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT r.id, m.id
  FROM sys_role r
  JOIN sys_menu m ON m.perms='user:app:delete' AND m.deleted=0
 WHERE r.role_code='super_admin' AND r.status='ENABLED' AND r.deleted=0;
```

回滚脚本撤销超级管理员权限关系、逻辑删除权限菜单并 `DROP PROCEDURE IF EXISTS spacetime_delete_app_user_data`，不尝试恢复已经删除的用户数据。

- [ ] **Step 4: 运行迁移契约测试并确认通过**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AppUserHardDeleteSchemaSqlTest test`

Expected: PASS，0 failures。

### Task 2: 后端删除接口与事务服务

**Files:**
- Create: `backend/src/main/java/com/spacetime/admin/dto/request/DeleteAppUserReq.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/AppUserCleanupDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/AppUserCleanupDaoImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/AppUserCleanupMapper.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/AppUserAdminService.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/AppUserAdminServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/controller/AppUserController.java`
- Modify: `backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java`
- Modify: `backend/src/test/java/com/spacetime/admin/controller/AppUserControllerTest.java`

**Interfaces:**
- Consumes: `spacetime_delete_app_user_data(Long userId)`、`MiniappTokenSessionService.revokeAllByUserId(Long userId)`。
- Produces: `void deleteUser(Long id, DeleteAppUserReq req)` 与 `DELETE /admin/users/app/{id}`。

- [ ] **Step 1: 写 Service 和 Controller 失败测试**

```java
@Test
@DisplayName("确认文本正确时应彻底清理用户、撤销会话并写删除审计")
void shouldDeleteUserWithAuditAndSessionRevocation() {
    AppUser user = user(71L, "测试用户");
    user.setPhone("17366629764");
    when(appUserDao.selectById(71L)).thenReturn(user, null);
    DeleteAppUserReq req = new DeleteAppUserReq();
    req.setConfirmation("DELETE U71");
    req.setReason("重新走完整认证流程");

    service.deleteUser(71L, req);

    verify(appUserCleanupDao).deleteByUserId(71L);
    verify(miniappTokenSessionService).revokeAllByUserId(71L);
    verify(contentOperationLogDao).insert(argThat(log ->
            "APP_USER".equals(log.getBizType()) && "DELETE".equals(log.getAction())));
}
```

另写三项测试：确认文本不匹配时不调用 DAO；用户不存在返回“用户不存在”；Controller 使用 `@RequirePermission("user:app:delete")` 且返回精确 `R<Void>`。

- [ ] **Step 2: 运行测试并确认因接口和依赖不存在而失败**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AppUserAdminServiceImplTest,AppUserControllerTest test`

Expected: FAIL，编译错误指向 `DeleteAppUserReq`、`deleteUser`、`AppUserCleanupDao` 尚不存在。

- [ ] **Step 3: 实现请求 DTO、Mapper 与 DAO**

```java
@Data
public class DeleteAppUserReq {
    @NotBlank(message = "删除确认文本不能为空")
    private String confirmation;
    @NotBlank(message = "删除原因不能为空")
    @Size(min = 2, max = 200, message = "删除原因长度应为2到200个字符")
    private String reason;
}
```

```java
@Mapper
public interface AppUserCleanupMapper {
    @Update("CALL spacetime_delete_app_user_data(#{userId})")
    void deleteByUserId(@Param("userId") Long userId);
}
```

DAOImpl 只调用 Mapper，不在 Service 直接执行 SQL。

- [ ] **Step 4: 实现事务服务与 Controller**

```java
@Override
@Transactional
public void deleteUser(Long id, DeleteAppUserReq req) {
    AppUser user = appUserDao.selectById(id);
    if (user == null) throw new BusinessException("用户不存在");
    if (!("DELETE U" + id).equals(req.getConfirmation().trim())) {
        throw new BusinessException("删除确认文本不正确");
    }
    appUserCleanupDao.deleteByUserId(id);
    if (appUserDao.selectById(id) != null) {
        throw new BusinessException("用户数据清理失败");
    }
    miniappTokenSessionService.revokeAllByUserId(id);
    writeDeleteLog(user, req.getReason().trim());
}
```

```java
@DeleteMapping("/{id}")
@RequirePermission("user:app:delete")
public R<Void> delete(@PathVariable Long id, @Valid @RequestBody DeleteAppUserReq req) {
    appUserAdminService.deleteUser(id, req);
    return R.ok();
}
```

删除审计只写 `userId`、脱敏手机号、账号状态、删除原因和结果，不写证件、微信开放标识或认证材料 URL。

- [ ] **Step 5: 运行后端删除专项测试**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AppUserAdminServiceImplTest,AppUserControllerTest,AppUserHardDeleteSchemaSqlTest test`

Expected: PASS，0 failures。

### Task 3: 撤销全部小程序登录态

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/service/MiniappTokenSessionService.java`
- Create: `backend/src/test/java/com/spacetime/common/service/MiniappTokenSessionServiceTest.java`

**Interfaces:**
- Consumes: Redis `miniapp:token:*` 与其 `UserContext` JSON。
- Produces: `long revokeAllByUserId(Long userId)`，返回删除的 Token 数量。

- [ ] **Step 1: 写失败测试**

```java
@Test
@DisplayName("只删除属于目标用户的小程序 Token")
void shouldRevokeOnlyTargetUserTokens() {
    when(redisTemplate.scan(any())).thenReturn(cursorOf("miniapp:token:a", "miniapp:token:b"));
    when(valueOperations.get("miniapp:token:a")).thenReturn("{\"id\":71}");
    when(valueOperations.get("miniapp:token:b")).thenReturn("{\"id\":72}");

    long deleted = service.revokeAllByUserId(71L);

    assertThat(deleted).isEqualTo(1);
    verify(redisTemplate).delete("miniapp:token:a");
    verify(redisTemplate, never()).delete("miniapp:token:b");
}
```

- [ ] **Step 2: 运行测试并确认服务不存在而失败**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=MiniappTokenSessionServiceTest test`

Expected: FAIL，编译错误指向 `MiniappTokenSessionService` 不存在。

- [ ] **Step 3: 使用 Redis SCAN 实现会话撤销**

```java
public long revokeAllByUserId(Long userId) {
    long deleted = 0;
    ScanOptions options = ScanOptions.scanOptions()
            .match(AuthConstant.MINIAPP_TOKEN_PREFIX + "*").count(200).build();
    try (Cursor<String> cursor = redisTemplate.scan(options)) {
        while (cursor.hasNext()) {
            String key = cursor.next();
            String json = redisTemplate.opsForValue().get(key);
            if (json != null && userId.equals(objectMapper.readValue(json, UserContext.class).getId())) {
                if (Boolean.TRUE.equals(redisTemplate.delete(key))) deleted++;
            }
        }
    } catch (Exception exception) {
        throw new BusinessException("用户登录态清理失败，请稍后重试");
    }
    return deleted;
}
```

禁止使用 Redis `KEYS`；无法扫描或解析时抛业务异常，使数据库事务回滚。

- [ ] **Step 4: 运行会话服务和后端删除专项测试**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=MiniappTokenSessionServiceTest,AppUserAdminServiceImplTest test`

Expected: PASS，0 failures。

### Task 4: 管理后台删除交互

**Files:**
- Modify: `frontend/src/api/userApp.ts`
- Modify: `frontend/src/pages/customers/CustomersPage.tsx`
- Modify: `frontend/e2e-tests/tests/prd01-user.spec.ts`

**Interfaces:**
- Consumes: `DELETE /admin/users/app/{id}`、权限 `user:app:delete`。
- Produces: `deleteAppUser(id, confirmation, reason)` 与画像详情抽屉底部删除入口。

- [ ] **Step 1: 先写 Playwright 失败用例**

```ts
test('L4-ADM-DELETE 彻底删除用户需权限、确认文本和原因', async ({ page }) => {
  await mockPermissions(page, ['user:app:list', 'user:app:detail', 'user:app:delete']);
  let requestBody: unknown;
  await page.route('**/api/admin/users/app/1', async (route) => {
    if (route.request().method() === 'DELETE') {
      requestBody = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: null }) });
    }
    return route.fallback();
  });
  await page.goto('/customers');
  await page.getByRole('button', { name: '详情' }).first().click();
  await page.getByRole('button', { name: '删除用户 林女士' }).click();
  await expect(page.getByRole('heading', { name: '彻底删除 App 用户' })).toBeVisible();
  await page.getByLabel('删除原因').fill('重新走完整认证流程');
  await page.getByLabel('确认文本').fill('DELETE U1');
  await page.getByRole('button', { name: '确认彻底删除' }).click();
  expect(requestBody).toEqual({ confirmation: 'DELETE U1', reason: '重新走完整认证流程' });
});
```

另写一项无 `user:app:delete` 权限时画像详情中删除按钮不可见的测试。

- [ ] **Step 2: 运行 Playwright 并确认删除按钮不存在而失败**

Run: `cd frontend && npx playwright test e2e-tests/tests/prd01-user.spec.ts --grep "L4-ADM-DELETE"`

Expected: FAIL，找不到“删除用户 林女士”按钮。

- [ ] **Step 3: 实现 API 与页面状态**

```ts
export function deleteAppUser(id: number, confirmation: string, reason: string) {
  return request.delete(`/admin/users/app/${id}`, { data: { confirmation, reason } });
}
```

页面新增 `deleteUser`、`deleteConfirmation`、`deleteReason`、`deleteProcessing` 状态；成功后关闭画像详情和模块弹窗，若当前页仅剩一条且页码大于 1 则回到上一页，否则重新请求用户列表和统计。

- [ ] **Step 4: 实现可访问的危险确认弹窗**

删除入口只在 `hasPermission('user:app:delete')` 时出现在画像详情底部，与冻结/解冻操作并列；按钮使用原生 `Button`、`Trash2` 图标和可见文字/`aria-label="删除用户 {昵称}"`。弹窗标题为“彻底删除 App 用户”，明确列出账号、认证材料、关系、动态、订单/资产、推荐历史和登录态都会清除；两个字段使用可见 `<label htmlFor>`，错误信息使用 `role="alert"`，确认按钮只有在文本精确匹配且原因长度合规时启用。

```tsx
<Button
  variant="destructive"
  disabled={deleteProcessing || deleteConfirmation.trim() !== `DELETE U${deleteUser.id}` || deleteReason.trim().length < 2}
  onClick={() => void confirmDeleteUser()}
>
  {deleteProcessing ? '删除中…' : '确认彻底删除'}
</Button>
```

- [ ] **Step 5: 运行删除交互 Playwright**

Run: `cd frontend && npx playwright test e2e-tests/tests/prd01-user.spec.ts --grep "L4-ADM-DELETE"`

Expected: 2 tests passed。

### Task 5: 完整验证与交付

**Files:**
- Modify: `docs/测试文档/用户准入与资料认证初始化-testcase.md`
- Modify: `docs/测试文档/用户准入与资料认证初始化-testreport.md`

**Interfaces:**
- Consumes: Task 1～4 全部实现。
- Produces: 可复核的自动化证据与未执行生产写入声明。

- [ ] **Step 1: 更新测试用例与报告**

新增后端权限/确认/事务回滚/会话撤销/迁移覆盖和前端权限隐藏/确认校验/刷新用例；明确 L1 真实删除只允许使用专用测试账号，本轮无专用账号时标记跳过，不删除生产真实用户。

- [ ] **Step 2: 运行后端全量测试**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml test`

Expected: BUILD SUCCESS，0 failures，0 errors。

- [ ] **Step 3: 运行管理后台构建和 PRD-01 Playwright**

Run: `npm --prefix frontend run build`

Expected: TypeScript 与 Vite 构建成功。

Run: `cd frontend && npx playwright test e2e-tests/tests/prd01-user.spec.ts`

Expected: 0 failures。

- [ ] **Step 4: 检查差异与工作区隔离**

Run: `git diff --check && git status --short`

Expected: 无空白错误；`bobo-todo.md` 仍是用户原有修改且未被本功能覆盖。

## Self-Review

- Spec coverage：删除入口、认证清理、旧 SQL 参考、独立权限、审计、Redis、社区新增表、PRD-08 表、前后端闭环和测试均有任务承接。
- Placeholder scan：无 `TBD`、`TODO`、`implement later` 或未定义接口。
- Type consistency：前端发送 `{ confirmation, reason }`，后端 `DeleteAppUserReq` 同名字段；确认文本统一为 `DELETE U{id}`；权限统一为 `user:app:delete`。
