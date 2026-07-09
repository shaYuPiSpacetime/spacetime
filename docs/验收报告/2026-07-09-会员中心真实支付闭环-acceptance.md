# 2026-07-09 会员中心真实支付闭环验收记录

## 范围

- 千寻首页中心插画使用用户提供的 `编组@2x.png`，运行资产为 `miniapp/src/assets/lanhu/pages/qianxun-center.png`。
- 会员中心修复底部支付栏遮挡，按会员状态展示「立即开通 / 立即续费 / 重新开通」。
- 我的页 VIP 条未开通态保留蓝湖切图，已开通和已过期态改为状态化组件，避免「立即开通」与会员状态文案重叠。
- 小程序会员和千寻币支付改为真实链路：创建订单、获取微信支付参数、调用 `wx.requestPayment`。
- 后端 `dev` 默认支付金额 `0.01`，`prod` 默认不强制测试金额。

## 关键实现

- 前端支付接口统一到：
  - `GET /miniapp/vip/packages`
  - `GET /miniapp/coin/packages`
  - `POST /miniapp/payment/create-order`
- 小程序请求头改为 `X-Auth-Token`，与后端 `AuthConstant.TOKEN_HEADER` 保持一致。
- 后端新增微信支付配置、JSAPI 下单、支付参数签名、回调解密和幂等入账。
- 微信回调地址 `/miniapp/payment/wechat/notify` 已从 token 拦截器放行。

## 验收命令

```bash
node miniapp/scripts/validate-membership-payment-ui.mjs
node miniapp/scripts/validate-verification-profile-ui.mjs
node miniapp/scripts/validate-profile-guest-ui-coverage.mjs
node miniapp/scripts/validate-commerce-ui-coverage.mjs
JAVA_HOME=/Users/bobo/Library/Java/JavaVirtualMachines/azul-21.0.5/Contents/Home mvn -q -Dtest=PaymentServiceImplTest test
git diff --check -- miniapp/src miniapp/scripts backend/src docs/验收报告 miniapp/docs docs/移动端文档
```

## 结果

- 上述会员支付、认证资料、商业化静态校验和后端支付单测均通过。
- 小程序 Taro watch 已热编译成功，微信开发者工具进程保持打开。
- `npx tsc --noEmit` 仍有项目既有 Taro/依赖类型问题；本轮新增文件相关筛查无报错。
- `validate-main-flow-ui-coverage.mjs` 仍受既有 `自我介绍` manifest 缺少参考资产影响，未作为本轮支付闭环门禁。

## 待真机确认

- `wx.requestPayment` 必须用真实小程序登录态、真实 openid、商户证书和微信支付配置在开发者工具/真机完成最终支付截图。
- 微信支付系统面板不手写，蓝湖 `payState=wechat-pay` 只保留预览态。
