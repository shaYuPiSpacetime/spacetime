# RBAC基础功能 - 测试用例

> **关联文档**：
> - 测试报告：`docs/测试文档/RBAC基础功能-testreport.md`
> **创建日期**：2026-05-12
> **测试模式**：完整模式；2026-07-22 按系统管理缺陷自查要求进入增量模式
> **目标项目**：后端 `backend/` / 前端 `frontend/`

---

## 1. 测试策略决策

### 后端评估

| 维度 | 评估结果 | 得分 |
|------|---------|------|
| A 接口数 | Auth(2)+User(7)+Role(7)+Menu(6)+Router(1) = 23 个 | 2 |
| B 状态流转 | ENABLED/DISABLED，≤3 种 | 1 |
| C 规则逻辑 | BCrypt 校验、权限匹配、树构建，中等 if/else | 1 |
| D 数据关联 | user→user_role→role→role_menu→menu，3-5 表联查 | 1 |
| E 老代码影响 | 修改 AuthServiceImpl 核心登录逻辑 | 2 |
| F 安全变更 | 新增 @RequirePermission + PermissionInterceptor | 1 |
| **总分** | | **8 → L1+L2+L3** |

### 前端评估

| 条件 | 命中 | 说明 |
|------|------|------|
| G 多角色权限 | ✅ | 不同角色菜单不同，侧边栏动态渲染 |
| H 复杂交互 | ✅ | 用户编辑弹窗、分配角色对话框(checkboxList)、分配菜单树对话框 |
| I 多页面联动 | ✅ | 角色绑定菜单→用户分配角色→侧边栏即时变化 |
| J 核心业务页 | ✅ | 用户管理/角色管理/菜单管理均为后台核心页面 |

**最终策略：L1+L2+L3 + 手动+L4**

## 2. 测试数据准备

| 数据需求 | 用途 | 如何准备 | 是否幂等 |
|---------|------|---------|---------|
| 超级管理员 Token | 所有需权限接口的认证 | 通过 POST /admin/login 获取 | 是（每次登录新 Token） |
| 测试用户 ID | 用户管理 CRUD 的测试目标 | 通过创建接口自构建，或从列表查询 | 创建不幂等/查询幂等 |
| 测试角色 ID | 角色绑定菜单、分配给用户 | 通过创建接口自构建 | 创建不幂等/查询幂等 |
| 测试菜单 ID | 角色分配菜单的测试数据 | 通过创建接口自构建 | 创建不幂等/查询幂等 |
| 无权限 Token | P3 权限测试 | 创建无系统管理权限的角色→分配给测试用户→登录获取 Token | 否 |

## 3. L1 - 接口测试用例

> 本章节描述"测什么"，不含 cURL 脚本。可执行脚本由 Step 4 派生到 `docs/测试文档/RBAC基础功能-test-l1.sh`。

### 3.1 登录认证（AuthController）

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|-------|------|------|---------|---------|---------|---------|
| F1-P0-01 | P0 | 正常登录 | `POST /admin/login` | DB 有管理员账号 | 固定值(admin/admin123) | HTTP 200, code=200, data.token 非空, data.permissions 非空数组 | 响应断言 |
| F1-P2-01 | P2 | 用户名不存在 | `POST /admin/login` | — | 无需数据（不存在的账号） | HTTP 200, code=5001, msg 含"用户名或密码错误" | 响应断言 |
| F1-P2-02 | P2 | 密码错误 | `POST /admin/login` | DB 有管理员账号 | 固定值(admin/wrong) | HTTP 200, code=5001, msg 含"用户名或密码错误" | 响应断言 |
| F1-P2-03 | P2 | 账号已禁用 | `POST /admin/login` | DB 有禁用状态账号 | 自动查询→禁用→登录 | HTTP 200, code=5001, msg 含"账号已禁用" | 响应断言 |
| F1-P2-04 | P2 | 缺用户名参数 | `POST /admin/login` | — | 只传 password | HTTP 400 | 响应断言 |
| F1-P2-05 | P2 | 缺密码参数 | `POST /admin/login` | — | 只传 username | HTTP 400 | 响应断言 |
| F1-P0-02 | P0 | 正常退出 | `POST /admin/logout` | 已获取有效 Token | 链式(F1-P0-01 的 token) | HTTP 200, code=200 | 响应断言 |
| F1-P3-01 | P3 | 退出后 Token 失效 | `GET /admin/routers` | 已退出登录 | 链式(F1-P0-02) | HTTP 401 | 重新查询验证 |

