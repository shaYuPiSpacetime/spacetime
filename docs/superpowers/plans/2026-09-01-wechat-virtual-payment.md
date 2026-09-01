# 微信小程序虚拟支付 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 VIP 与千寻币套餐从普通 `wx.requestPayment` 迁移为微信小程序 `wx.requestVirtualPayment`，并保留现有订单、会员和千寻币资产账本。

**Architecture:** 每个 VIP/千寻币套餐映射为一个微信虚拟道具，客户端在创建本地订单前刷新 `wx.login` code，服务端校验 openid 后使用 `session_key` 与虚拟支付 AppKey 生成签名。支付结果通过客户端主动确认与服务端定时查单双通道落账，成功后调用微信发货完成接口；原普通支付保留为配置关闭时的兼容路径。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、Jackson、Java HttpClient、Taro 4、React 18、TypeScript、Node test。

## Global Constraints

- 虚拟支付现网配置只从生产私有环境变量读取，不把 OfferId、AppKey、AccessToken、session_key 写入源码或日志。
- VIP 与千寻币均使用 `short_series_goods`，商品 ID 固定为 `vip_<packageId>` 与 `coin_<packageId>`。
- 微信后台必须发布与商品 ID、套餐价格一致的虚拟道具后才能启用 `WECHAT_VIRTUAL_PAY_ENABLED=true`。
- 普通支付兼容路径继续可用，但虚拟支付启用后新订单统一使用 `wechat_virtual` 渠道。
- 支付成功入账必须幂等，客户端回调丢失时由定时查单补偿。

---

### Task 1: 虚拟支付签名与微信开放接口客户端

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/config/WechatVirtualPayProperties.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/WechatVirtualPayParamsVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/WechatVirtualPayService.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/impl/WechatVirtualPayServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/WechatMiniappClient.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/WechatMiniappClientImpl.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/impl/WechatVirtualPayServiceImplTest.java`

**Interfaces:**
- Consumes: 微信 `jscode2session` 的 `openid/session_key`、虚拟支付 `offerId/AppKey`。
- Produces: `createPayParams(...)`、`queryOrder(...)`、`notifyProvideGoods(...)` 与 `isEnabled()`。

- [ ] **Step 1: 写签名与参数构造失败测试**

```java
@Test
void createPayParamsShouldUseExactSignDataForBothHmacSignatures() {
    properties.setEnabled(true);
    properties.setOfferId("offer-1");
    properties.setAppKey("app-key");
    WechatVirtualPayParamsVO result = service.createPayParams(
            "TO12345678", "vip_7", 19800, "session-key");
    assertThat(result.getMode()).isEqualTo("short_series_goods");
    assertThat(result.getSignData()).contains("\"productId\":\"vip_7\"");
    assertThat(result.getPaySig()).hasSize(64);
    assertThat(result.getSignature()).hasSize(64);
}
```

- [ ] **Step 2: 运行测试并确认因类不存在而失败**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=WechatVirtualPayServiceImplTest test`

Expected: FAIL，缺少虚拟支付配置、响应对象或服务实现。

- [ ] **Step 3: 实现最小签名和开放接口客户端**

```java
String signData = objectMapper.writeValueAsString(Map.of(
        "offerId", properties.getOfferId(),
        "buyQuantity", 1,
        "env", properties.getEnv(),
        "currencyType", "CNY",
        "productId", productId,
        "goodsPrice", goodsPriceFen,
        "outTradeNo", orderNo,
        "attach", orderNo));
String paySig = hmacSha256Hex(properties.getAppKey(), "requestVirtualPayment&" + signData);
String signature = hmacSha256Hex(sessionKey, signData);
```

`WechatMiniappClient.SessionInfo` 增加 `sessionKey`，`WechatMiniappClient` 暴露内部服务器调用使用的 `getAccessToken()`；日志禁止打印两者。

- [ ] **Step 4: 运行签名测试并确认通过**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=WechatVirtualPayServiceImplTest test`

Expected: PASS。

### Task 2: 本地订单接入虚拟支付并保持幂等落账

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/CreateOrderReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/CreateOrderVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/PaymentServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/TradeOrderDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/TradeOrderDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/mapper/TradeOrderMapper.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/PaymentServiceImplTest.java`

