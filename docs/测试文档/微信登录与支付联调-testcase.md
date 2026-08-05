# 微信登录与支付联调测试用例

## 测试范围

- 小程序手机号登录兜底链路。
- 微信授权登录错误码兜底链路。
- 小程序 VIP/千寻币套餐读取。
- VIP 支付下单到微信 JSAPI 网关链路。
- 测试环境微信实际扣款金额固定为 `0.01` 元，订单业务金额保持套餐原价。
- 生产部署前校验微信商户配置，并只读挂载服务器私有证书目录。
- 数据库运行必需字段完整性。

## 前置条件

- 本地后端监听 `http://localhost:8080`。
- 本地数据库已执行 `deploy/sql/prod/036_app_runtime_required_columns.sql`。
- 本地私有环境变量已配置数据库、Redis、微信小程序密钥和微信支付商户参数。
- 手机号登录必须先调用 `/miniapp/auth/sms-code`；开发 mock Provider 会写入验证码 `000000`。

## 用例

| 编号 | 场景 | 操作 | 预期 |
| --- | --- | --- | --- |
| TC-01 | 运行字段完整性 | 查询 `information_schema.columns` 对照实体字段清单 | `app_user`、`app_user_verification`、商业化支付表缺失字段数为 0 |
| TC-02 | 手机号 mock 登录 | 先 `POST /miniapp/auth/sms-code`，再 `POST /miniapp/auth/phone-login` | 返回 `code=200`，有 token、userId、openid、手机号、准入状态 |
| TC-03 | 微信登录 fake code | `POST /miniapp/auth/wechat-login` 使用非微信真实 code | 返回业务失败，不出现系统异常或配置缺失 |
| TC-04 | VIP 套餐读取 | 带 token 请求 `GET /miniapp/vip/packages` | 返回 `code=200` 且有数据库套餐数据 |
| TC-05 | 千寻币套餐读取 | 带 token 请求 `GET /miniapp/coin/packages` | 返回 `code=200` 且有数据库套餐数据 |
| TC-06 | VIP 支付下单 | 带手机号登录 token 请求 `POST /miniapp/payment/create-order` | 请求走到微信 JSAPI；由于 mock openid 非真实微信 openid，微信侧返回业务拒绝，不出现数据库缺字段或系统异常 |
| TC-07 | 服务单测 | 执行 `PaymentServiceImplTest,AuthMiniappServiceImplTest,AuthMiniappServiceContractTest` | Maven 测试退出码为 0 |
| TC-08 | 测试金额配置绑定 | 检查 `application-prod.yml` 对部署环境变量的绑定 | `WECHAT_PAY_FORCE_TEST_AMOUNT=true` 时微信网关金额使用 `WECHAT_PAY_TEST_PAY_AMOUNT=0.01` |
| TC-09 | 测试金额业务口径 | 创建原价 `19.90` 元的 VIP 测试订单 | 微信下单参数为 `0.01` 元，订单与返回值仍为 `19.90` 元 |
| TC-10 | 微信商户配置部署门禁 | 模拟部署配置缺少商户号、API v3 密钥或证书序列号 | 发布脚本在重启容器前失败，不发布“缺少微信配置”的版本 |
| TC-11 | 微信私钥部署门禁 | 模拟服务器私钥缺失并检查容器启动参数 | 发布脚本在重启前失败；私钥通过服务器私有目录只读挂载，不进入 Git 或镜像 |
| TC-12 | 线上容器配置核验 | 只检查线上容器配置项是否为 SET，并检查私钥文件可读 | 微信支付必需配置全部为 SET，`/app/cert/apiclient_key.pem` 可读 |
| TC-13 | 真机 0.01 元支付闭环 | 微信登录用户选择 VIP 套餐并完成支付 | 微信收银台金额为 `0.01` 元，支付后订单成功、会员状态生效，不停留在“支付结果确认中” |
