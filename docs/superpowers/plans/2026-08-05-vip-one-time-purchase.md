# VIP 套餐一次性购买 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 彻底停用连续订阅配置，所有 VIP 套餐固定为普通套餐并通过微信 JSAPI 一次性购买。

**Architecture:** 保留数据库兼容字段以兼容历史版本与订单读取，但在两个管理端保存入口统一施加 `packageType=normal`、`subscriptionType=once` 业务不变量。生产迁移负责归一化存量套餐并清除连续订阅专属商品与协议字段；小程序仅保留一次性购买、再次购买和购买记录入口。

**Tech Stack:** React 18、TypeScript、Taro 4、Java 21、Spring Boot 3.4、JUnit 5、Mockito、Playwright、MySQL 8。

## Global Constraints

- 会员套餐类型固定为 `normal`，购买方式固定为 `once`。
- 禁止创建、更新或聚合保存 `continuous/month/quarter/year` 套餐。
- 微信支付继续使用现有 JSAPI 单次下单，不新增代扣、签约或自动续费能力。
- 历史订单继续可读；不删除兼容字段，不改变既有订单主键或套餐主键。
- 不修改用户已有的 `bobo-todo.md`。

---

### Task 1: 后端套餐购买方式不变量

**Files:**
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/CommercialAdminServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/VipPackageAdminServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/admin/service/CommercialAdminServiceImplTest.java`
- Test: `backend/src/test/java/com/spacetime/admin/service/VipPackageAdminServiceImplTest.java`

**Interfaces:**
- Consumes: `VipPackageSaveReq.packageType`、`VipPackageSaveReq.subscriptionType`
- Produces: 仅接受 `normal/once` 的管理端保存行为

- [ ] **Step 1: 写失败测试**

```java
assertThatThrownBy(() -> service.saveConfig(requestWith("continuous", "month")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("一次性购买");
```

- [ ] **Step 2: 运行测试确认因现有代码接受连续订阅而失败**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=CommercialAdminServiceImplTest,VipPackageAdminServiceImplTest test`

Expected: 新增的连续订阅拒绝用例失败。

- [ ] **Step 3: 最小实现固定业务规则**

```java
if (!"normal".equals(req.getPackageType()) || !"once".equals(req.getSubscriptionType())) {
    throw new BusinessException("会员套餐仅支持普通套餐和一次性购买");
}
```

- [ ] **Step 4: 运行定向测试确认通过**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=CommercialAdminServiceImplTest,VipPackageAdminServiceImplTest test`

Expected: 全部通过，0 failures，0 errors。

### Task 2: 管理后台固定展示与提交

**Files:**
- Modify: `frontend/src/pages/commercial/CommercialManagement.tsx`
- Modify: `frontend/src/pages/config/VipPackageManagement.tsx`
- Modify: `frontend/src/api/vip.ts`
- Test: `frontend/e2e-tests/tests/commercial-database-closure.spec.ts`

**Interfaces:**
- Consumes: `GET /admin/commercial/config`
- Produces: `PUT /admin/commercial/config` 中每个 VIP 套餐均为 `normal/once`，连续订阅专属字段为空

- [ ] **Step 1: 写失败的 Playwright 用例**

```ts
await expect(page.getByText('连续订阅套餐')).toHaveCount(0)
await expect(modal.getByLabel('套餐类型')).toHaveValue('普通套餐')
await expect(modal.getByLabel('购买方式')).toHaveValue('一次性购买')
```

- [ ] **Step 2: 运行用例确认旧页面仍展示连续订阅选项**

Run: `npm --prefix frontend/e2e-tests test -- commercial-database-closure.spec.ts`

Expected: 新增用例失败，命中旧的连续订阅文案或控件。

- [ ] **Step 3: 修改列表、弹窗和保存载荷**

```ts
onSubmit({
  ...form,
  packageType: 'normal',
  subscriptionType: 'once',
  wechatProductId: undefined,
  agreementConfig: undefined,
})
```

- [ ] **Step 4: 运行 Playwright 与前端构建**

Run: `npm --prefix frontend/e2e-tests test -- commercial-database-closure.spec.ts`

Run: `npm --prefix frontend run build`

Expected: E2E 全部通过，TypeScript 与 Vite 构建成功。

### Task 3: 小程序退役连续订阅入口

**Files:**
- Modify: `miniapp/src/pages/membership/index.tsx`
- Modify: `miniapp/src/app.config.ts`
- Delete: `miniapp/src/pages/membership/subscription.tsx`
- Delete: `miniapp/src/pages/membership/subscription.config.ts`
- Test: `miniapp/scripts/validate-membership-payment-ui.mjs`

**Interfaces:**
- Consumes: 现有会员套餐和一次性微信支付接口
- Produces: 无自动续费管理路由、无连续订阅协议，会员到期前后均通过单次再次购买延长有效期

- [ ] **Step 1: 扩展静态门禁并确认失败**

```js
assert.ok(!appConfig.includes("'subscription'"), '会员分包不得注册连续订阅管理页')
assert.ok(!membershipPage.includes('连续订阅会员服务协议'), '购买页不得展示连续订阅协议')
```

- [ ] **Step 2: 移除入口、路由和连续订阅页面**

```tsx
if (memberStatus === 'active') return '再次购买'
```

- [ ] **Step 3: 运行小程序门禁与正式构建**

Run: `node miniapp/scripts/validate-membership-payment-ui.mjs`

Run: `npm --prefix miniapp run build:weapp`

Expected: 静态门禁和微信小程序构建全部通过。

### Task 4: 历史数据归一化与交付验证

**Files:**
- Create: `deploy/sql/prod/064_vip_packages_one_time_purchase.sql`
- Modify: `backend/docs/sql/schema-commercial.sql`
- Modify: `docs/测试文档/商业化后台数据库闭环-testcase.md`
- Modify: `docs/测试文档/商业化后台数据库闭环-testreport.md`

**Interfaces:**
- Consumes: `app_vip_package` 存量数据
- Produces: 所有未删除套餐 `package_type='normal'`、`subscription_type='once'`，连续订阅商品与协议字段为空

- [ ] **Step 1: 新增幂等生产迁移**

```sql
UPDATE app_vip_package
   SET package_type = 'normal', subscription_type = 'once',
       wechat_product_id = NULL, agreement_config = NULL,
       update_time = CURRENT_TIMESTAMP
 WHERE deleted = 0;
```

- [ ] **Step 2: 执行后端全量与静态校验**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml test`

Run: `rg -n '连续订阅套餐|每月自动续费|每季自动续费|每年自动续费' frontend/src miniapp/src --glob '!**/data/lanhuDemo.json'`

Expected: 后端测试 0 failures/0 errors；生产可达页面无连续订阅文案。

- [ ] **Step 3: 更新测试用例与报告**

记录后端、管理后台、小程序、SQL 静态核验及未执行的真实接口/生产数据库项目，不编造 Token 或执行结果。

- [ ] **Step 4: 提交、推送并按既有生产流程执行迁移**

Run: `git push origin master`

Expected: 远端 `master` 与本地提交一致；生产迁移输出显示 `064_vip_packages_one_time_purchase.sql` 执行成功。
