## ADDED Requirements

### Requirement: TabBar 推荐圆形按钮
系统 SHALL 在 TabBar 区域中央悬浮一个蓝色圆形「推荐」按钮。

#### Scenario: 推荐按钮展示
- **WHEN** 我的页面 TabBar 渲染
- **THEN** TabBar 中央显示 150px 蓝色圆形按钮（#2876FF, 50% 圆角）
- **THEN** 按钮内白色文字「推荐」（40rpx / 20px, #FFFFFF）
- **THEN** 按钮位置：`position: absolute, left: 300px, top: -22px`（蓝湖坐标）

#### Scenario: 推荐按钮点击
- **WHEN** 用户点击推荐按钮
- **THEN** 使用 `switchTab` 跳转到推荐页 `/pages/assessment/index`
