# 手机号验证码 Mock 开关

当前体验测试保持 `SMS_MOCK_ENABLED=true`：先点击获取验证码，再输入 `0000`，服务端不发送短信。有效期、获取倒计时、每日次数仍读取后台短信安全策略；验证码成功登录后失效。

正式上线时，在服务器已有的 `/mnt/data/spacetime-prod/secrets/prod.env` 中改为：

```dotenv
SMS_MOCK_ENABLED=false
SMS_PROVIDER=aliyun
```

沿用现有阿里云短信签名、模板及运行环境注入的凭证。通过项目正常后端部署流程，或在 `/mnt/data/spacetime-prod/deploy` 执行 `bash scripts/deploy-prod-local.sh backend` 重建容器，使环境变量生效。只重启原容器不会加载新的环境变量，无须修改或重新编译业务代码。

关闭后生成随机四位验证码，真实短信发送成功才缓存并计入发送频控。只接受真实通道缓存的当前验证码，之前获取的 mock 码不能登录。真实发送失败会提示失败，不回退到固定 0000；错误配置成 MOCK 通道会被拒绝。

本地真实短信测试需同时设置 `SMS_MOCK_ENABLED=false` 与 `SMS_PROVIDER=aliyun`。当前默认值保留联调状态；正式上线必须在运行环境显式关闭此开关。