### 3.2 用户管理（UserController）

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|-------|------|------|---------|---------|---------|---------|
| F2-P0-01 | P0 | 分页查询用户列表 | `GET /admin/user/list?page=1&size=10` | 有效 Token | 自动查询 | HTTP 200, data.records 为数组, data.total≥0 | 响应断言 |
| F2-P2-01 | P2 | 按关键词搜索 | `GET /admin/user/list?keyword=admin` | 有效 Token | 固定值 | data.records 中所有记录 username 或 nickname 含 "admin" | 响应断言 |
| F2-P2-02 | P2 | 按状态筛选 | `GET /admin/user/list?status=ENABLED` | 有效 Token | 固定值 | data.records 中所有记录 status=ENABLED | 响应断言 |
| F2-P0-02 | P0 | 查询用户详情 | `GET /admin/user/{id}` | 有效 Token, 已知用户 ID | 自动查询(列表首个 ID) | data 含 username/nickname/email/phone/status/roleIds | 响应断言 |
| F2-P2-03 | P2 | 查询不存在的用户 | `GET /admin/user/999999` | 有效 Token | 固定值(无效 ID) | data 为 null 或 code≠200 | 响应断言 |
| F2-P0-03 | P0 | 创建用户 | `POST /admin/user` | 有效 Token, 唯一用户名 | 固定值(自动生成用户名) | HTTP 200, code=200 | 重新查询验证状态 |
| F2-P2-04 | P2 | 用户名重复 | `POST /admin/user` | 已创建同名用户 | 链式(F2-P0-03) | code=5001, msg 含"用户名已存在" | 响应断言 |
| F2-P2-05 | P2 | 缺少必填字段 | `POST /admin/user` | 有效 Token | 仅传 username(缺 password) | HTTP 400 | 响应断言 |
| F2-P0-04 | P0 | 更新用户信息 | `PUT /admin/user/{id}` | 有效 Token, 已知用户 ID | 链式(F2-P0-03 创建的用户 ID) | HTTP 200, code=200 | 重新查询验证状态 |
| F2-P0-05 | P0 | 删除用户 | `DELETE /admin/user/{id}` | 有效 Token, 已知用户 ID | 链式(创建→删除) | HTTP 200, code=200 | 重新查询验证状态 |
| F2-P2-06 | P2 | 删除不存在的用户 | `DELETE /admin/user/999999` | 有效 Token | 固定值(无效 ID) | HTTP 200（逻辑删除幂等） | 响应断言 |
| F2-P0-06 | P0 | 重置用户密码 | `PUT /admin/user/{id}/password` | 有效 Token, 已知用户 ID | 链式(创建→重置密码) | HTTP 200, code=200 | 重新登录验证 |
| F2-P0-07 | P0 | 为用户分配角色 | `PUT /admin/user/{id}/roles` | 有效 Token, 已知用户/角色 ID | 链式(创建角色→创建用户→分配) | HTTP 200, code=200 | 重新查询验证状态 |
| F2-P3-02 | P3 | 未登录调用户列表 | `GET /admin/user/list` | 无 Token | 无需数据 | HTTP 401 | 响应断言 |
| F2-P3-03 | P3 | 无权限调用户列表 | `GET /admin/user/list` | Token 对应无 system:user:list 权限的角色 | 固定值(无权限 Token) | HTTP 403 | 响应断言 |

