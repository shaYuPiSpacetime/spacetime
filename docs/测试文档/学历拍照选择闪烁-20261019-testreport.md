# 学历拍照选择闪烁 - 测试报告

> **执行日期**：2026-10-19
> **关联用例**：`docs/测试文档/学历拍照选择闪烁-20261019-testcase.md`
> **测试范围**：学历认证材料选择、取消、重复点击、上传状态与认证流程回归
> **结论**：第五轮视频逐帧确认，用户看到的最后一次闪烁不是页面刷新或相机黑屏，而是来源弹层关闭、原生相册切入前，只有宽度约束的上传相机图标被瞬间纵向拉伸。现已统一为固定宽高的 `aspectFit` 图标组件；红绿回归和真实账号 H5 流程验证通过，小程序构建及发布结果见后续记录。

## 1. 修复验证

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 修复前失败复现 | `node --test scripts/test-education-verification-hook.cjs` | 10/11 通过；“选择层等待期间页面不应进入上传态”失败，证明原逻辑会提前重绘底层页面 |
| Hook 第二轮修复验证 | `node --test scripts/test-education-verification-hook.cjs` | 13/13 通过 |
| 认证流程组合回归 | `node --test scripts/test-education-verification-hook.cjs scripts/test-verification-onboarding-flow.cjs scripts/test-prd01-runtime.cjs` | 57/57 通过 |
| PRD01 交接门禁 | `npm run validate:prd01-handoff` | 各测试组 55/55 通过，SQL 契约与资料闭环检查通过 |
| 微信小程序编译 | `taro build --type weapp` | 编译成功；仅保留既有包体性能警告 |
| 构建产物门禁 | `npm run postbuild:weapp` | 页面注册、开发登录、页面能力与包体门禁全部通过 |
| 第三轮失败复现 | `node --test scripts/test-education-verification-hook.cjs` | 13/14 通过；系统选择器返回触发第 2 次学历详情读取，证明存在并发整页重绘 |
| 第三轮 Hook 修复验证 | `node --test scripts/test-education-verification-hook.cjs` | 14/14 通过 |
| 第三轮认证组合回归 | `node --test scripts/test-education-verification-hook.cjs scripts/test-verification-onboarding-flow.cjs scripts/test-prd01-runtime.cjs` | 58/58 通过 |
| 第三轮完整发布构建 | `npm run build:weapp` | 全量发布前置门禁通过，Webpack 编译成功（48.61 秒），构建后门禁通过 |
| 第四轮失败复现 | `node --test scripts/test-education-verification-hook.cjs` | 14/15 通过；缺少页内相机承载层，证明拍照仍会进入系统相机切页链路 |
| 第四轮来源菜单门禁 | `node --test scripts/test-education-verification-hook.cjs` | 14/15 通过；使用系统 `showActionSheet` 时仍可能在菜单关闭和相机层挂载之间露出白页 |
| 第四轮认证组合回归 | `node --test scripts/test-education-verification-hook.cjs scripts/test-verification-onboarding-flow.cjs scripts/test-prd01-runtime.cjs` | 59/59 通过 |
| 第四轮完整发布构建 | `npm run build:weapp` | 全量发布前置门禁通过，Webpack 编译成功（45.06 秒），构建后页面注册、运行模式与包体门禁通过 |
| 第五轮失败复现 | `node --test scripts/test-education-verification-hook.cjs` | 15/16 通过；固定宽高图标门禁失败，证明两个材料入口仍使用仅约束宽度的 `widthFix` |
| 第五轮 Hook 修复验证 | `node --test scripts/test-education-verification-hook.cjs` | 16/16 通过 |
| 第五轮 H5 编译 | `npm run build:h5` | 编译成功；仅保留项目既有 Webpack 包体积建议告警 |
| 第五轮 H5 真实账号验证 | 本地 H5 连接生产 API，手机号验证码登录后进入上传证书页 | 登录成功，学校与学历资料正常加载；来源弹层正常关闭并生成文件选择控件；切换前后图标尺寸稳定在约 96×94px |

## 2. 用例结果

| 用例 ID | 结果 | 证据 |
| --- | --- | --- |
| EDU-CAMERA-P0-01 | 通过 | 原生选择 Promise 未结束时 `uploading=false`，底层页面不切换“上传中” |
| EDU-CAMERA-P1-02 | 通过 | 连续调用只触发一次 `chooseImage` |
| EDU-CAMERA-P1-03 | 通过 | 用户选好图片后才切换上传态，网络上传完成后恢复 |
| EDU-CAMERA-P1-04 | 通过 | 取消选择后材料、上传态与提示均保持不变 |
| EDU-CAMERA-P1-05 | 通过 | 上传反馈仅覆盖当前材料；提交按钮不再切换禁用色，页面不再动态插入红色“上传中”行 |
| EDU-CAMERA-P1-06 | 通过 | 既有替换失败用例保持通过，旧材料可恢复；新增材料使用同一乐观条目回滚路径 |
| EDU-CAMERA-P0-07 | 通过 | 上传操作锁持有期间忽略系统选择器触发的 `didShow`，学历详情读取保持 1 次；正常页面返回刷新仍由 E11 覆盖 |
| EDU-CAMERA-P0-08 | 通过 | 拍照使用当前页自绘来源菜单和固定黑色 `Camera` 承载层；初始化前不露出白色学历页，系统选择器仅保留相册路径 |
| EDU-CAMERA-P0-09 | 通过 | 主上传入口使用固定尺寸共享图标，追加材料入口保留发布门禁可识别的显式图标；两处均同时约束宽高并使用 `aspectFit`，不再存在 `verificationUploadCamera + widthFix` |
| EDU-CAMERA-P1-10 | 通过 | 真实账号 H5 登录、资料加载、来源弹层关闭及相册选择控件生成均正常；切换前后图标宽高未跳变 |

