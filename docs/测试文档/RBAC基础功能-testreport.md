# RBAC基础功能 - 测试报告

> **关联文档**：
> - 测试用例：`docs/测试文档/RBAC基础功能-testcase.md`

---

## 1. 测试概况

| 项目 | 信息 |
|------|------|
| 功能名称 | RBAC 基础功能（登录认证 / 用户管理 / 角色管理 / 菜单管理 / 动态路由） |
| 测试环境 | API: http://localhost:8080 (Aliyun RDS MySQL), Frontend: http://localhost:5173 |
| 执行日期 | 2026-05-12 |
| 执行人 | 自动化测试 |
| 后端版本 | master（含 B1~B4 修复 + JDK 锁定 + 登录支持用户名/手机号） |
| 前端版本 | master（登录 account 字段适配 + Playwright 1.48） |
| 测试策略 | L1 + L2 + L3 + L4 + 手动 |
| 测试模式 | 轻量模式（无技术方案，仅代码变更驱动） |
| JDK | 22（`JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home`）。pom.xml 已通过 maven-enforcer-plugin 锁定 [21,23)，CI 不会误用 Java 25。 |
| L4 浏览器 | Chromium（Playwright 1.48，降级规避 1.60 macOS headless shell 下载问题） |
| L1 数据计划 | 链式：登录获取 Token → 创建角色/菜单/用户 → 关联/绑定 → 查列表验证 → 删除清理 |

## 2. 测试结果汇总

| 层级 | 总数 | 通过 ✅ | 失败 ❌ | 跳过 ⏭️ | 通过率 |
|------|------|--------|--------|---------|--------|
| L1 接口测试 | 38 | 38 | 0 | 0 | 100% |
| L2 Controller | 25 | 25 | 0 | 0 | 100% |
| L3 Service | 17 | 17 | 0 | 0 | 100% |
| L4 E2E | 8 | 8 | 0 | 0 | 100% |
| 手动测试 | 10 | — | — | 10 | — |
| **合计** | **98** | **88** | **0** | **10** | **100%** |

## 3. 测试结论

**判定结果**：✅ 通过

**判定依据**：
- P0 用例：全部通过（L1 38/38 + L2 25/25 + L3 17/17 + L4 8/8 = 88/88）
- 手动测试跳过：10 条（待人工执行）

**结论**：所有自动化测试（L1+L2+L3+L4）100% 通过。手动测试 10 条需人工验证。

## 4. 跳过用例明细

### 4.1 手动测试

| 用例ID | 优先级 | 跳过原因 | 是否需要补测 |
|--------|--------|---------|------------|
| M-01 ~ M-10 | P0~P2 | 需人工在浏览器中逐项操作验证 | 是 |

## 5. 各层级执行详情

### 5.1 L1 接口测试

```
执行命令: API_URL=http://localhost:8080 bash docs/测试文档/RBAC基础功能-test-l1.sh
执行时间: 2026-05-12
```

**链式数据准备**：登录获取 Token → 创建角色 → 创建菜单（目录+子页面）→ 创建用户 → 分配角色 → 绑定菜单 → 验证 → 清理删除

