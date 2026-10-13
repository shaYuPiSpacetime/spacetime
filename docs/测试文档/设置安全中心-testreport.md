# 设置安全中心 - 测试报告

依据：`设置安全中心-testcase.md`。执行日期：2026-10-13；源码基线 master `a0fc44c60423b8f0322200556bb5b31caf3a91bb`；本次构建/上传源码 `a2363b8ae1b29051148c3686aa91faa0363bca5a`。

## 1. 当前结论：自动化、生产构建及体验版上传核验通过；真机验收待复测

新增入口及两级页面已实现。用户确认后，只把本地 DEV_OSS_BUCKET_NAME 改为 shikongxiehou；未修改密钥或桶 ACL。原图已上传并加入清单，原有 155 条 URL 不变，其他任务文件不纳入提交。

## 2. 执行结果

- 第一次测试 RED：修正测试 VM 环境后，8 项新增用例均因缺少功能失败。
- 上传未成功时：13 项中 S04/S05 因真实清单没有海报 URL 失败，未用占位 URL 掩盖。
- 当前组件与上传纯函数、既有设置回归：16 项全部通过（含 DEV_OSS 来源、退出弹层树位置、清单完整解析保护）。证据 `.runtime/security-center-20261013/settings-tests.log`。
- S01/S02/S03：入口顺序、真实按钮跳转、滚动容器、设置分包与自定义导航通过。
- S06：微信原生图片预览异常提示通过（平台 API 边界模拟）。
- S07：指定资源、拒绝未知/空键、局部更新保留已有清单、部分格式异常/重复键拒绝覆盖均通过。真实清单定向 dry-run 通过，不访问网络。
- S10：设置滚动内容与退出弹层分离，原有弹层 open/onCancel/onConfirm 绑定不变。
- 既有 settings-lanhu-flow：5 通过。
- scoped `git diff --check`：通过。
- 完整 prebuild：22 批，395 项全部通过。新增测试已独立执行，并接入后续 predev/prebuild；不在提交发布阶段重复全量测试。证据 `.runtime/security-center-20261013/prebuild.log`。
- 页面数因本次新增两页从 87 改为 89；源码入口隔离与构建 Page/App 唯一注册门禁仅更新期望数，未放宽约束。
- S08 公网校验：GET 200，214819 字节，与原图 SHA256 完全相同；既有155资源 URL 不变。证据 `.runtime/security-center-20261013/poster-byte-audit.json`。
- 只读审查提出的弹层隔离、新增标签使用 View 以及清单完整解析建议均已落实；每项先补失败断言再修复。终审 Critical/Important/Minor 均0，独立重跑16项通过。
- 生产构建成功，postbuild 验证89页均 Page=1、共享脚本 Page=0、App=1；固定开发登录与 E2E 已关闭，包体门禁通过。
- S09 全新目录复制的440文件 SHA256 相同；preview/upload 主包和13分包、总字节数逐项相同。
- M01 真机独立复测未执行，不把组件执行、预览打包或上传成功视为真机验收。

## 3. OSS 排查证据

首次 `npm run assets:upload-icons -- --only=settingsAntiFraudGuide` 返回 `HTTP 403 (AccessDenied)`，上传器未写资源清单。配置获用户批准修正后，同一命令成功，只上传1张原图。

只读诊断：本地 DEV 配置 bucket `spacetime` / endpoint 上海，GET ACL 返回 403 并提示正确 endpoint 为杭州；上传器已有自动端点重试，最终仍拒绝。项目现有公网资源清单指向 bucket `shikongxiehou`，同一 DEV 凭证只读 ACL 请求返回 200。未改权限或改桶。

原图存档：`docs/素材/安全中心/anti-fraud-guide.jpg`，214819 字节，SHA256 `5d9f7813e2b116f053c477075d876aa15d7d1181233a358eadff20adc0ab7b10`；原样复制，未压缩、裁剪、转换，不在 src/assets 内。

## 4. 资产及后续

公网 URL：https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/5d9f7813e2b116f0/anti-fraud-guide.jpg 。无签名、无图片处理参数。新图只使用生成的 ossIcons 清单，未打包源 JPG。

OSS 只读诊断发现现有项目桶 ACL 为 public-read-write，存在公开写风险；本次未变更权限，建议另行收紧为公开读、凭证受控写。

## 5. 代码与体验版交付

- 代码提交 `a2363b8ae1b29051148c3686aa91faa0363bca5a`，已推送 master，实际 ls-remote 一致。
- 体验版 `2026.10.13.1854`，已成功上传（不是提交微信正式审核/上线）。发布前本次实际 fetch/ff 同步；上传前两次核对远端 SHA 与构建 SHA 相同。
- 发布目录 `.runtime/weapp-release-security-center-20261013-185411-a2363b8a/project`，本次新建，不复制 project.private.config.json。
- 证据：同目录上级 copy-manifest.json、preview-info.json、upload-info.json、package-audit.json；构建及 postbuild 记录 `.runtime/security-center-20261013/`。
- 本次无后端或管理端代码变化，不需要服务端部署；本地 OSS 桶配置修正获用户批准，忽略文件不入 Git。
- 交付记录单独文档提交，不改变已上传源码、产物或 OSS 原图。

| 包名 | preview/upload 字节（完全一致） |
| --- | ---: |
| main | 1390363 |
| assessment | 4199 |
| coins | 44537 |
| featured | 79801 |
| heart | 55668 |
| membership | 39115 |
| message | 441683 |
| prd08 | 87671 |
| profile-edit | 33454 |
| promotion | 364357 |
| qianxun | 135424 |
| search | 19869 |
| settings | 57871 |
| verification | 126191 |
| TOTAL | 2880203 |

真机复测：更新体验版，依次进入我的→设置→安全中心→反诈指南；滑到底、点击放大，再逐级返回。检查小屏设置列表可滚动，退出登录弹层仍正常显示（无需确认真实退出）。
