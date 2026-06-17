# 推广裂变与邀请奖励 - 测试报告

> **关联文档**：
> - 测试用例：`docs/测试文档/推广裂变-testcase.md`
> - L1 脚本：`docs/测试文档/推广裂变-test-l1.sh`

---

## 1. 测试概况

| 项目 | 信息 |
|------|------|
| 功能名称 | 推广裂变与邀请奖励 |
| 测试环境 | 前端 `http://127.0.0.1:5173`；后端 `http://127.0.0.1:8080` |
| 执行日期 | 2026-06-17 |
| 执行人 | Codex |
| 后端版本 | `master` / `2d09e7a` |
| 前端版本 | `master` / `2d09e7a` |
| 测试策略 | L1 + L2 + L3 + L4 + 前端构建 |
| 测试模式 | 完整模式，补齐低权限账号、数据库夹具和自动化映射后复测 |

## 2. 测试结果汇总

| 层级 | testcase/脚本总数 | 通过 | 失败 | 跳过/未覆盖 | 通过率 |
|------|----------------|------|------|-------------|--------|
| L1 接口测试 | 43 | 38 | 0 | 5 | 88.4% |
| L2 Controller | 20 | 20 | 0 | 0 | 100% |
| L3 Service | 41 | 36 | 0 | 5 | 87.8% |
| L4 E2E | 10 | 9 | 0 | 1 | 90.0% |
| 前端手动测试 | 13 | 0 | 0 | 13 | 0.0% |
| **合计** | **127** | **103** | **0** | **24** | **81.1%** |

补充验证：`frontend npm run build` 通过。

## 3. 测试结论

**判定结果**：🟡 有条件通过

**判定依据**：
- 已执行用例无失败：L1 可执行部分 38/38 通过；推广相关 JUnit/MockMvc 56/56 通过，1 条 seed 条件测试跳过；Playwright Chromium 9/9 通过；前端构建通过。
- 已解决：低权限账号通过后台页面创建并绑定角色；远端 MySQL 夹具通过 `PromotionFixtureTool` 生成；L2/L3/L4 自动化映射已显著补齐。
- 仍有跳过：按本轮要求 `MINIAPP_TOKEN` 相关小程序登录态用例先跳过；前端手动验收未执行；L4 错误/空态仍未自动化。

## 4. 失败用例明细

无。

## 5. 跳过用例明细

| 范围 | 数量 | 跳过原因 | 是否需要补测 |
|------|------|----------|--------------|
| L1 小程序登录态接口 | 5 | 按本轮要求暂不处理 `MINIAPP_TOKEN`，跳过邀请首页、规则、记录、二维码、绑定等登录态接口 | 是 |
| L3 Service | 5 | 导出中心、部分支付/风控外部链路、完整审计查询仍未补成自动化 | 是 |
| L4 E2E | 1 | 错误/空态 500 mock 未自动化；多角色本次覆盖接口权限拦截，按钮显隐仍是前端遗留 | 是 |
| 手动测试 | 13 | 本次未执行人工验收表；其中导出类用例按 testcase 标注首版跳过 | 是 |

## 6. 各层级执行详情

### 6.1 L1 接口测试

```bash
set -a; source frontend/e2e-tests/.env; set +a
TOKEN=$(curl -sS -X POST "$API_URL/admin/login" -H 'Content-Type: application/json' -d '{"account":"peter","password":"******"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
export TOKEN
bash docs/测试文档/推广裂变-test-l1.sh
```

执行结果：总计 43 / 通过 38 / 失败 0 / 跳过 5。

通过重点：
- 后台规则聚合读取、普通奖励配置、代理奖金规则、风控参数保存均通过。
- 邀请关系、奖励流水、冻结队列、代理列表/详情、素材列表/重生成、结算列表均通过。
- 低权限账号对风控保存、新增代理、标记 paid 均按预期返回 HTTP 403。
- 数据库夹具覆盖代理二维码、冻结奖励、冻结关系、待确认/已确认/已发放结算单。
- 未登录接口按预期返回 HTTP 401。

### 6.2 L2/L3 后端测试

```bash
cd backend
JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test -Dtest='Promotion*Test'
```

执行结果：Tests run: 57, Failures: 0, Errors: 0, Skipped: 1。

说明：
- 补充了正式版 `PromotionRuleConfigControllerTest`、`PromotionInviteAdminControllerTest`、`PromotionRewardControllerTest`、`PromotionMaterialControllerTest`。
- 补充了 `PromotionInviteAdminServiceImplTest` 和 `PromotionAgentStatServiceImplTest`，覆盖冻结/无效联动、代理统计初始化与重算。
- 1 条 `PromotionInviteSeedDataTest` 因未设置 `seed.promotion.invite=true` 正常跳过。

### 6.3 L4 Playwright Chromium

```bash
cd frontend/e2e-tests
set -a; source .env; set +a
npx playwright test tests/promotion.spec.ts --project=chromium
```

执行结果：9 passed。

通过用例：
- L4-01 推广规则配置页面加载
- L4-02 新增规则 Dialog 交互
- L4-03 邀请关系页面筛选区和表格加载
- L4-04 奖励审核页面加载
- L4-05 校园代理新增 Dialog 交互
- L4-06 代理结算页面不提供人工生成入口
- L4-07 推广素材与二维码页面加载
- L4-08 代理详情页面展示统计与素材区域
- L4-09 低权限角色写接口被拦截

说明：第一次在普通沙箱中 Chromium 启动 SIGTRAP，提升权限重跑后通过。

### 6.4 前端构建

```bash
cd frontend && npm run build
```

执行结果：通过。

## 7. 遗留问题

| 编号 | 问题描述 | 影响范围 | 优先级 | 后续处理 |
|------|----------|----------|--------|----------|
| 1 | 按要求暂未处理 `MINIAPP_TOKEN` | 小程序推广 L1、绑定关系、二维码、记录页 | 高 | 后续提供或创建小程序测试用户后补测 |
| 2 | 推广页面按钮未按权限显隐控制，当前主要依赖接口 403 | L4 多角色 UI 显隐 | 中 | 前端接入 `usePermission` 后补测按钮显隐矩阵 |
| 3 | 错误/空态 500 mock 未自动化 | L4 错误态 | 中 | 增加 Playwright route mock 覆盖空数据/接口 500 |
| 4 | 导出中心、部分外部风控/支付链路未自动化 | L3/L4 后续集成 | 中 | 待导出中心和外部链路测试桩稳定后补齐 |

## 8. 测试建议

- 继续使用 `docs/测试文档/PromotionFixtureTool.java` 生成推广 L1 夹具；工具读取 `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`，不内置密码。
- 低权限后台账号已通过页面创建：`promotion_low`，绑定角色 `promotion_l1_test`；后续可直接登录获取 `LOW_PRIV_TOKEN`。
- 下一轮优先补 `MINIAPP_TOKEN` 和前端权限按钮显隐。
