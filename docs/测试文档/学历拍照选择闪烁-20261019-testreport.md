# 学历拍照选择闪烁 - 测试报告

> **执行日期**：2026-10-19
> **关联用例**：`docs/测试文档/学历拍照选择闪烁-20261019-testcase.md`
> **测试范围**：学历认证材料选择、取消、重复点击、上传状态与认证流程回归
> **结论**：自动化与小程序构建门禁通过；未发布体验版，修复后的真机观感待统一发布后复核

## 1. 修复验证

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 修复前失败复现 | `node --test scripts/test-education-verification-hook.cjs` | 10/11 通过；“选择层等待期间页面不应进入上传态”失败，证明原逻辑会提前重绘底层页面 |
| Hook 修复验证 | `node --test scripts/test-education-verification-hook.cjs` | 11/11 通过 |
| 认证流程组合回归 | `node --test scripts/test-education-verification-hook.cjs scripts/test-verification-onboarding-flow.cjs scripts/test-prd01-runtime.cjs` | 56/56 通过 |
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

## 3. 构建信息

- 微信小程序编译耗时约 1.08 分钟。
- 主包 1.42 MiB，总包 2.86 MiB，包体门禁通过。
- 编译提示 `private-chat.js` 与 `common.js` 超过 Webpack 推荐体积，本次学历上传改动未引入该警告。

## 4. 待复核项

按用户要求，本次不单独发布小程序。待其余缺陷全部修复并统一上传体验版后，在真机上复核“拍照/从手机相册选择”弹层出现、取消和选图返回三段动画，确认页面底层无明暗跳变或文案闪烁。
