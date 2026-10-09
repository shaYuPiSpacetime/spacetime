# App用户手机号搜索 - 测试用例

> **关联报告**：`docs/测试文档/App用户手机号搜索-testreport.md`
>
> **创建日期**：2026-10-09
>
> **测试模式**：轻量模式
>
> **目标项目**：后端 `backend/`

## 1. 测试策略

本次仅修改 App 用户列表 Service 的关键词查询条件，不新增接口、前端交互或状态流转。根据用户“其他不要扩散”的限定，只执行直接验证 SQL 查询条件的 L3 单元测试。

## 2. 测试数据

| 数据 | 用途 | 来源 | 是否幂等 |
|------|------|------|----------|
| `15821262446` | 触发完整手机号关键词查询 | 用户提供，仅用于 SQL 构造断言 | 是 |

## 3. L3 - Service 单元测试

| 用例ID | 测试方法 | 输入 | 期望输出 |
|--------|----------|------|----------|
| L3-P1-01 | `shouldSearchUserPhoneFromAppUserTable` | `keyword=15821262446` | App 用户列表 SQL 包含主表 `phone LIKE` 条件 |

> 派生测试：`backend/src/test/java/com/spacetime/admin/service/AppUserAdminServiceImplTest.java`

## 4. 非本次范围

- 不修改手机号回显逻辑。
- 不修改审核表 `bound_phone` 的既有搜索。
- 不修改前端筛选、错误提示或其他用户模块。
