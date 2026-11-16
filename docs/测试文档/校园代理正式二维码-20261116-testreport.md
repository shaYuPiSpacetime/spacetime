# 校园代理正式二维码生产发布记录

日期：2026-11-16。用户明确要求校园代理使用正式二维码，并直接发布生产。

## 根因及修改

- 原生产容器未传入 `WECHAT_MINIAPP_CODE_ENV_VERSION`，配置类与 `application-prod.yml` 的默认值均为 `trial`，因此生成的是体验版码。
- 默认值改为 `release`；生产部署脚本固定为正式版并写入容器环境文件。测试环境仍可显式使用体验版。
- 正式码向微信传入 `check_path=true`，要求邀请页面已存在于发布版本；代理令牌与归属保持原样。
- 图片接口本来就使用 `Cache-Control: no-store`，没有持久化图片缓存。后台重新打开二维码窗口会生成正式码；已下载的旧体验码需重新下载替换。

## 验证

| 检查 | 结果 |
| --- | --- |
| 微信小程序码服务、推广管理服务定向测试 | 8 项通过 |
| 部署实际配置段及运行时环境文件验证 | 生产默认正式版、旧体验配置被纠正、测试环境显式体验版均通过 |
| 生产部署配置与现有支付配置检查 | 通过 |
| 后端打包及发布文件 SHA-256 核对 | 通过 |
| 微信正式码及已发布页面校验 | HTTP 200，返回有效图片 |
| 生产后台二维码图片接口、健康检查 | HTTP 200 |
| 代理归属及图片缓存头 | 归属未变，`no-store` |

正式码默认值回归用例已在旧代码复现失败（预期 `release`、实际 `trial`），修复后通过。新增部署配置检查已加入生产后端流水线。

定向命令：

```bash
JAVA_HOME=/Users/bobo/Library/Java/JavaVirtualMachines/azul-21.0.5/Contents/Home \
mvn -q -f backend/pom.xml -Dtest=WechatMiniappCodeServiceImplTest,PromotionAdminServiceImplTest test
node scripts/test-prod-miniapp-code-config.mjs
node scripts/validate-prod-deploy-config.mjs
node scripts/test-prod-wechat-pay-config.mjs
bash -n deploy/scripts/deploy-prod-local.sh
```

## 生产结果

- 发布提交：`0e7311ebe7fe662751ed59579fbfb2c702fe0761`。
- 生产服务器：`47.117.142.161`，采用直接上传构建包并替换后端容器。
- 代理：`AGT-2122232214239916032`（测试）。
- 目标版本：`release`；页面：`pages/promotion/invite-home`。微信已验证该页面存在于正式版。
- 后端文件 SHA-256：`dec6a6b8c811fec02427b17d40a4bf4a98e9fdfac880b5b43673e3b268445efe`。
- 正式码文件 SHA-256：`89ab5b8d6876908a4c02f165d2c7d71598a5068e43b568d8da0acdfb3730a7e0`。
- 原容器与配置已保留用于回滚；无数据库结构变更、迁移或测试发奖。只读确认生产资产表已有用户唯一索引。
- 当前后端包含此前 `5f47f7a8` 的导入用户奖励修复；此前 57 项资产/导入定向测试结果仍适用，未通过真实发奖改动生产余额。
- 没有修改或切换小程序正式版本。正式码进入微信当前已发布的小程序。

第一次发布核验错误地要求两次微信生成图片的字节完全一致，触发自动回滚。对相同场景、页面、版本及参数再次请求，证实微信返回图片字节会变化；改为核对正式版配置、部署文件哈希、微信已发布页面校验、代理归属和真实图片响应后，第二次发布通过。没有使用文件字节差异判断二维码业务内容不同。

## 证据与边界

- 本地原始日志与正式码：`.runtime/agent-qr-release-20261116/`。
- 服务器备份与回执：`/mnt/data/spacetime-prod/backups/agent-qr-release-20261116/`。
- 仅复用现有管理员会话验证该代理接口，不修改账号、角色或权限；不在日志、文档中记录凭据。
- 本次验证实际微信生成接口、生产后台取码及归属保持；未代替用户进行微信手机扫码验收。