**Interfaces:**
- Consumes: `CreateOrderReq.loginCode`、Task 1 的虚拟支付服务。
- Produces: `CreateOrderVO.paymentMode=wechat_virtual` 与 `virtualPayParams`。

- [ ] **Step 1: 写虚拟订单创建和确认失败测试**

```java
@Test
void createVipOrderWithVirtualPayShouldVerifyWechatSession() {
    virtualProperties.setEnabled(true);
    req.setLoginCode("fresh-code");
    when(wechatMiniappClient.code2Session("fresh-code"))
            .thenReturn(new SessionInfo("openid_1", null, "session-key"));
    when(virtualPayService.createPayParams(anyString(), eq("vip_1"), eq(1990), eq("session-key")))
            .thenReturn(virtualParams);
    CreateOrderVO result = paymentService.createOrder(1L, req);
    assertThat(result.getPaymentMode()).isEqualTo("wechat_virtual");
    assertThat(result.getVirtualPayParams()).isSameAs(virtualParams);
}
```

另写测试覆盖 openid 不一致拒绝支付、虚拟查单状态 `2/3/4` 仅入账一次、未支付不入账。

- [ ] **Step 2: 运行 PaymentService 测试并确认失败**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=PaymentServiceImplTest test`

Expected: FAIL，响应尚无虚拟支付字段且服务仍调用普通 JSAPI。

- [ ] **Step 3: 实现虚拟支付分支与行锁**

```java
if (virtualPayService.isEnabled()) {
    SessionInfo session = wechatMiniappClient.code2Session(req.getLoginCode());
    if (!user.getOpenid().equals(session.openid())) {
        throw new BusinessException("微信登录身份与当前账号不一致");
    }
    order.setPayChannel("wechat_virtual");
    virtualParams = virtualPayService.createPayParams(
            orderNo, orderType + "_" + packageId,
            payAmount.movePointRight(2).intValueExact(), session.sessionKey());
}
```

确认订单时通过 `SELECT ... FOR UPDATE` 锁定订单；虚拟订单调用 `/xpay/query_order`，状态 `2/3/4` 执行现有 `applySuccessfulPayment`，随后通知发货。普通支付分支保持原行为。

- [ ] **Step 4: 运行 PaymentService 测试并确认通过**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=PaymentServiceImplTest test`

Expected: PASS。

### Task 3: 服务端支付结果补偿

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/job/VirtualPaymentReconcileJob.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/TradeOrderDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/TradeOrderDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/mapper/TradeOrderMapper.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/job/VirtualPaymentReconcileJobTest.java`

**Interfaces:**
- Consumes: 最多 50 条 `wechat_virtual + unpaid` 订单。
- Produces: 每 30 秒调用 `PaymentService.confirmWechatPay(userId, orderId)` 的补偿任务。

- [ ] **Step 1: 写补偿任务失败测试**

```java
@Test
void shouldReconcileEachPendingVirtualOrderWithoutStoppingBatch() {
    when(virtualPayService.isEnabled()).thenReturn(true);
    when(tradeOrderDao.selectPendingVirtualOrders(50)).thenReturn(List.of(first, second));
    doThrow(new BusinessException("temporary")).when(paymentService)
            .confirmWechatPay(first.getUserId(), first.getId());
    job.reconcile();
    verify(paymentService).confirmWechatPay(second.getUserId(), second.getId());
}
```

- [ ] **Step 2: 运行测试并确认任务类不存在**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=VirtualPaymentReconcileJobTest test`

Expected: FAIL。

- [ ] **Step 3: 实现定时补偿与单单隔离**

```java
@Scheduled(fixedDelayString = "${wechat-virtual-pay.reconcile-delay-ms:30000}")
public void reconcile() {
    if (!virtualPayService.isEnabled()) return;
    for (TradeOrder order : tradeOrderDao.selectPendingVirtualOrders(50)) {
        try {
            paymentService.confirmWechatPay(order.getUserId(), order.getId());
        } catch (RuntimeException ex) {
            log.warn("虚拟支付补偿失败: orderNo={}", order.getOrderNo());
        }
    }
}
```