### 3.3 角色管理（RoleController）

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|-------|------|------|---------|---------|---------|---------|
| F3-P0-01 | P0 | 分页查询角色列表 | `GET /admin/role/list?page=1&size=10` | 有效 Token | 自动查询 | data.records 为数组 | 响应断言 |
| F3-P0-02 | P0 | 查询全部启用角色 | `GET /admin/role/all` | 有效 Token | 自动查询 | data 为数组(仅 ENABLED) | 响应断言 |
| F3-P0-03 | P0 | 查询角色详情 | `GET /admin/role/{id}` | 有效 Token, 已知角色 ID | 自动查询(列表首个 ID) | data 含 roleName/roleCode/menuIds | 响应断言 |
| F3-P0-04 | P0 | 创建角色 | `POST /admin/role` | 有效 Token, 唯一角色编码 | 固定值 | HTTP 200, code=200 | 重新查询验证状态 |
| F3-P2-01 | P2 | 角色编码重复 | `POST /admin/role` | 已创建同编码角色 | 链式(F3-P0-04) | code=5001, msg 含"角色编码已存在" | 响应断言 |
| F3-P0-05 | P0 | 更新角色 | `PUT /admin/role/{id}` | 有效 Token, 已知角色 ID | 链式(F3-P0-04 创建的角色 ID) | HTTP 200, code=200 | 重新查询验证状态 |
| F3-P0-06 | P0 | 删除角色 | `DELETE /admin/role/{id}` | 有效 Token, 已知角色 ID | 链式(创建→删除) | HTTP 200, code=200 | 重新查询验证状态 |
| F3-P0-07 | P0 | 角色绑定菜单 | `PUT /admin/role/{id}/menus` | 有效 Token, 已知角色/菜单 ID | 链式(创建角色→创建菜单→绑定) | HTTP 200, code=200 | 重新查询验证状态 |
| F3-P3-01 | P3 | 未登录调角色接口 | `GET /admin/role/list` | 无 Token | 无需数据 | HTTP 401 | 响应断言 |
| F3-P3-02 | P3 | 无权限调角色接口 | `POST /admin/role` | Token 无 system:role:add 权限 | 固定值(无权限 Token) | HTTP 403 | 响应断言 |

### 3.4 菜单管理（MenuController）

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|-------|------|------|---------|---------|---------|---------|
| F4-P0-01 | P0 | 平铺查询所有菜单 | `GET /admin/menu/list` | 有效 Token | 自动查询 | data 为树形数组 | 响应断言 |
| F4-P0-02 | P0 | 查询菜单树 | `GET /admin/menu/tree` | 有效 Token | 自动查询 | data 为树形数组，每个节点含 children | 响应断言 |
| F4-P0-03 | P0 | 查询菜单详情 | `GET /admin/menu/{id}` | 有效 Token, 已知菜单 ID | 自动查询(列表首个 ID) | data 含 menuName/menuType/path/icon/perms | 响应断言 |
| F4-P0-04 | P0 | 创建目录菜单 | `POST /admin/menu` | 有效 Token | 固定值(menuType=M) | HTTP 200, code=200 | 重新查询验证状态 |
| F4-P0-05 | P0 | 创建页面菜单 | `POST /admin/menu` | 有效 Token, 已知父目录 ID | 链式(F4-P0-04 创建的目录 ID) | HTTP 200, code=200 | 重新查询验证状态 |
| F4-P0-06 | P0 | 创建按钮权限 | `POST /admin/menu` | 有效 Token, 已知父页面 ID | 链式(F4-P0-05 创建的页面 ID) | HTTP 200, code=200 | 重新查询验证状态 |
| F4-P0-07 | P0 | 更新菜单 | `PUT /admin/menu/{id}` | 有效 Token, 已知菜单 ID | 链式 | HTTP 200, code=200 | 重新查询验证状态 |
| F4-P0-08 | P0 | 删除菜单(级联子菜单) | `DELETE /admin/menu/{id}` | 有效 Token, 已知父菜单 ID（有子菜单） | 链式 | HTTP 200, code=200 | 重新查询验证子菜单也被删除 |
| F4-P3-01 | P3 | 无权限调菜单接口 | `POST /admin/menu` | Token 无 system:menu:add 权限 | 固定值(无权限 Token) | HTTP 403 | 响应断言 |

