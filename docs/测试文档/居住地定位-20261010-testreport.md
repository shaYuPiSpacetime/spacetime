# 居住地获取定位测试报告

日期：2026-10-10。依据：同目录 `居住地定位-20261010-testcase.md`。

## 原因与修改

用户确认入口为“你的居住地 → 获取定位”。生产只读审计 [38038953591](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38038953591) 成功：服务器源配置 `source.configured=false`、运行容器 `runtime.configured=false`。同时部署脚本 write_runtime_env 缺少地图配置白名单，即使补到源配置也无法传入容器。

修复部署配置传递、环境模板及发布回归门禁；前端区分微信取坐标失败和城市识别失败，并用同步请求锁阻止连续点击。没有修改用户资料、地区字典或定位鉴权，没有输出任何真实密钥或用户坐标。

## 验证

- DEP-01 红：执行原 write_runtime_env 后，地图 Key 为 undefined，断言失败。修复后同一函数执行通过，验证 Key 及两个超时值。
- DEP-02/03：空配置不生成假 Key，发布门禁及示例空密钥检查通过。
- UI-01 至 UI-04：`node --test miniapp/scripts/test-address-location-city.cjs` 7/7 通过，覆盖省市匹配、手选兜底、失败分类、连点锁和失败后重试。
- `node scripts/validate-prod-deploy-config.mjs` 和 `node scripts/test-prod-tencent-im-config.mjs` 通过。
- OPS-01：生产审计成功，确认缺少地图密钥；未配置时没有请求第三方服务。
- MAN-01：未执行真机定位；尚未提供有效生产地图 Key，不能声称自动定位恢复。

发布构建、部署和小程序上传结果待补记。已请求将 Key 填入服务器私有 prod.env，禁止通过聊天或 Git 传递密钥。
