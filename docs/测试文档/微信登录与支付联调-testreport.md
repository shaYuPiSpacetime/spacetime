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