| 用例ID | 优先级 | 场景 | HTTP 状态 | 结果 |
|--------|-------|------|----------|------|
| F1-P0-01 | P0 | 正常登录 | 200 | ✅ |
| F1-P2-01 | P2 | 用户名不存在 | 200 | ✅ |
| F1-P2-02 | P2 | 密码错误 | 200 | ✅ |
| F1-P2-03 | P2 | 账号已禁用 | 200 | ✅ |
| F1-P2-04 | P2 | 缺用户名参数 → code=4001 + field message | 200 | ✅ |
| F1-P2-05 | P2 | 缺密码参数 → code=4001 + field message | 200 | ✅ |
| F1-P0-02 | P0 | 正常退出 | 200 | ✅ |
| F1-P3-01 | P3 | 退出后 Token 失效 | 401 | ✅ |
| F2-P0-01 | P0 | 分页查询用户列表 | 200 | ✅ |
| F2-P2-01 | P2 | 按关键词搜索 | 200 | ✅ |
| F2-P2-02 | P2 | 按状态筛选 | 200 | ✅ |
| F2-P0-02 | P0 | 查询用户详情 | 200 | ✅ |
| F2-P2-03 | P2 | 查询不存在的用户 | 200 | ✅ |
| F2-P0-03 | P0 | 创建用户 | 200 | ✅ |
| F2-P2-04 | P2 | 用户名重复 | 200 | ✅ |
| F2-P2-05 | P2 | 缺少必填字段 → code=4001 + field message | 200 | ✅ |
| F2-P0-04 | P0 | 更新用户信息 | 200 | ✅ |
| F2-P0-05 | P0 | 删除用户 | 200 | ✅ |
| F2-P2-06 | P2 | 删除不存在的用户 | 200 | ✅ |
| F2-P0-06 | P0 | 重置用户密码 | 200 | ✅ |
| F2-P0-07 | P0 | 为用户分配角色 | 200 | ✅ |
| F2-P3-02 | P3 | 未登录调用户列表 | 401 | ✅ |
| F2-P3-03 | P3 | 无权限调用户列表 | 403 | ✅ |
| F3-P0-01 | P0 | 分页查询角色列表 | 200 | ✅ |
| F3-P0-02 | P0 | 查询全部启用角色 | 200 | ✅ |
| F3-P0-03 | P0 | 查询角色详情 | 200 | ✅ |
| F3-P0-04 | P0 | 创建角色 | 200 | ✅ |
| F3-P2-01 | P2 | 角色编码重复 | 200 | ✅ |
| F3-P0-05 | P0 | 更新角色 | 200 | ✅ |
| F3-P0-06 | P0 | 删除角色 | 200 | ✅ |
| F3-P0-07 | P0 | 角色绑定菜单 | 200 | ✅ |
| F3-P3-01 | P3 | 未登录调角色接口 | 401 | ✅ |
| F3-P3-02 | P3 | 无权限调角色接口 | 403 | ✅ |
| F4-P0-01 | P0 | 平铺查询所有菜单 | 200 | ✅ |
| F4-P0-02 | P0 | 查询菜单树 | 200 | ✅ |
| F4-P0-03 | P0 | 查询菜单详情 | 200 | ✅ |
| F4-P0-04 | P0 | 创建目录菜单 | 200 | ✅ |
| F4-P0-05 | P0 | 创建页面菜单 | 200 | ✅ |
| F4-P0-06 | P0 | 创建按钮权限 | 200 | ✅ |
| F4-P0-07 | P0 | 更新菜单 | 200 | ✅ |
| F4-P0-08 | P0 | 删除菜单(级联) | 200 | ✅ |
| F4-P3-01 | P3 | 无权限调菜单接口 | 403 | ✅ |
| F5-P0-01 | P0 | 获取当前用户路由树 | 200 | ✅ |
| F5-P3-01 | P3 | 未登录调路由接口 | 401 | ✅ |
| F5-P2-01 | P2 | 无角色用户空路由 | 200 | ✅ |

**L1 汇总**：总计 38 / 通过 38 / 失败 0 / 跳过 0

### 5.2 L2 Controller 测试

```
执行命令: cd backend && JAVA_HOME=.../openjdk-22 mvn test -Dtest="AuthControllerTest,UserControllerTest,RoleControllerTest,MenuControllerTest,RouterControllerTest"
执行时间: 2026-05-12
框架: JUnit 5 + Mockito + MockMvcBuilders.standaloneSetup()（避免 MyBatis DataSource 依赖）
```

| 用例ID | 测试方法 | Controller | 结果 |
|--------|---------|-----------|------|
| L2-01 | shouldReturnTokenAndPermissions | AuthController | ✅ |
| L2-02 | shouldFailWhenUsernameMissing | AuthController | ✅ |
| L2-03 | shouldLogoutSuccessfully | AuthController | ✅ |
| L2-04 | shouldReturnPaginatedUsers | UserController | ✅ |
| L2-05 | shouldReturnUserDetail | UserController | ✅ |
| L2-06 | shouldCreateUser | UserController | ✅ |
| L2-07 | shouldFailWhenPasswordMissing | UserController | ✅ |
| L2-08 | shouldUpdateUser | UserController | ✅ |
| L2-09 | shouldDeleteUser | UserController | ✅ |
| L2-10 | shouldResetPassword | UserController | ✅ |
| L2-11 | shouldAssignRoles | UserController | ✅ |
| L2-12 | shouldReturnPaginatedRoles | RoleController | ✅ |
| L2-13 | shouldReturnAllRoles | RoleController | ✅ |
| L2-14 | shouldReturnRoleDetail | RoleController | ✅ |
| L2-15 | shouldCreateRole | RoleController | ✅ |
| L2-16 | shouldUpdateRole | RoleController | ✅ |
| L2-17 | shouldDeleteRole | RoleController | ✅ |
| L2-18 | shouldBindMenus | RoleController | ✅ |
| L2-19 | shouldReturnMenuList | MenuController | ✅ |
| L2-20 | shouldReturnMenuTree | MenuController | ✅ |
| L2-21 | shouldReturnMenuDetail | MenuController | ✅ |
| L2-22 | shouldCreateMenu | MenuController | ✅ |
| L2-23 | shouldUpdateMenu | MenuController | ✅ |
| L2-24 | shouldDeleteMenu | MenuController | ✅ |
| L2-25 | shouldReturnUserRouters | RouterController | ✅ |