- [ ] **Step 4: 运行补偿测试并确认通过**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=VirtualPaymentReconcileJobTest test`

Expected: PASS。

### Task 4: 小程序调用 `wx.requestVirtualPayment`

**Files:**
- Modify: `miniapp/src/services/payment.ts`
- Modify: `miniapp/src/hooks/useMembership.ts`
- Modify: `miniapp/src/hooks/useCoins.ts`
- Modify: `miniapp/src/domain/paymentFailureFeedback.ts`
- Create: `miniapp/scripts/test-virtual-payment-contract.cjs`
- Modify: `miniapp/package.json`
- Modify: `miniapp/scripts/validate-membership-payment-ui.mjs`

**Interfaces:**
- Consumes: 后端 `paymentMode`、`virtualPayParams`。
- Produces: `requestWechatPayment(order)`，虚拟模式调用原生 `wx.requestVirtualPayment`，普通模式保留 `Taro.requestPayment`。

- [ ] **Step 1: 写小程序支付契约失败测试**

```js
assert.match(paymentService, /Taro\.login\(\)/)
assert.match(paymentService, /requestVirtualPayment/)
assert.match(paymentService, /signData/)
assert.match(paymentService, /paymentMode === 'wechat_virtual'/)
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm --prefix miniapp run test:virtual-payment`

Expected: FAIL，当前仍只有 `Taro.requestPayment`。

- [ ] **Step 3: 实现微信登录刷新与双支付模式分发**

```ts
export async function createOrder(packageId: number, type: PaymentOrderType) {
  const { code } = await Taro.login()
  if (!code) throw new Error('微信登录状态刷新失败，请重试')
  return post<CreateOrderResult>('/miniapp/payment/create-order', {
    packageId,
    orderType: type,
    loginCode: code,
  })
}
```

虚拟模式用回调封装 Promise，并将错误码 `-2` 识别为用户取消；基础库不支持时展示中文升级提示。

- [ ] **Step 4: 运行契约测试和 TypeScript 构建**

Run: `npm --prefix miniapp run test:virtual-payment && npm --prefix miniapp run build:weapp`

Expected: PASS，生成 `miniapp/dist`。

### Task 5: 生产配置、完整验证和发布

**Files:**
- Modify: `backend/src/main/resources/application-prod.yml`
- Modify: `backend/src/main/resources/application-dev.yml.example`
- Modify: `backend/.env.local.example`
- Modify: `deploy/server.prod.env.example`
- Modify: `deploy/scripts/deploy-prod-local.sh`
- Modify: `scripts/test-prod-wechat-pay-config.mjs`

**Interfaces:**
- Consumes: `WECHAT_VIRTUAL_PAY_ENABLED/OFFER_ID/APP_KEY/ENV`。
- Produces: 后端运行时虚拟支付配置；默认关闭，配置完整后显式开启。

- [ ] **Step 1: 扩展生产配置门禁测试并确认失败**

Run: `node scripts/test-prod-wechat-pay-config.mjs`

Expected: FAIL，部署脚本尚未转发虚拟支付配置。

- [ ] **Step 2: 增加配置转发与条件校验**

`WECHAT_VIRTUAL_PAY_ENABLED=true` 时强制校验 `WECHAT_VIRTUAL_PAY_OFFER_ID`、`WECHAT_VIRTUAL_PAY_APP_KEY`；关闭时允许两项为空。运行时环境文件必须转发四项配置但不得输出值。

- [ ] **Step 3: 执行完整验证**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml test`

Run: `npm --prefix miniapp run build:weapp`

Run: `node scripts/test-prod-wechat-pay-config.mjs && node scripts/validate-prod-deploy-config.mjs`

Expected: 全部退出码为 0。

- [ ] **Step 4: 同步、提交、推送并上传小程序**

```bash
git pull --ff-only origin master
git add -A
git commit -m "feat(payment): 接入微信小程序虚拟支付"
git push origin master
```

后端路径推送后由 `spacetime-backend-prod` 工作流部署；小程序以微信开发者工具 CLI 上传 `miniapp/dist`。只有虚拟支付后台已开通、商品已发布且生产私有配置已补齐时，才将该版本提交正式审核。