### 3.5 动态路由（RouterController）

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|-------|------|------|---------|---------|---------|---------|
| F5-P0-01 | P0 | 获取当前用户路由树 | `GET /admin/routers` | 有效 Token（已分配角色+菜单） | 自动查询 | data 为数组，仅含 M/C 类型，含 children | 响应断言 |
| F5-P3-01 | P3 | 未登录调路由接口 | `GET /admin/routers` | 无 Token | 无需数据 | HTTP 401 | 响应断言 |
| F5-P2-01 | P2 | 无角色用户的空路由 | `GET /admin/routers` | Token 对应无任何角色的用户 | 固定值(无角色 Token) | data 为空数组 | 响应断言 |

## 4. L2 - Controller 测试用例（按需）

| 用例ID | 测试方法 | 验证点 | 期望 |
|--------|---------|-------|------|
| L2-01 | testLoginSuccess | POST /admin/login 正常流 → Service 返回 LoginVO | status 200, jsonPath $.code=200, $.data.token 存在 |
| L2-02 | testLoginFailWrongPwd | POST /admin/login 错误密码 → Service 抛异常 | status 200, jsonPath $.code=5001 |
| L2-03 | testLogout | POST /admin/logout → Service 调用成功 | status 200, jsonPath $.code=200 |
| L2-04 | testGetRouters | GET /admin/routers → 返回路由树 | status 200, jsonPath $.code=200 |
| L2-05 | testUserListPagination | GET /admin/user/list 参数绑定 | status 200, page/size 正确传入 Service |
| L2-06 | testUserCreateValidation | POST /admin/user 缺 @Valid 字段 | status 400 |
| L2-07 | testUserUpdate | PUT /admin/user/{id} 路径参数+请求体绑定 | status 200 |
| L2-08 | testRoleList | GET /admin/role/list 参数绑定 | status 200 |
| L2-09 | testRoleAll | GET /admin/role/all（需 `system:role:list`） | status 200 |
| L2-10 | testRoleBindMenus | PUT /admin/role/{id}/menus 请求体绑定 | status 200 |
| L2-11 | testMenuList | GET /admin/menu/list | status 200 |
| L2-12 | testMenuTree | GET /admin/menu/tree | status 200 |
| L2-13 | testUnauthorizedAccess | 带 @RequirePermission 的接口无 Token 访问 | status 401 |
| L2-14 | testPermissionDenied | 带 @RequirePermission 的接口用无权限 Token 访问 | status 403 |

> 派生脚本：`backend/src/test/java/com/spacetime/.../XxxControllerTest.java`
> JUnit 版本：5（Spacetime 统一 JUnit 5）

## 5. L3 - Service 单元测试用例（按需）

