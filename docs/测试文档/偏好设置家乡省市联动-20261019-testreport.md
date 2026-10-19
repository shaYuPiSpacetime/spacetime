# 偏好设置家乡省市联动测试报告

- 日期：2026-10-19；用例：`偏好设置家乡省市联动-20261019-testcase.md`。
- 结论：代码回归通过，iPhone 真机验收待复验。

## 原因与修复

原地区弹层用两列独立 `ScrollView` 模拟滚轮，省份列没有停止吸附，且以触摸标记决定是否消费滚动事件。视觉停靠位置可以与省份索引、城市列表分离，形成截图中的“甘肃—西安”。改为同一原生 `PickerView` 的省市列，选中带共同居中；跨省重置城市，连续事件读取最新索引，滚动未停止时阻止确认。保留失效历史编码、直辖市、完整自治区名称及三级区县兼容规则。

组件事件依据：[Taro PickerView 官方文档](https://docs.taro.zone/docs/components/forms/picker-view)。

## 执行证据

先补充回归，旧实现的四个新增滚轮用例失败；修复后联合回归 **99/99 通过**，包括家乡切省、连续事件、停止前确认、只触摸不换值、历史失效编码和区县异步响应。

```bash
cd miniapp
node --test scripts/test-municipality-region-compatibility.cjs scripts/test-recommend-preference-city-sheet.cjs scripts/test-school-search-integration.cjs scripts/test-profile-score-refresh.cjs scripts/test-profile-edit-closure.cjs
```

其中 `test-profile-edit-closure.cjs` 引入 `test-profile-region-picker.cjs`，没有重复启动后者。99 项为与学校、背景问题共用的一次执行，不重复计数。

## 限制及发布

- 模拟器已打开，但当前为未登录页；缺少对应账号的已登录态，未进行生产账号操作或 iPhone 真机验收。
- 修复源码 `a7309b475f5004600ff6d16ad5becd7cfe12fb07` 已 Push 到 `master`。

## 发布结果

- 体验版 `1.0.20261019.2131` 上传成功。
- 当次已重新 fetch 并同步 `origin/master`；上传前再次读取远端 SHA，与构建源码完全一致。
- 本机忽略的后端开发配置未满足固定登录静态门禁；未改动该文件，从已提交源码快照构建。干净源码的完整 `npm run build:weapp`（包含 prebuild、Taro 编译和 postbuild）通过。开发固定登录与 E2E 均关闭。
- 全新发布目录：`.runtime/weapp-release-20261019-213142-a7309b47/project`。442 个文件复制前后及上传后 SHA-256 一致，未复制私有项目配置。
- preview/upload 的全部 15 项（含 TOTAL）包名与字节数完全一致：总包 2,902,160 字节，主包 1,402,606 字节，推荐分包 87,710 字节，认证分包 131,138 字节。
- 原始证据位于同一发布根目录：`build.log`、`hash-audit.json`、`preview-info.json`、`upload-info.json`、`remote-before-upload.txt`、`release-verification.json`。
- 本次仅修改小程序，无后端部署事项；上传成功及包校验不替代 iPhone 真机业务验收。
