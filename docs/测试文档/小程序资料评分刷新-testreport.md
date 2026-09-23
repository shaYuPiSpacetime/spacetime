# 小程序资料评分刷新 - 测试报告

## 1. 测试概况

- 日期：2026-09-23。
- 基线：master / dfba5757；范围为小程序评分 hook、编辑页刷新入口及构建前回归接入。
- 用例依据：[小程序资料评分刷新-testcase.md](./小程序资料评分刷新-testcase.md)。
- 环境：Windows、项目已安装的 Node/React 18/TypeScript/Taro 4.1.9。组件测试使用 jsdom、模拟 API 和 Taro 生命周期，不是手机与后台真实联调。
- 评分继续使用服务端 `profileScore`，没有修改后端计分规则、管理端分数或测试环境用户资料。

## 2. 执行结果

| 检查 | 结果 | 说明 |
|---|---|---|
| SCORE-01～10：新增 hook / 页面行为测试 | 19/19 通过 | 首次读取、返回刷新、竞态、失败恢复、0/空值、卸载，以及子页事件和各保存入口 |
| SCORE-11：既有编辑与照片预览测试 | 42/42 通过 | 和新增用例一起执行，共 61 项通过 |
| 微信小程序编译 | 通过 | `node node_modules/@tarojs/cli/bin/taro build --type weapp`，56.62 秒 |
| 构建产物门禁 | 通过 | `npm run postbuild:weapp`；85 页注册、开发登录隔离和包体均通过；主包 1.25 MiB，总包 2.30 MiB |
| 完整 `npm run build:weapp` | 未通过前置门禁 | 既有登录测试对 CRLF 不兼容，见下一节；未宣称全量门禁通过 |
| 全项目 `tsc --noEmit` | 未通过 | 现有依赖类型错误及未使用变量等；评分 hook 无诊断，编辑页现有 `profileBackground` 未使用诊断仍在 |
| SCORE-12：手机与后台真实同环境联调 | 跳过/待验 | 当前无手机自动化连接与有效会话；本机 5173/8080 未启动，未伪造联调结果 |

## 3. 修复与回归证据

1. 修改前，实际编辑页的相册请求失败场景复现 87 未更新为 92；配置加载失败时评分请求不发起；主页旧分数会覆盖基础资料接口新分数。新增 hook 用例因功能尚未实现失败。
2. 修改后，基础资料读取独立更新评分；相册/配置失败不阻断评分；首次加载与页面显示共享正在执行的请求。
3. 回归覆盖旧请求晚于新请求返回、保存后强制重新读取、重新显示前已隐藏、卸载后回包、失败后重试、合法 0 分及无效值。
4. 在实际编辑页组件中触发子页更新事件、脱单目标与感情状态保存、头像/背景上传、相册新增/替换、语音提交/删除，断言服务端新分数显示。保存失败不触发评分刷新，删除语音可正确降低分数。
5. 新用例接入 `predev:weapp` 和 `prebuild:weapp` 的资料编辑测试入口。

## 4. 遗留检查与限制

- `scripts/test-login-pending-items-closure.cjs:110` 失败：“登录 hook 缺少备用首登地址提交入口”。其正则要求 LF 空行，Windows 工作区文件为 CRLF。登录 hook 与测试脚本相对 HEAD 均无内容变更；对同一文本仅统一换行后，原正则匹配从 false 变为 true。此处未修改无关模块或删除门禁。
- 全项目类型检查存在 `@rollup/pluginutils` / `react-native` 等类型缺失及 Taro 声明错误。当前编辑页的 `profileBackground` 未使用状态在本次修改前已存在；本次未扩大为全项目类型治理。
- 编译有私信页面资源超过 webpack 推荐阈值等告警，但项目实际小程序包体门禁通过。
- 页面刷新读取的是请求时服务端的审核生效结果；异步审核之后重新显示页面会再次读取。没有新增审核推送或后台轮询。
- 手机截图 87 分的原始接口响应与连接环境未捕获，不能把所有前后台差异都断言为同一原因。需发布新小程序包后完成 SCORE-12，并确认后台和小程序指向同一环境。

## 5. 结论

有条件通过：本次功能行为回归 61 项全通过，小程序编译及产物门禁通过；完整前置门禁、全项目类型检查存在上述问题，真实手机同环境验收待完成。

复现命令：

```powershell
cd miniapp
node --test scripts/test-profile-score-refresh.cjs scripts/test-profile-edit-closure.cjs scripts/test-profile-preview-photos.cjs
npm run build:weapp
node node_modules/@tarojs/cli/bin/taro build --type weapp
npm run postbuild:weapp
node node_modules/typescript/bin/tsc --noEmit --pretty false
```
