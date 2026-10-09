# 心动只看ta充值跳转 - 测试报告

日期：2026-10-09。分支：master，基线：8764cac9。
测试依据：`心动只看ta充值跳转-testcase.md`。

## 结果

本次定向验证通过；整体构建流程有既有前置测试失败，真机验收待补。

| 检查 | 结果 |
| --- | --- |
| F-P0-01 对我心动点击只看ta | 通过：实际渲染组件并执行按钮事件，进入喜欢场景充值页，关闭弹窗，无报价和扣费调用 |
| F-P1-02 最近访客点击只看ta | 通过：实际按钮事件进入访客场景充值页，无报价和扣费调用 |
| F-P1-03 解锁全部 | 通过：仍进入会员解锁页 |
| 关系反馈定向测试 | 12/12 通过 |
| 关系反馈闭环门禁 | 通过 |
| Taro 生产编译 | 通过；私信页存在既有 303 KiB 性能警告 |
| 构建产物门禁 | 87 页注册通过，无开发 Token；主包 1.48 MiB，总包 2.59 MiB |
| M-01 真机验证 | 未执行，未使用真实账号完成截图中的操作 |

## 执行命令

```bash
cd miniapp
node --test scripts/test-relation-feedback-flow.cjs
node scripts/validate-relation-feedback-miniapp-closure.mjs
npx taro build --type weapp
npm run postbuild:weapp
```

## 既有门禁失败

修改前执行 `npm run dev:weapp`，前置检查在 `test-0901-document-fixes.cjs` 出现 3 项失败：本人动态菜单断言、悄悄话全局弹窗断言、热门动态滚动恢复断言。对应测试组合 12/15 通过。

因此未启动 watch；使用 Taro CLI 单独进行生产编译，并执行完整 postbuild 产物检查。本次没有修改这些失败所涉及的模块或断言，不宣称标准构建前置检查全部通过。

本次未改后端，不执行接口、真实支付或扣费测试。
