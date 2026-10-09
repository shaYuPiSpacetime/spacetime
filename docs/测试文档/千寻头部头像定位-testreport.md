# 千寻头部头像定位 - 测试报告

> 测试用例：`docs/测试文档/千寻头部头像定位-testcase.md`

## 1. 测试概况

| 项目 | 信息 |
| --- | --- |
| 功能 | 移动端用户头像与时空邂逅菜单定位 |
| 执行日期 | 2026-10-09 |
| 基线提交 | `b0bf192e`，本次头像定位修复 |
| 测试策略 | 组件布局单测 + 静态门禁 + 小程序编译 |

## 2. 测试结果

| 检查项 | 结果 |
| --- | --- |
| UI-01 至 UI-04 布局单测 | 4/4 通过 |
| 千寻一级 Tab、知音双页、胶囊门禁 | 通过 |
| `git diff --check` | 通过 |
| `npx taro build --type weapp` | 通过 |
| 产物注册、无开发Token、包体门禁 | 通过，87页面，主包1.48MiB，总包2.59MiB |
| 真机用户1008复测 | 待真机复测 |

## 3. 遗留项

开发工具当前登录页，调用胶囊坐标的自动化 API 超时，暂未取得用户1008真机截图。既有 `test-qianxun-feed-return-scroll.cjs` 因 mock 缺少 `@/constants/qianxunTypography` 依赖未启动，不属于本次改动引入的问题。

同步最新远端后执行 `npm run build:weapp`，前置门禁在 `validate-dev-fixed-login.mjs` 失败：后端dev profile的固定Token并非环境变量形式。随后使用当前源码执行实际Taro编译及postbuild校验；本次未改后端配置或宣称全量门禁通过。
