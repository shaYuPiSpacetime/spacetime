# 底部 Tab 栏高度 150rpx 测试报告

日期：2026-10-12。用例依据：同目录 `底部Tab栏高度150rpx-testcase.md`。

## 已执行

- 底栏蓝湖切图、互斥切换和千寻页面门禁通过。
- `test-relation-feedback-flow.cjs`、`test-qianxun-feed-return-scroll.cjs`、`test-ideal-page-unlock-20261012.cjs`：44/44 通过。
- 加载并执行实际 AppTabBar 组件，核对六项内容高度 150rpx、垂直居中及 Shell 额外安全区；320/375/414/768 宽、0/34 安全区的布局关系计算通过。此项为组件与尺寸核对，不等同真机截图验收。
- `git diff --check` 通过。

## 既有测试问题

`test-feishu-bobo-20261009.cjs` 14/17 通过；I-01、N-02 旧回调、N-05 三项失败。通过将源码读取切换到修改前 Git HEAD 再执行，确认同样三项失败，分别为旧函数片段定位失败、未 mock `setActiveTabKey`、片段缺少 `useEffect`。本次未修改这三项业务与旧测试。

关系页面回归加载器已补充实际布局模块加载，解决新增布局依赖造成的测试加载失败。

## 发布与边界

- 业务提交：`881b4fd67fe6a96598b8ca2501e206fb4c9e2b99`，已 Push 至 master；上传前实际核对远端 HEAD 与构建 SHA 一致。
- 在独立 Git archive 源码目录执行完整 `npm run build:weapp`，构建前后门禁通过；`MINIAPP_DEV_FIXED_LOGIN=false`、`MINIAPP_E2E_MODE=false`。
- 体验版：`1.0.20261012.2144`，微信 CLI upload 成功。
- 发布目录：`.runtime/weapp-release-20261012214437-881b4fd6/project`。430 个文件 SHA-256 一致，preview/upload 全部主包和分包名、字节数逐项一致。
- 实际上传：总包 2,862,719 字节，主包 1,389,305 字节，千寻分包 135,924 字节。
- 原始证据：同级 `build.log`、`hash-audit.json`、`preview-info.json`、`upload-info.json`、`package-audit.json`。

真机视觉验收尚未执行；无后端、管理端或接口变更，L1/L2 不适用。Webpack 存在资源大小建议警告，项目包体门禁通过。
