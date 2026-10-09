# 千寻头部头像定位 - 测试报告

> 测试用例：`docs/测试文档/千寻头部头像定位-testcase.md`

## 1. 测试概况

| 项目 | 信息 |
| --- | --- |
| 功能 | 移动端用户头像与时空邂逅菜单定位 |
| 执行日期 | 2026-10-10 |
| 基线提交 | `85fb2a30`，本次头像定位修复 |
| 测试策略 | 组件布局单测 + 静态门禁 + 小程序编译 |

## 2. 测试结果

| 检查项 | 结果 |
| --- | --- |
| UI-01 至 UI-05 布局单测 | 5/5 通过 |
| 千寻一级 Tab、知音双页、胶囊门禁 | 通过 |
| `git diff --check` | 通过 |
| `npx taro build --type weapp` | 通过 |
| 产物注册、无开发Token、包体门禁 | 通过，87页面，主包1.48MiB，总包2.59MiB |
| 模拟器成家、时空邂逅、关注场景 | 通过，截图见验收报告 |
| Android 真机用户1008复测 | 待真机复测 |

## 3. 遗留项

Android 真机用户1008仍待复测。既有 `test-qianxun-feed-return-scroll.cjs` 因 mock 缺少 `@/constants/qianxunTypography` 依赖未启动，不属于本次改动引入的问题。

同步最新远端后，直接执行 `npx taro build --type weapp`，再执行 `npm run postbuild:weapp`；构建、页面注册、无开发 Token 和包体门禁均通过。完整 `npm run build:weapp` 的既有前置门禁仍受后端 dev profile 固定 Token 配置限制，本次未改后端配置。