| 用例ID | 测试方法 | 输入 | 期望输出 |
|--------|---------|------|---------|
| L3-01 | testLoginUserNotFound | username 不存在 | BusinessException(code=5001) |
| L3-02 | testLoginWrongPassword | 正确 username + 错误 password | BusinessException(code=5001) |
| L3-03 | testLoginDisabledUser | status=DISABLED 的用户 | BusinessException("账号已禁用") |
| L3-04 | testLoginSuccess | 正确 username + password | LoginVO(token 非空, permissions 非空) |
| L3-05 | testCreateUserDuplicate | 已存在的 username | BusinessException("用户名已存在") |
| L3-06 | testCreateUserDefaultStatus | status 为 null 的请求 | SysUser.status = CommonStatusEnum.ENABLED.getCode() |
| L3-07 | testCreateRoleDuplicateCode | 已存在的 roleCode | BusinessException("角色编码已存在") |
| L3-08 | testCreateRoleDefaultGroup | roleGroup 为 null | roleGroup = "DEFAULT" |
| L3-09 | testUpdateRoleCodeConflict | roleCode 被其他角色占用 | BusinessException("角色编码已被其他角色使用") |
| L3-10 | testDeleteUserCascade | 有 userRole 关联的 userId | 用户删除 + userRole 关联删除 |
| L3-11 | testDeleteRoleCascade | 有 roleMenu 关联的 roleId | 角色删除 + roleMenu 关联删除 |
| L3-12 | testDeleteMenuCascade | 有子菜单的 parentId | 父菜单+所有子菜单+roleMenu 关联全部删除 |
| L3-13 | testBindMenusOverwrite | roleId + menuIds | 旧关联清除 → 新关联批量插入 |
| L3-14 | testAssignRolesOverwrite | userId + roleIds | 旧关联清除 → 新关联批量插入 |
| L3-15 | testBuildMenuTree | 平铺菜单列表(含父子关系) | 正确树结构，按 menuSort 排序 |
| L3-16 | testBuildRouterTree | 菜单列表(含 M/C 类型) | 仅 M/C 类型，M 含 children |
| L3-17 | testResetPassword | userId + newPassword | 密码 BCrypt 加密后更新 |
| L3-18 | testMenuCreateDefaultStatus | status 为 null | menu.status = CommonStatusEnum.ENABLED.getCode() |

> 派生脚本：`backend/src/test/java/com/spacetime/.../XxxServiceTest.java`

## 6. L4 - E2E 浏览器测试用例（按需）

| 用例ID | 优先级 | 页面 | 操作步骤 | 期望结果 |
|--------|-------|------|---------|---------|
| L4-01 | P0 | 登录页 | 输入 admin/admin123 → 点击登录 | 跳转至 Dashboard，侧边栏可见系统管理菜单 |
| L4-02 | P0 | 登录页 | 输入错误密码 → 点击登录 | 页面显示错误提示（红色文本） |
| L4-03 | P0 | 用户管理 | 侧边栏点击系统管理→用户管理 | 页面显示用户表格，含用户名/昵称/邮箱/状态列 |
| L4-04 | P0 | 用户管理 | 点击新增按钮 → 填写表单 → 确定 | 弹窗关闭，表格刷新显示新用户 |
| L4-05 | P1 | 用户管理 | 点击编辑按钮 → 修改昵称 → 确定 | 表格中对应行昵称更新 |
| L4-06 | P1 | 用户管理 | 点击删除按钮 → 确认删除 | 表格中对应行消失 |
| L4-07 | P1 | 用户管理 | 点击分配角色按钮 → 勾选角色 → 确定 | 操作成功提示 |
| L4-08 | P0 | 角色管理 | 侧边栏点击系统管理→角色管理 | 页面显示角色表格，含角色名/编码/分组/状态列 |
| L4-09 | P1 | 角色管理 | 点击分配菜单按钮 → 勾选/取消勾选菜单树 → 确定 | 操作成功提示 |
| L4-10 | P0 | 菜单管理 | 侧边栏点击系统管理→菜单管理 | 页面显示树形菜单表格，可展开/折叠 |
| L4-11 | P1 | 菜单管理 | 选中某行 → 点击新增子节点 → 填写 → 确定 | 树形表格中新增子节点 |
| L4-12 | P2 | 动态路由 | 用不同角色 Token 登录 | 侧边栏菜单随角色权限变化，只显示有权限的菜单 |
| L4-13 | P2 | 用户管理 | 筛选栏输入关键词→回车 | 表格过滤，只显示匹配的用户 |
| L4-14 | P2 | 用户管理 | 状态下拉选"禁用"→查询 | 表格只显示禁用状态的用户 |