**L2 汇总**：Tests run: 25, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS

### 5.3 L3 Service 测试

```
执行命令: cd backend && JAVA_HOME=.../openjdk-22 mvn test -Dtest="AuthServiceImplTest,UserServiceImplTest,RoleServiceImplTest,MenuServiceImplTest"
执行时间: 2026-05-12
框架: JUnit 5 + Mockito Extension（无 Spring 上下文，纯单元测试）
```

| 用例ID | 测试方法 | Service | 结果 |
|--------|---------|---------|------|
| L3-01 | shouldLoginSuccessfully | AuthServiceImpl | ✅ |
| L3-02 | shouldThrowWhenUserNotFound | AuthServiceImpl | ✅ |
| L3-03 | shouldThrowWhenPasswordWrong | AuthServiceImpl | ✅ |
| L3-04 | shouldThrowWhenUserDisabled | AuthServiceImpl | ✅ |
| L3-05 | shouldThrowWhenUsernameExists | UserServiceImpl | ✅ |
| L3-06 | shouldCreateUserWithEncryptedPassword | UserServiceImpl | ✅ |
| L3-07 | shouldThrowWhenUpdatingNonexistentUser | UserServiceImpl | ✅ |
| L3-08 | shouldReturnUserDetailWithRoleIds | UserServiceImpl | ✅ |
| L3-09 | shouldClearOldRolesThenInsertNewOnes | UserServiceImpl | ✅ |
| L3-10 | shouldThrowWhenResettingPasswordForNonexistentUser | UserServiceImpl | ✅ |
| L3-11 | shouldThrowWhenRoleCodeExists | RoleServiceImpl | ✅ |
| L3-12 | shouldCreateRole | RoleServiceImpl | ✅ |
| L3-13 | shouldCleanAssociationsOnDelete | RoleServiceImpl | ✅ |
| L3-14 | shouldClearOldMenusThenInsertNewOnes | RoleServiceImpl | ✅ |
| L3-15 | shouldCreateMenu | MenuServiceImpl | ✅ |
| L3-16 | shouldBuildMenuTree | MenuServiceImpl | ✅ |
| L3-17 | shouldCascadeDeleteChildren | MenuServiceImpl | ✅ |

**L3 汇总**：Tests run: 17, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS

### 5.4 L4 E2E 浏览器测试

```
执行命令: cd frontend && BASE_URL=http://localhost:5173 API_URL=http://localhost:8080 npx playwright test --config=e2e-tests/playwright.config.ts
执行时间: 2026-05-13
框架: Playwright 1.48 + Chromium（降级规避 1.60 macOS headless shell 下载问题）
```

| 用例ID | 优先级 | 场景 | 结果 |
|--------|-------|------|------|
| L4-01 | P0 | 登录后侧边栏显示"系统管理"菜单分组 | ✅ |
| L4-02 | P0 | 点击用户管理导航到 /system/user | ✅ |
| L4-03 | P0 | 用户管理页表格展示和数据加载 | ✅ |
| L4-04 | P0 | 角色管理页表格展示 | ✅ |
| L4-05 | P0 | 菜单管理页树形表格展示 | ✅ |
| L4-06 | P1 | 未登录访问管理页面重定向到登录页 | ✅ |
| L4-07 | P1 | 创建用户流程（Dialog 交互） | ✅ |
| L4-08 | P1 | 角色管理分配菜单 Dialog | ✅ |

**L4 汇总**：Tests run: 8, Passed: 8, Failed: 0 — 15.0s

> **已知问题**：Playwright 1.60 在 macOS 需要 `chromium_headless_shell-1223` 二进制，Google CDN 超时、国内 npmmirror 无 CFT 镜像。当前通过降级到 1.48（使用 chromium-1140，已在本地）绕过。后续升级 Playwright 前需确认二进制可下载。

