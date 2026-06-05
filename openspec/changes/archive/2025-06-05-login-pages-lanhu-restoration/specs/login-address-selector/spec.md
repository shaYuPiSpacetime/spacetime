## ADDED Requirements

### Requirement: 地址选择区域
系统 SHALL 在地址选择页展示简化的地址选择区域，仅包含「选择城市」和「获取定位」两行交互。

#### Scenario: 默认空白状态
- **WHEN** 地址选择页首次渲染
- **THEN** 显示一行「选择城市」入口（◎ 图标 + 灰色占位文字「选择城市」）
- **THEN** 右侧显示蓝色「获取定位」按钮
- **THEN** 下一步按钮为浅蓝禁用态（#E3F1FE）
- **THEN** 页面上不出现任何城市快捷标签

#### Scenario: 选择城市
- **WHEN** 用户点击「选择城市」区域
- **THEN** 弹出省份选择 ActionSheet
- **THEN** 用户选择省份后弹出城市选择 ActionSheet
- **THEN** 选中城市名称显示在 ◎ 图标右侧（文字变为 #333333）
- **THEN** 系统调用 `updateUserInfo({ province, city })` 保存地址
- **THEN** 下一步按钮切换为蓝色高亮态

#### Scenario: 获取定位
- **WHEN** 用户点击「获取定位」按钮
- **THEN** 调用 `Taro.chooseLocation()` 打开微信选址页面
- **THEN** 成功后将选中地址显示在 ◎ 图标右侧
- **THEN** 失败时回退调用 `Taro.getLocation()` 获取经纬度
- **THEN** 两次均失败时 toast 提示「定位失败，请手动选择」

#### Scenario: 选择区域样式
- **WHEN** 地址选择区域被渲染
- **THEN** 区域宽度 700rpx，高度 98rpx，白色背景，圆角 8rpx
- **THEN** 左侧 ◎ 图标颜色 #A6A6A6，大小 52rpx
- **THEN** 中间文字 28rpx，选中 #333333 / 未选中 #999999
- **THEN** 右侧「获取定位」170rpx 宽，文字 28rpx，颜色 #4E8FFE

### Requirement: 地址确认后完成登录
系统 SHALL 在用户选择地址后完成注册流程并跳转首页。

#### Scenario: 点击下一步完成
- **WHEN** 用户在地址页点击下一步按钮（已选择地址后）
- **THEN** 系统显示 toast「注册完成」
- **THEN** 1 秒后调用 `switchTab` 跳转到首页 `/pages/index/index`