> 派生脚本：`frontend/e2e-tests/RBAC基础功能.spec.ts`
> 前端项目：frontend（React 18 + Tailwind CSS + shadcn/ui）

## 7. 前端手动测试用例

| 用例ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|-------|---------|---------|---------|------|
| M-01 | P0 | 登录→Dashboard→侧边栏显示系统管理→点击展开→显示用户管理/角色管理/菜单管理 | 3 个子菜单均可见 | | |
| M-02 | P1 | 用户管理→新增 Dialog→留空必填项→提交 | 前端表单校验拦截，提示必填 | | |
| M-03 | P1 | 角色管理→分配菜单 Dialog→展开/折叠菜单树→全选/取消全选 | 复选框交互正常 | | |
| M-04 | P1 | 菜单管理→树形表格→展开父节点→子节点缩进显示→折叠 | 展开/折叠动画流畅 | | |
| M-05 | P2 | 各管理页→点击分页→切换每页条数 | 分页交互正常，数据正确刷新 | | |
| M-06 | P2 | Token 过期→访问任何管理页面 | 自动跳转登录页 | | |
| M-07 | P1 | 用户管理→状态列 Badge→ENABLED 绿色/DISABLED 灰色 | 颜色正确 | | |
| M-08 | P1 | 菜单管理→类型列 Badge→目录/菜单/按钮 不同颜色 | 颜色正确区分 | | |
| M-09 | P2 | 快速双击新增按钮 | 不弹出两个 Dialog | | |
| M-10 | P2 | 编辑 Dialog 打开→修改内容→点取消关闭→重新打开 | 表单已重置 | | |

## 8. 补充用例（来自审查报告）

> 本章节记录从 superpowers:requesting-code-review 等审查补充的用例，如无则留空。

| 用例ID | 来源 | 审查级别 | 场景 | 期望结果 |
|--------|------|---------|------|---------|
| G-P3-01 | 权限审查 | P0 | ServiceImpl 不直接注入 Mapper（六层架构） | grep 确认 ServiceImpl 无 Mapper import |
| G-P3-02 | 权限审查 | P0 | Controller 不返回 `R<?>` | grep 确认所有 Controller 返回精确类型 |
| G-P3-03 | 数据审查 | P1 | 实体 status 字段使用 CommonStatusEnum.getCode() | grep 无 "ENABLED"/"DISABLED" 字符串字面量 |

## 9. 2026-07-22 系统管理回归增量

> 本轮针对用户管理、角色管理、菜单管理及其共用分页组件补充自动化覆盖。原用例与编号保持不变。

### 9.1 L1 接口增量

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| F2-P0-08 | P0 | 用户列表每页 20 条 | `GET /admin/user/list?page=1&size=20` | data.size=20 |
| F2-P0-09 | P0 | 用户列表每页 50 条 | `GET /admin/user/list?page=1&size=50` | data.size=50 |
| F3-P0-08 | P0 | 角色列表每页 20 条 | `GET /admin/role/list?page=1&size=20` | data.size=20 |
| F3-P0-09 | P0 | 角色列表每页 50 条 | `GET /admin/role/list?page=1&size=50` | data.size=50 |
| F2-P2-07 | P2 | 用户关键词与状态组合筛选 | `GET /admin/user/list?keyword=x&status=DISABLED` | 关键词匹配用户名/昵称/邮箱，且每条记录均为 DISABLED；状态条件作用于整个关键词 OR 分组 |
| F3-P2-02 | P2 | 按角色编码搜索 | `GET /admin/role/list?keyword=admin` | 返回记录的角色名称或角色编码包含关键词 |
| F4-P1-01 | P1 | 子菜单移动到顶级 | `PUT /admin/menu/{id}`，`parentId=0` | 更新成功，重新查询后该节点位于根层级 |
| F4-P2-01 | P2 | 菜单父级设为自身或后代 | `PUT /admin/menu/{id}` | code=5001，拒绝形成循环层级 |
| F4-P2-02 | P2 | 菜单挂到按钮或不存在父级 | `POST/PUT /admin/menu` | code=5001，不产生不可见孤儿节点 |

