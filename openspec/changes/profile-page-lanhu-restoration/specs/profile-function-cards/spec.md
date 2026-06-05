## ADDED Requirements

### Requirement: 功能双卡片
系统 SHALL 在功能双卡片区域展示「成家币」和「邀请好友」两张功能卡片。

#### Scenario: 成家币卡片
- **WHEN** 功能卡片区渲染
- **THEN** 显示「成家币」标题（56rpx / 28px, #00469F, fontWeight 500）
- **THEN** 标题下方显示「查看成家币」描述（40rpx / 20px, #00469F, 上边距 4px）

#### Scenario: 邀请好友卡片
- **WHEN** 功能卡片区渲染
- **THEN** 显示「邀请好友」标题（56rpx / 28px, #6600AF, fontWeight 500）
- **THEN** 标题下方显示「免费获得成家币」描述（40rpx / 20px, #A055C3, 上边距 4px）

#### Scenario: 双卡片布局
- **WHEN** 功能卡片区渲染
- **THEN** 两张卡片左右并排，等宽，间距约 16rpx
- **THEN** 卡片使用 `cardCoin` 和 `cardInvite` 背景图
- **THEN** 距离 VIP 横幅上边距 74px（蓝湖值）
