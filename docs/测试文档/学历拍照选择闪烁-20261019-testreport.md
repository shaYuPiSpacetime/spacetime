# 学历拍照选择闪烁 - 测试报告

> **执行日期**：2026-10-19
> **关联用例**：`docs/测试文档/学历拍照选择闪烁-20261019-testcase.md`
> **测试范围**：学历认证材料选择、取消、重复点击、上传状态与认证流程回归
> **结论**：第二轮针对性自动化、完整发布构建与产物门禁通过；待独立目录上传体验版与真机复核

## 1. 修复验证

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 修复前失败复现 | `node --test scripts/test-education-verification-hook.cjs` | 10/11 通过；“选择层等待期间页面不应进入上传态”失败，证明原逻辑会提前重绘底层页面 |
| Hook 第二轮修复验证 | `node --test scripts/test-education-verification-hook.cjs` | 13/13 通过 |
| 认证流程组合回归 | `node --test scripts/test-education-verification-hook.cjs scripts/test-verification-onboarding-flow.cjs scripts/test-prd01-runtime.cjs` | 57/57 通过 |
| PRD01 交接门禁 | `npm run validate:prd01-handoff` | 各测试组 55/55 通过，SQL 契约与资料闭环检查通过 |
| 微信小程序编译 | `taro build --type weapp` | 编译成功；仅保留既有包体性能警告 |
| 构建产物门禁 | `npm run postbuild:weapp` | 页面注册、开发登录、页面能力与包体门禁全部通过 |

## 2. 用例结果

| 用例 ID | 结果 | 证据 |
| --- | --- | --- |
| EDU-CAMERA-P0-01 | 通过 | 原生选择 Promise 未结束时 `uploading=false`，底层页面不切换“上传中” |
| EDU-CAMERA-P1-02 | 通过 | 连续调用只触发一次 `chooseImage` |
| EDU-CAMERA-P1-03 | 通过 | 用户选好图片后才切换上传态，网络上传完成后恢复 |
| EDU-CAMERA-P1-04 | 通过 | 取消选择后材料、上传态与提示均保持不变 |
| EDU-CAMERA-P1-05 | 通过 | 上传反馈仅覆盖当前材料；提交按钮不再切换禁用色，页面不再动态插入红色“上传中”行 |
| EDU-CAMERA-P1-06 | 通过 | 既有替换失败用例保持通过，旧材料可恢复；新增材料使用同一乐观条目回滚路径 |

## 2.1 第二轮失败复现与修复结果

- 修复前：`node --test scripts/test-education-verification-hook.cjs` 为 11/13 通过；缺少本地缩略图即时回显，页面仍以全局 `uploading` 状态改变按钮亮度并插入提示行。
- 修复后：同一命令 13/13 通过；返回页面第一帧建立本地材料条目，网络上传仅更新该条目的状态。
- 系统相机启动时的黑屏和自动曝光由微信原生 `chooseImage` 相机控制，不属于小程序页面重绘；本轮消除的是返回小程序后可控的整页闪烁。

## 3. 构建信息

- 微信小程序生产编译耗时 57.24 秒。
- 主包 1.42 MiB，总包 2.86 MiB，包体门禁通过。
- 编译提示 `private-chat.js` 与 `common.js` 超过 Webpack 推荐体积，本次学历上传改动未引入该警告。

## 4. 待复核项

本轮提交推送后按独立发布目录流程上传体验版；上传完成后在真机复核“拍照/从手机相册选择”弹层出现、取消和选图返回三段动画，确认页面底层无明暗跳变或文案闪烁。
