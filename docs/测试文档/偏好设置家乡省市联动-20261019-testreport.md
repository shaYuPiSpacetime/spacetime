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
- 构建门禁、生产构建和独立目录上传结果将在本报告补记；当前不将本地回归写作已发布。