## 2.1 第二轮失败复现与修复结果

- 修复前：`node --test scripts/test-education-verification-hook.cjs` 为 11/13 通过；缺少本地缩略图即时回显，页面仍以全局 `uploading` 状态改变按钮亮度并插入提示行。
- 修复后：同一命令 13/13 通过；返回页面第一帧建立本地材料条目，网络上传仅更新该条目的状态。
- 系统相机启动时的黑屏和自动曝光由微信原生 `chooseImage` 相机控制，不属于小程序页面重绘；本轮消除的是返回小程序后可控的整页闪烁。

## 2.2 第三轮根因与最小改造

- 对比发布动态、相册、背景图、举报附件等正常链路后确认：它们都可使用系统 `chooseImage/chooseMedia`，差异不在相机 API。
- 学历 Hook 独有的 `useDidShow -> refreshStatus` 会在系统拍照/相册返回时，与本地缩略图回显、上传状态更新并发执行，导致材料区被服务端状态重复重绘。
- 修复保持系统拍照/相册入口不变，仅在材料选择/上传操作进行中跳过该次 `didShow` 刷新；真实离页再返回时仍正常刷新审核资格。

## 2.3 第四轮视频证据与改造

- 新视频逐帧显示：来源菜单关闭后，白色学历资料页短暂恢复，随后黑色系统相机自下而上进入；相册返回、拍照返回及材料缩略图回显已无上一轮的整页重绘。
- 该白黑切换发生在微信原生 `chooseImage` 相机启动阶段，无法通过上传状态或 `didShow` 锁继续消除。
- 学历材料页改为当前渲染树中的来源菜单；点击“拍照”时同一批状态更新直接挂载全屏黑色 `Camera`，摄像头初始化完成后再显示实时画面，不经过系统相机切页动画。
- 点击“从手机相册选择”仍调用 `chooseImage({ sourceType: ['album'] })`；既有最多四张、乐观缩略图、上传失败回滚和返回页刷新保护保持不变。

## 3. 构建信息

- 微信小程序生产编译耗时 57.24 秒。
- 主包 1.42 MiB，总包 2.86 MiB，包体门禁通过。
- 编译提示 `private-chat.js` 与 `common.js` 超过 Webpack 推荐体积，本次学历上传改动未引入该警告。
- 第四轮在业务提交后从 `0ee9994a` 源码重新编译，Webpack 耗时 47.80 秒；构建后门禁显示主包 1.42 MiB、总包 2.87 MiB，89 个页面注册与运行模式检查通过。

## 4. 体验版发布证据

- 业务源码提交：`ffacc68a572e1ce73023d8514c906e691844645e`。
- 体验版版本：`1.0.20261019.1728`，描述为“修复学历认证拍照返回后整页闪烁”。
- 独立发布目录：`.runtime/weapp-release-20261019-172803-ffacc68a/project`。
- 发布目录共 442 个文件，复制前后及上传后 SHA-256 均一致；未复制 `project.private.config.json`。
- 微信 CLI preview 与 upload 均成功，15 项包统计逐项一致：总包 `2,898,051` 字节、主包 `1,401,654` 字节、学历认证分包 `127,100` 字节。
- 原始证据保存在发布目录上级的 `manifest.json`、`preview-info.json`、`upload-info.json`、`package-audit.json` 与 `preview-qr.png`。

### 4.1 第三轮体验版

- 业务源码提交：`50b70006a55098117e4f8ae9881d5c9a80b12a7f`，上传前本地 HEAD、远端 `origin/master` 与发布清单提交完全一致。
- 体验版版本：`1.0.20261019.1826`，描述为“修复学历拍照相册返回时重复刷新闪烁”。
- 独立发布目录：`.runtime/weapp-release-education-picker-flicker-20261019-182624-50b70006/project`，共校验 442 个文件，未复制 `project.private.config.json`。
- CLI preview 与 upload 的 15 项包统计逐项一致：总包 `2,898,074` 字节、主包 `1,401,654` 字节、学历认证分包 `127,123` 字节；上传后文件 SHA-256 复核一致。
- 原始证据保存在独立目录上级的 `copy-manifest.json`、`preview-info.json`、`upload-info.json`、`package-audit.json` 与 `preview-qr.png`。

## 5. 第四轮发布状态与真机复核

- 业务源码提交：`0ee9994a321785377fd2fd136ab0703367dc8a88`；上传前 `git ls-remote origin refs/heads/master` 与本地构建提交一致。
- 体验版版本：`1.0.20261019.2043`，描述为“修复学历拍照进入相机时白黑闪烁”。
- 独立发布目录：`.runtime/weapp-release-education-camera-overlay-20261019-204346-0ee9994a/project`，共校验 442 个文件，复制前后及上传后 SHA-256 一致，未复制 `project.private.config.json`。
- 微信 CLI preview 与 upload 的 15 项包统计逐项一致：总包 `2,903,424` 字节、主包 `1,402,195` 字节、学历认证分包 `131,932` 字节。
- 原始证据位于发布目录上级的 `copy-manifest.json`、`preview-info.json`、`upload-info.json`、`package-audit.json` 与 `preview-qr.png`。
- 真机重点复核：点击“拍照”后应直接进入黑色承载层，摄像头准备完成后显示取景画面；取消、拍照完成和相册返回均不应重新闪出整页加载状态。
