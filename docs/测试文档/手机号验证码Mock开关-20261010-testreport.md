# 手机号验证码 Mock 开关 - 测试报告

执行日期：2026-10-10。关联用例：`手机号验证码Mock开关-20261010-testcase.md`。基线：master `0128f209`。

## 修改与验证

`SMS_MOCK_ENABLED=true` 维持固定 0000、不发短信；false 使用已配置真实 Provider 生成安全随机四位码，发送成功才缓存及计发送频控。真实与 mock 缓存隔离，旧固定码不能在关闭 mock 后登录。真实发送失败或通道仍配置 MOCK 时明确拒绝，不回退到固定码。

| 检查 | 结果 |
|---|---|
| AuthMiniappServiceImplTest | 24/24 通过，新增 8 个真实模式、失败及隔离场景 |
| SmsCodeProviderTest | 2/2 通过 |
| AliyunSmsCodeProviderTest | 3/3 通过，模拟第三方发送与失败 |
| SmsProviderConfigurationTest | 3/3 通过 |
| 生产配置门禁 | 通过，包含环境模板、Spring 属性及运行环境写入链路 |
| 部署 Bash 语法 | 通过，验证 LF 规范化脚本，未执行部署入口 |
| 运行环境传递 | true 与 false 均正确写入隔离的临时 env 文件 |
| 部署开关校验 | 5 个组合通过：true+aliyun、false+aliyun、true+mock 接受；false+mock、非法布尔值拒绝 |

Java 21：`mvn -Dtest=AuthMiniappServiceImplTest,SmsCodeProviderTest,AliyunSmsCodeProviderTest,SmsProviderConfigurationTest test`。配置门禁：`node scripts/validate-prod-deploy-config.mjs`。动态部署配置验证仅提取并执行环境写入/校验函数片段，使用无凭证的临时环境，没有调用 Docker 或访问服务器。

## 交付

代码已提交并 Push 到 master：`f01a136f90c80b02bf39c5109dce33647b171cdc`。对应 [后端部署 38015326341](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38015326341) 与 [管理端部署 38015326342](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38015326342) 均 success，head SHA 均为本次提交。当前联调开关保持 true，本次未在生产切换真实短信。

发布流程当次重新 fetch、同步 origin/master，从当前源码构建并通过 87 页注册、无开发 Token 与包体门禁；上传前再次核对远端 SHA。微信 CLI 上传体验版 `1.0.20261010.1002`，`√ upload` 与 JSON 回执一致，总包 2,615,278 字节。

部署后执行 L1 脚本：账号 173****9764 返回 FIXED Provider，0000 登录现有账号成功，随后同一码重试返回 AUTH_SMS_INVALID。未发送真实短信，未打印登录 Token。32 项单元测试、部署配置校验与当前模式线上烟测均通过。

上线操作：运行环境设置 `SMS_MOCK_ENABLED=false`，沿用 `SMS_PROVIDER=aliyun` 与现有凭证，按正常流程重建后端容器。详见 `docs/流程规范/手机号验证码Mock开关.md`。

## 范围

未修改登录页面，无数据库迁移。当前 mock 模式已在线上验证；真实短信对外发送在本次未执行，由模拟阿里云客户端和真实模式单元测试覆盖。没有打印或保存登录 Token、验证码请求正文或凭证。
