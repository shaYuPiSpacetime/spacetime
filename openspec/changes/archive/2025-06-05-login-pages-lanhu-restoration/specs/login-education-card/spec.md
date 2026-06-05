## ADDED Requirements

### Requirement: 学历选择卡片列表
系统 SHALL 在学历选择页展示四个学历选项卡片——「博士」「硕士」「本科」「大专」，支持点选切换。

#### Scenario: 默认选中硕士
- **WHEN** 学历选择页首次渲染
- **THEN** 「硕士」卡片处于选中态：浅蓝背景（#E3F1FE）+ 蓝色描边（2rpx solid #2876FF）+ 蓝色文字（#2876FF）
- **THEN** 其余卡片处于未选中态：白色背景 + 白色边框 + 深色文字（#333333）
- **THEN** 下一步按钮初始为浅蓝禁用态（#E3F1FE）

#### Scenario: 点击切换选中
- **WHEN** 用户点击任意学历卡片
- **THEN** 被点击卡片切换为选中态（浅蓝背景 + 蓝色描边 + 蓝色文字）
- **THEN** 其余卡片恢复未选中态
- **THEN** 下一步按钮切换为蓝色高亮态

#### Scenario: 卡片展示样式
- **WHEN** 任意学历卡片被渲染
- **THEN** 卡片宽度为 700rpx，高度为 128rpx，圆角为 24rpx
- **THEN** 文字大小为 38rpx，fontWeight 500，行高 53rpx
- **THEN** 卡片间距为 29rpx
- **THEN** 文字在卡片内水平和垂直居中

#### Scenario: 卡片列表定位
- **WHEN** 学历页渲染
- **THEN** 第一张卡片（博士）top 为 442rpx（相对壳组件内容区）
- **THEN** 后续卡片以此间距排列

### Requirement: 学历选择后跳转
系统 SHALL 在用户点击下一步后将学历写入登录状态并跳转地址页。

#### Scenario: 点击下一步跳转
- **WHEN** 用户在学历页点击下一步按钮（已交互后）
- **THEN** 系统调用 `updateUserInfo({ education: selected })` 保存学历
- **THEN** 系统调用 `setStep('address')` 更新步骤
- **THEN** 导航到 `/pages/login/address`
