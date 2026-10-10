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

## 发布结果

- 修复源码 `edeeb20f3897624a6f2bc350b314f55ec296ccbf` 已 Push 到 master。完整 `prebuild:weapp` 通过；生产 Taro 构建及 postbuild 通过，87 页注册检查通过，无开发固定登录或 E2E。
- 每次构建前重新 fetch 并同步，上传前远端 master、本地 HEAD 与构建 SHA 一致。
- 独立发布目录 `.runtime/weapp-release-edeeb20f-1791622178346/project`，427 个文件 SHA256 一致；preview/upload 的 15 项包统计逐项一致，主包 1,388,048 字节，总包 2,854,548 字节。
- 体验版 **1.0.20261010.1650** 上传成功。构建、预览、上传日志在 `.runtime/location-20261010/`。
- 后端自动部署 [38039174506](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38039174506) 成功，配置检查、镜像构建和服务器部署均通过。共享部署脚本触发的管理端流水线 [38039174510](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38039174510) 同样成功。
- 部署后只读复核 [38039368350](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38039368350) 成功，服务器源配置及运行容器的 Key 仍均未配置。

尚未闭环：线上自动定位仍缺少有效地图 Key；已请求填入服务器私有 prod.env，禁止通过聊天或 Git 传递密钥。发布成功不代表自动定位已恢复，待补配置后重新部署、确认公共测试坐标解析通过，再做真机验收。

## 后续：用户补回已提供的地图配置

用户再次提供原 Key 并要求继续。通过一次性 RSA-OAEP 加密配置传递，仅在生产服务器私有 prod.env 解密写入；原配置备份保持私有。配置与后端重新部署 [38040333525](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38040333525) 成功。审计确认 source.configured=true、runtime.configured=true、source_matches_runtime=true，服务器环境与容器配置一致；两处公共上海坐标请求均返回 provider_status=121，未解析到城市。任务结束清理临时加密私钥及传递文件，并删除仓库一次性工作流与传递工具。

本地直连腾讯地图也返回 121，原始中文消息为“此key每日调用量已达到上限”。该响应只能确认腾讯在限制此 Key，不能证明本项目曾消耗额度。腾讯[配额说明](https://lbs.qq.com/quotaImprove) 指出账户额度在所有 Key 间分配，需在控制台核对分配给此 Key 的逆地址解析额度和调用统计。控制台当前未登录，需要用户完成协议与验证码步骤；未取得真实账户统计，未宣称属于消耗超限、零配额或共享 Key 中的某一种情况。

本轮仅更新服务器私有配置及一次性运维工具，没有小程序业务源码变化；继续使用已上传的 1.0.20261010.1650。自动定位仍待腾讯侧额度核对和真实解析成功。

## 腾讯额度根因与修复（2026-10-10）

用户在 Codex 内置浏览器完成登录后，读取腾讯控制台账户额度、逆地址解析配额分配明细及当前 Key 最近一天的 WebService 调用统计。账户逆地址解析总额度为 6000 次/日、5 次/秒，全部分配给旧 `bobo` Key；当前 `时空邂逅` Key 为 0 次/日、0 次/秒，最近一天统计显示暂无数据。页面的 100% 表示已分配比例，不是已使用比例。此次 121 的根因为当前 Key 零额度，不能归因为用户调用消耗。

用户明确确认 `bobo` 不再使用并要求全部转移。已通过控制台将 `bobo` 的逆地址解析额度设为 0/0，将 `时空邂逅` 设为 6000 次/日、5 次/秒；两次提交均提示“配置成功”，重新打开分配明细核对两行数值一致。只调整逆地址解析额度，未删除 Key，未修改其他接口配额。

审计输出增加 UTC 检查时间，以区分额度调整前后的服务器请求证据。第一次调整后审计 [38042676476](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38042676476) 中，源配置请求仍返回 121，但随后使用相同运行容器 Key 的请求返回 0，并正确匹配上海市；配置内容一致。为排除额度变更期间结果不一致，增加同一容器 Key 连续三次只读请求复核。此次腾讯侧额度配置不需要重新上传小程序。

最终复核 [38042744641](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38042744641) 成功：北京时间 2026-10-10 17:50:12，source.provider_status=0；线上运行容器连续三次 provider_status 均为 0、fixture_city_matches 均为 true；source_matches_runtime=true。腾讯侧零配额问题已解除，生产服务使用的 Key 可稳定解析公共上海测试坐标。未替代用户真机微信权限、GPS 及返回居住地页面的端到端验收；请在现有 1.0.20261010.1650 体验版重新点击“获取定位”。

额度截图存于本机 `.runtime/location-20261010/quota-transfer-result.jpg`，只截取调用量及并发量列，未包含任何 Key；上行为时空邂逅 6000/5，下行为 bobo 0/0。审计脚本语法检查与 `git diff --check` 通过；本轮没有修改小程序或后端业务代码，不重复构建或发布既有业务包。
