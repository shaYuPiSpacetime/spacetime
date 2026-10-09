# 手机号固定验证码 - 测试报告

- 日期：2026-10-09
- 用例来源：`手机号固定验证码-testcase.md`
- 代码基线：`d4bfaf8f`，本次固定验证码改动。
- 结论：本地后端验证通过；线上生效需等待自动部署完成。

## 执行结果

| 验证 | 结果 |
|------|------|
| AuthMiniappServiceImplTest | 16 项通过 |
| MiniappPrd01ConfigServiceTest | 1 项通过 |
| SmsCodeProviderTest | 2 项通过 |
| AliyunSmsCodeProviderTest | 3 项通过 |
| SmsProviderConfigurationTest | 3 项通过 |
| 阿里云短信静态闭环 | 通过 |
| git diff --check | 通过 |
| 线上获取验证码（L1-01） | 待自动部署后核对，不提前声称生效 |

```bash
cd backend
JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test -Dtest=AuthMiniappServiceImplTest,MiniappPrd01ConfigServiceTest,SmsCodeProviderTest,AliyunSmsCodeProviderTest,SmsProviderConfigurationTest
```

共 25 项，失败 0，错误 0，跳过 0。固定码成功登录、错误码、缺失/过期缓存、旧随机码、一次性消费及失败保留验证码均有覆盖。

## 小程序交付限制

`npm run build:weapp` 的前置 `test:0901-document-fixes` 为 12/15，通过前一组 `test:0909-user-experience` 的 3 项测试。
失败为本人动态菜单、悄悄话全局弹窗、热门动态滚动恢复，均为本次修改前已存在的问题，本次无小程序源码改动。
继续直接调用 Taro 编译当前源码，并执行 `postbuild:weapp` 的页面注册、开发登录产物、包体门禁；不将直接编译描述为全量门禁通过。

实际结果：`npx taro build --type weapp` 成功；`npm run postbuild:weapp` 全部通过，87 个页面注册正确，无开发 Token，主包 1.48 MiB，总包 2.59 MiB。

本次仅修改小程序手机号登录服务，官网短信 Provider 仍按原配置工作。
