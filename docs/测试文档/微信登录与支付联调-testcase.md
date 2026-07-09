# 微信登录与支付联调测试用例

## 测试范围

- 小程序手机号登录兜底链路。
- 微信授权登录错误码兜底链路。
- 小程序 VIP/千寻币套餐读取。
- VIP 支付下单到微信 JSAPI 网关链路。
- 数据库运行必需字段完整性。

## 前置条件

- 本地后端监听 `http://localhost:8080`。
- 本地数据库已执行 `deploy/sql/prod/036_app_runtime_required_columns.sql`。
- 本地私有环境变量已配置数据库、Redis、微信小程序密钥和微信支付商户参数。
- 手机号登录使用开发 mock 验证码 `000000`。

## 用例

| 编号 | 场景 | 操作 | 预期 |
| --- | --- | --- | --- |
| TC-01 | 运行字段完整性 | 查询 `information_schema.columns` 对照实体字段清单 | `app_user`、`app_user_verification`、商业化支付表缺失字段数为 0 |
| TC-02 | 手机号 mock 登录 | `POST /miniapp/auth/phone-login` | 返回 `code=200`，有 token、userId、openid、手机号、准入状态 |
| TC-03 | 微信登录 fake code | `POST /miniapp/auth/wechat-login` 使用非微信真实 code | 返回业务失败，不出现系统异常或配置缺失 |
| TC-04 | VIP 套餐读取 | 带 token 请求 `GET /miniapp/vip/packages` | 返回 `code=200` 且有数据库套餐数据 |
| TC-05 | 千寻币套餐读取 | 带 token 请求 `GET /miniapp/coin/packages` | 返回 `code=200` 且有数据库套餐数据 |
| TC-06 | VIP 支付下单 | 带手机号登录 token 请求 `POST /miniapp/payment/create-order` | 请求走到微信 JSAPI；由于 mock openid 非真实微信 openid，微信侧返回业务拒绝，不出现数据库缺字段或系统异常 |
| TC-07 | 服务单测 | 执行 `PaymentServiceImplTest,AuthMiniappServiceImplTest,AuthMiniappServiceContractTest` | Maven 测试退出码为 0 |
