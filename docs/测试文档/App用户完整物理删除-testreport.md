# App 用户完整物理删除 - 测试报告

> **关联文档**：
>
> - 测试用例：`docs/测试文档/App用户完整物理删除-testcase.md`

---

## 1. 测试概况

| 项目 | 信息 |
| --- | --- |
| 功能名称 | App 用户完整物理删除 |
| 测试环境 | 本地 Java 21；目标环境 L1 尚未执行 |
| 执行日期 | 2026-09-30 |
| 执行人 | Codex |
| 后端版本 | `master / 22dac311` + 当前未提交实现 |
| 前端版本 | 不涉及 |
| 测试策略 | L1 + L2 + 数据库迁移契约 JUnit + Service 回归 |
| 测试模式 | 完整模式 |

## 2. 测试结果汇总

| 层级 | 总数 | 通过 ✅ | 失败 ❌ | 跳过 ⏭️ | 通过率 |
| --- | ---: | ---: | ---: | ---: | ---: |
| L1 接口测试 | 4 | 0 | 0 | 4 | 0% |
| L2 Controller | 2 | 2 | 0 | 0 | 100% |
| JUnit 迁移与 Service 回归 | 36 | 36 | 0 | 0 | 100% |
| L4 E2E | 0 | 0 | 0 | 0 | 不适用 |
| 手动测试 | 0 | 0 | 0 | 0 | 不适用 |
| **合计** | **42** | **38** | **0** | **4** | **90.5%** |

## 3. 测试结论

**判定结果**：🟡 有条件通过

**判定依据**：

- 定向 JUnit 回归 38/38 通过，失败 0、错误 0、跳过 0。
- Java 21 完整打包成功。
- 4 条目标环境 L1 尚未执行，其中包含不可逆删除 P0 用例；生产 L1 需要有效管理员 Token、迁移部署以及删除前身份复核，不能以本地静态测试替代。

## 4. 失败用例明细

无最终失败用例；初始红测按 TDD 预期失败，补齐间接残留校验后已转绿。

## 5. 跳过用例明细

| 用例 ID | 层级 | 优先级 | 场景描述 | 跳过原因 | 是否需要补测 |
| --- | --- | --- | --- | --- | --- |
| G-P3-01 | L1 | P3 | 未登录删除拦截 | 尚未连接目标后端 | 是 |
| F1-P0-01 | L1 | P0 | 删除前身份核验 | 缺少可用目标环境访问与管理员 Token | 是 |
| F1-P0-02 | L1 | P0 | 完整物理删除 | 迁移尚未部署且未完成目标身份复核 | 是 |
| F1-P0-03 | L1 | P0 | 删除后主用户不可查询 | 依赖 F1-P0-02 | 是 |

## 6. 各层级执行详情

### 6.1 L1 接口测试

未执行。安全脚本已经生成，但不会在缺少 `API_URL`、`TOKEN`、`TARGET_USER_ID`、`EXPECTED_NICKNAME` 和显式破坏性开关时执行删除。

### 6.2 L2 Controller 测试

```text
执行命令: cd backend && mvn "-Dtest=AppUserCompleteHardDeleteMigrationTest,AppUserHardDeleteSchemaSqlTest,RelationVisitInboxMigrationTest,AppUserControllerTest,AppUserAdminServiceImplTest" test
执行时间: 15:45
```

`AppUserControllerTest`：2 条通过，0 失败，0 错误，0 跳过。

### 6.3 JUnit 迁移与 Service 回归

同一命令中其余 36 条测试全部通过：

- `AppUserAdminServiceImplTest`：17/17。
- `AppUserCompleteHardDeleteMigrationTest`：6/6。
- `AppUserHardDeleteSchemaSqlTest`：9/9。
- `RelationVisitInboxMigrationTest`：4/4。

构建命令：`cd backend && mvn -DskipTests package`，结果 `BUILD SUCCESS`。

### 6.4 L4 E2E 浏览器测试

不适用。

### 6.5 前端手动测试

不适用。

## 7. 遗留问题

| 编号 | 问题描述 | 影响范围 | 优先级 | 预计处理时间 | 负责人 |
| --- | --- | --- | --- | --- | --- |
| 1 | 迁移 106 尚未在目标数据库执行 | 生产仍使用旧删除过程 | 高 | 获得部署通道后 | 待定 |
| 2 | `U821` 尚未从目标数据库重新核验并执行删除 | 该用户生产数据仍可能存在 | 高 | 获得目标环境访问后 | 待定 |

## 8. 测试建议

- 部署迁移后先只读核验 `U821` 的 ID、昵称和未删除状态，再运行 L1 破坏性用例。
- 删除后除详情接口外，还应在数据库按消息双方、会话双方、TIM 账号和举报证据执行残留统计，结果必须为零。