### 9.2 L3 Service 增量

| 用例ID | 测试方法 | 输入 | 期望输出 |
|--------|---------|------|---------|
| L3-19 | shouldGroupUserKeywordConditionsAndIncludeEmail | keyword + status | 查询条件包含 username/nickname/email 的 OR 分组，status 在分组之外 AND |
| L3-20 | shouldSearchRoleNameOrCode | roleCode 关键词 | 查询条件同时覆盖 role_name 与 role_code |
| L3-21 | shouldIncludeAncestorMenusWhenBindingChild | 只提交子菜单 ID | 绑定结果自动补齐所有父级菜单 ID，动态路由可达 |
| L3-22 | shouldRejectMenuSelfOrDescendantParent | 更新菜单 parentId=自身/后代 | 抛 BusinessException，不写入循环层级 |
| L3-23 | shouldMoveMenuToRoot | 更新菜单 parentId=0 | 持久化 parentId=0 |

### 9.3 L4 E2E 增量

| 用例ID | 优先级 | 页面 | 操作步骤 | 期望结果 |
|--------|-------|------|---------|---------|
| L4-00 | P0 | 登录页 | 使用外部注入的真实测试账号与密码提交登录 | 跳转至 `/dashboard`，localStorage 存在 token；凭据不写入脚本和报告 |
| L4-15 | P0 | 用户管理 | 从第 2 页切换为 20/50 条每页 | 选择器保持所选值，请求分别携带 size=20/50，并回到第 1 页 |
| L4-16 | P0 | 角色管理 | 从第 2 页切换为 20/50 条每页 | 选择器保持所选值，请求分别携带 size=20/50，并回到第 1 页 |
| L4-17 | P1 | 角色管理 | 打开新增角色并保存 | 默认状态为 ENABLED，请求体不得出现历史错误值 `0` |
| L4-18 | P3 | 用户/角色/菜单管理 | 使用仅有 list 权限的认证状态进入页面 | 无 add/edit/delete 权限的操作按钮不可见，避免必然 403 的入口 |
| L4-19 | P1 | 菜单管理 | 编辑子菜单并选择“顶级（无）”后保存 | 请求体明确提交 parentId=0，节点可移动到根层级 |
| L4-20 | P1 | 菜单管理 | 在较矮浏览器窗口打开编辑菜单弹窗 | 弹窗内容可滚动，底部取消/保存按钮始终可达 |

### 9.4 手动增量

| 用例ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|-------|---------|---------|---------|------|
| M-11 | P1 | 用户、角色列表切到最后一页后删除最后一条记录 | 页码自动回退到有效页，不出现空白死页 | | |
| M-12 | P1 | 角色分配菜单时仅勾选子菜单并保存，再重新打开 | 父级目录自动选中且动态侧边栏可访问该菜单 | | |
| M-13 | P2 | 菜单编辑上级下拉 | 当前节点、后代节点和按钮节点不可选为父级 | | |

### 9.5 权限与安全增量

| 用例ID | 层级 | 场景 | 期望结果 |
|--------|------|------|---------|
| L2-25 | L2 | page=0、size=-1 或非法 status | code=4001，不进入 Service |
| L3-24 | L3 | Token 快照仍有权限，但数据库已撤销 | PermissionInterceptor 立即拒绝，HTTP 403 |
| L3-25 | L3 | 用户或角色被禁用 | 当前权限查询返回空，不再依赖旧 Token 快照 |
| L3-26 | L3 | 禁用父菜单但子菜单仍启用 | 子菜单路由和按钮权限一并失效 |
| L3-27 | L3 | 删除当前登录用户或 `super_admin` 角色/用户 | 抛 BusinessException，核心管理员数据不删除 |
