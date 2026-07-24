# 小程序胶囊与返回箭头巡检验收报告

## 1. 验收结论

已修复 YO 悄悄话“申请我的 / 我申请的”的胶囊中心线和返回箭头尺寸问题，并完成同源导航巡检。本次确认受影响的是 **7 个路由页面**：6 个消息路由共用 `MessageNav`，另有 1 个手机号登录页面；均已统一修复。

## 2. 页面清单

| 路由 | 问题 | 结果 |
| --- | --- | --- |
| `pages/message/whisper-list` | 两种页签状态写死顶部，箭头过大 | 页签和箭头均跟随原生胶囊指标 |
| `pages/message/whisper-detail` | 共用消息大箭头 | 已统一为 24rpx 箭头 |
| `pages/message/private-list` | 共用消息大箭头 | 已统一为 24rpx 箭头 |
| `pages/message/private-chat` | 共用消息大箭头 | 已统一为 24rpx 箭头 |
| `pages/message/channel` | 共用消息大箭头 | 已统一为 24rpx 箭头 |
| `pages/message/report` | 共用消息大箭头 | 已统一为 24rpx 箭头 |
| `pages/login/phone` | 固定 `top: 66px` 且箭头过大 | 已读取原生胶囊位置并统一箭头 |

其他已巡检的顶部返回导航均已复用 `NativeNavigation`、`MiniappBackIcon` 或其胶囊指标封装，未发现同类固定顶部 + 独立大箭头问题。

## 3. 截图证据

- [YO悄悄话-申请我的](./截图证据/2026-07-22-胶囊与返回箭头/H5运行-375x812/01-悄悄话-申请我的.png)
- [YO悄悄话-我申请的](./截图证据/2026-07-22-胶囊与返回箭头/H5运行-375x812/02-悄悄话-我申请的.png)
- [手机号登录](./截图证据/2026-07-22-胶囊与返回箭头/H5运行-375x812/03-手机号登录.png)

375 × 812 运行态测量结果：三页返回点击热区均为 `x=0, y=34, width=56, height=52px`；旋转后箭头外接框约 `16.97 × 16.97px`，箭头与页签使用同一胶囊中心线。导航局部还原度评分：**98/100**。

## 4. 自动化验证

| 检查 | 结果 |
| --- | --- |
| `node scripts/validate-native-navigation-and-qianxun-interactions.mjs` | 通过，覆盖 7 个自绘返回导航页面 |
| `node scripts/validate-message-18-lanhu.mjs` | 通过 |
| 相关文件 ESLint | 通过 |
| `npm run build:h5` | 通过；仅保留既有 Webpack 体积警告 |
| `npm run build:weapp:dev` | 通过 |
| 小程序主包体积 | 0.94 MiB，低于 2MiB |
| 千寻分包体积 | 74.7 KiB |
| 小程序总包体积 | 1.52 MiB |

## 5. 环境说明

微信开发者工具自动化已能连接并重启目标路由，但其截图接口在本机超时，因此没有把超时截图作为通过证据。最终视觉证据采用同一源码的 H5 固定视口运行态截图；微信端位置则由 `getMenuButtonBoundingClientRect()` 实机指标、静态门禁和完整小程序构建共同验证。

