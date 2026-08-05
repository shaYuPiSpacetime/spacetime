# 微信登录与支付联调测试报告

## 执行信息

- 执行日期：2026-07-09
- 执行环境：本地后端 `http://localhost:8080`，当前唯一数据库
- 关联迁移：`deploy/sql/prod/036_app_runtime_required_columns.sql`

## 执行结果

| 用例 | 结果 | 证据 |
| --- | --- | --- |
| TC-01 运行字段完整性 | 通过 | 对 `app_user`、`app_user_verification`、`app_vip_package`、`app_coin_package`、`app_user_asset`、`app_trade_order`、`app_user_coin_log` 做字段核对，缺失字段数量 `0` |
| TC-02 手机号 mock 登录 | 通过 | 先 `POST /miniapp/auth/sms-code`，再 `POST /miniapp/auth/phone-login` 返回 `code=200`，包含 token、userId、openid、手机号和准入状态 |
| TC-03 微信登录 fake code | 通过 | fake code 返回 `code=5001`；后端日志为微信 `40029 invalid code`，不是系统异常或密钥未读取 |
| TC-04 VIP 套餐读取 | 通过 | 带 token 请求 `GET /miniapp/vip/packages` 返回 `code=200`，数据库返回 5 条启用套餐 |
| TC-05 千寻币套餐读取 | 通过 | 带 token 请求 `GET /miniapp/coin/packages` 返回 `code=200`，数据库返回启用套餐 |
| TC-06 VIP 支付下单 | 有条件通过 | 请求已走到微信 JSAPI 网关；修正 AppID 后微信返回 `PARAM_ERROR: 无效的openid`，原因是本轮使用手机号 mock 登录生成的非微信真实 openid |
| TC-07 服务单测 | 通过 | `mvn -q -Dtest=PaymentServiceImplTest,AuthMiniappServiceImplTest,AuthMiniappServiceContractTest test` 退出码 `0` |

## 修复确认

- 已补齐微信登录所需 `openid`、`unionid`、`phone`、`phone_hash` 等字段。
- 已补齐资料、认证、语音、相册、标签等实体会读写的字段。
- 已补齐 VIP/千寻币套餐、用户资产、交易订单、支付回调、币流水的运行必需字段。
- 已将后端默认微信 AppID 对齐小程序工程 AppID，避免未显式配置时回退到无关默认值。

## 剩余说明

- 真实微信授权登录必须使用微信开发者工具或真机生成的 `wx.login` code 和授权手机号 code。
- 真实 JSAPI 支付必须使用微信登录得到的真实 openid；手机号 mock 登录不能完成微信支付闭环。

## 2026-08-05 测试环境支付配置回归

### 问题与根因

- 线上容器的 `WECHAT_PAY_MCH_ID`、`WECHAT_PAY_API_V3_KEY`、`WECHAT_PAY_CERT_SERIAL_NO` 为空，创建订单时稳定返回“微信支付配置不完整”。
- 私钥只存在于本机私有目录，生产容器未挂载证书目录。
- 部署脚本写入了 `WECHAT_PAY_FORCE_TEST_AMOUNT` 和 `WECHAT_PAY_TEST_PAY_AMOUNT`，但生产 Spring 配置没有绑定，导致测试环境 `0.01` 元配置失效。

### 本轮结果

| 用例 | 结果 | 证据 |
| --- | --- | --- |
| TC-08 测试金额配置绑定 | 通过 | `application-prod.yml` 已绑定测试开关和测试金额；部署脚本兼容当前及后续镜像 |
| TC-09 测试金额业务口径 | 通过 | `PaymentServiceImplTest` 断言微信网关金额 `0.01`，订单和返回金额保持套餐原价 `19.90` |
| TC-10 微信商户配置部署门禁 | 通过 | 部署脚本在重启前强制校验商户号、API v3 密钥、证书序列号 |
| TC-11 微信私钥部署门禁 | 通过 | 私钥位于服务器私有目录并以只读卷挂载到 `/app/cert`；Git 与镜像均不包含私钥 |
| TC-12 线上容器配置核验 | 通过 | 六项支付配置均为 `SET`，测试金额为 `0.01`，容器内私钥可读，健康检查返回 `code=200` |
| TC-13 真机 0.01 元支付闭环 | 待真机复测 | 需要微信登录用户重新拉起收银台并完成一笔 `0.01` 元支付 |

### 自动化执行

| 命令 | 结果 |
| --- | --- |
| `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=PaymentServiceImplTest test` | 10/10 通过 |
| `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml test` | 497/497 通过，0 失败，0 跳过 |
| `node scripts/test-prod-wechat-pay-config.mjs` | 9/9 通过 |
| `bash -n deploy/scripts/deploy-prod-local.sh` | 通过 |
| `GET https://admin.shikongxiehou.com/api/health` | `code=200` |

### 判定

**当前结论：🟡 有条件通过。** 支付配置、私钥挂载、测试金额和支付成功事务依赖表均已在线验证；剩余唯一门禁为真机完成一笔 `0.01` 元支付并确认会员状态生效。

## 2026-08-05 生产“微信下单异常”复测

### 生产根因证据

- 12:54 至 12:55，用户 123 连续三次创建 VIP 订单，均在 `WechatPayServiceImpl.readConfiguredFile → loadPrivateKey → sign` 失败。
- 当时商户号、AppID、API v3 密钥、证书序列号均已注入，但容器内 `/app/cert/apiclient_key.pem` 不可读；宿主机源文件存在且属主与容器用户一致，证明故障位于 Docker 私钥目录未挂载。
- 支付修复代码此前仍在共享工作区未提交，商业化发布重建容器后覆盖了临时挂载，因而用户再次看到“微信下单异常”。

### 修复与发布

| 项目 | 结果 |
| --- | --- |
| 修复提交 | `b0a28d3 fix(payment): 挂载生产微信支付私钥` |
| GitHub 后端发布 | Actions `30976639166`，build/deploy 均为 success |
| 容器私钥 | `/mnt/data/spacetime-prod/secrets/cert -> /app/cert`，只读挂载，容器用户可读 |
| 测试金额 | `WECHAT_PAY_FORCE_TEST_AMOUNT=true`、`WECHAT_PAY_TEST_PAY_AMOUNT=0.01` |
| 健康检查 | HTTP 200 |

### TC-14 生产预下单结果

- 使用具有真实 openid 的用户 123 创建 10 分钟临时 Redis 会话，调用生产 `POST /api/miniapp/payment/create-order`；调用后临时会话自动删除。
- 热修复后订单 38：HTTP/业务码 200，数据库状态 `unpaid`，业务金额 `568.00`，`prepay_id` 已保存。
- 标准 GitHub 新镜像发布后订单 39：HTTP/业务码 200，返回 `payParams.package=prepay_id=...`、`paySign`、`signType=RSA`。
- 本测试只验证微信统一下单和小程序支付签名参数，不调用 `wx.requestPayment`，没有发生真实扣款。

### 最新判定

**微信预下单：✅ 通过。** 原“微信下单异常”已复现、定位并完成生产修复。完整支付闭环仍保留 TC-13：需要用户在小程序中拉起微信收银台，支付 0.01 元后再确认订单成功和会员生效。
