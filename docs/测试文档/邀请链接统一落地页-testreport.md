# 邀请链接统一落地页测试报告

- 日期：2026-09-09
- 依据：[测试用例](./邀请链接统一落地页-testcase.md)
- 环境：本地 Node，页面 TSX 经 TypeScript 内存转译执行，React/Taro/接口使用依赖桩。
- 结论：本地回归通过；真机分享验收待补测，不能视为完整端到端通过。

## 结果

| 验证 | 结果 |
|---|---|
| 在内存中替换为 HEAD 修复前源码，运行新增回归用例 | 8 项中 2 项按预期失败：分享仍指向邀请页、接收方仍渲染邀请页；未改写工作区 |
| `cd miniapp && npm run validate:prd07-miniapp` | 11 项测试通过，16 项静态检查通过 |
| A-01 | 新分享统一使用登录首屏路径，来源保留；通过 |
| A-02/A-03/A-05 | 6 组登录态与入口参数组合均先采集来源、重建页面栈到登录首屏，不发邀请首页请求；通过 |
| A-04 | 有/无登录态的正常邀请页入口保持原流程；通过 |
| 修改源码定向 ESLint（JS 使用 browser 环境） | 通过 |
| `cd miniapp && npm run lint` | 3 个现有无关错误，1 个现有警告；本次修改文件无错误 |

## 遗留项

- M-01、M-02 未执行：本轮未接入微信真机分享场景，需确认冷启动、后台唤起、重复分享及点击“立即使用”后的行为。
- 未运行完整小程序构建、未发布；本次验证不包含微信基础库导航时序。
- 全量 lint 现有错误：`miniapp/src/pages/prd08/ideal/records/index.tsx:59`、`miniapp/src/pages/prd08/recommend/preference/index.tsx:459`、`miniapp/src/pages/prd08/recommend/replay/index.tsx:118` 存在不规则空白；`miniapp/src/types/lanhuDemo.ts:2` 存在未使用导入警告。
- 初次定向 JS lint 未声明 browser 环境，报告原有计时器全局未定义；按浏览器运行环境重新检查后通过。
- 首次 lint 附加了当前 ESLint 不支持的 `--no-warn-ignored` 参数，已改用项目原命令重新执行。