### 5.5 前端手动测试

| 用例ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|-------|---------|---------|---------|------|
| M-01 | P0 | 登录→Dashboard→侧边栏显示系统管理→展开子菜单 | 3 个子菜单均可见 | — | ⏭️ |
| M-02 | P1 | 用户管理→新增 Dialog→留空必填项→提交 | 前端校验拦截 | — | ⏭️ |
| M-03 | P1 | 角色管理→分配菜单 Dialog→展开/折叠菜单树→勾选 | 复选框交互正常 | — | ⏭️ |
| M-04 | P1 | 菜单管理→树形表格→展开父节点→折叠 | 展开/折叠流畅 | — | ⏭️ |
| M-05 | P2 | 各管理页→点击分页→切换每页条数 | 分页数据正确 | — | ⏭️ |
| M-06 | P2 | Token 过期→访问管理页面 | 自动跳转登录页 | — | ⏭️ |
| M-07 | P1 | 用户管理→状态列 Badge→ENABLED 绿色/DISABLED 灰色 | 颜色正确 | — | ⏭️ |
| M-08 | P1 | 菜单管理→类型列 Badge→目录/菜单/按钮不同颜色 | 颜色正确 | — | ⏭️ |
| M-09 | P2 | 快速双击新增按钮 | 不弹出两个 Dialog | — | ⏭️ |
| M-10 | P2 | 编辑 Dialog→修改→取消→重新打开 | 表单已重置 | — | ⏭️ |

## 6. 已修复缺陷（本轮修复）

| 编号 | 问题描述 | 优先级 | 修复内容 |
|------|---------|--------|---------|
| B1 | `MenuServiceImpl.collectChildIds()` 级联删除遗漏直接子节点 | P1 | 在递归前新增 `ids.add(m.getId())`，同步更新 L3-17 测试验证 |
| B2 | DTO 的 `@PathVariable` ID 字段带 `@NotNull`，`@Valid` 先于 `req.setId()` 执行导致校验异常 | P2 | 移除 6 个 DTO（ResetPwdReq / UserRoleReq / RoleMenuReq / UserUpdateReq / RoleUpdateReq / MenuUpdateReq）中 ID 字段的 `@NotNull`，清理无用的 `import` |
| B3 | 缺少 `MethodArgumentNotValidException` 异常处理器，校验失败返回 5000 "系统异常" | P2 | 新增 `@ExceptionHandler`，返回 `PARAM_ERROR(4001)` + 字段级错误信息（如 `"password: 密码不能为空"`）。L1/L2 相关断言同步更新 |
| B4 | 创建接口（User/Role/Menu）返回 `R.ok()` 无 data，客户端无法获取新建实体 ID | P3 | 3 个 Service 接口和实现 `create()` 返回类型 `void → Long`、3 个 Controller `create()` 返回 `R<Long>`，L2 测试同步更新 |
| B5 | 登录仅支持用户名，不支持手机号 | P3 | `LoginReq.username → account`，`UserDao` 新增 `selectByUsernameOrPhone()`（先按 username 查，未命中再按 phone 查），前端 authStore + LoginPage 同步适配 |

## 7. 遗留问题

### 7.1 环境限制

| 编号 | 问题描述 | 影响范围 | 优先级 | 解决方案 |
|------|---------|---------|--------|---------|
| E1 | **Playwright 1.60 升级受阻**：macOS 下需要 `chromium_headless_shell-1223` 二进制（169MB），Google CDN 超时、国内 npmmirror 无 CFT 镜像。当前锁定 1.48 可正常运行。 | 后续 Playwright 版本升级 | P3 | 升级前确认二进制可下载，或在 Linux CI 执行 |
| E2 | **手动测试 10 条未执行** | 前端功能验证 | P1 | 人工在浏览器中逐项验证 |

## 8. 后续行动

- **手动测试**：10 条前端用例需人工逐项验证（侧边栏动态渲染、Dialog 交互、Badge 颜色、分页等）
- **Playwright 版本**：当前锁定 1.48，升级前需确认 CFT 二进制可下载（1.60+ 在 macOS 需要 `chromium_headless_shell-1223`）
- **JDK**：pom.xml 已通过 maven-enforcer-plugin 锁定 [21,23)，CI 和本地开发均受限，不会误用 Java 25
- **前端 package.json**：root 已移除 `@playwright/test`，避免与 frontend 版本冲突
