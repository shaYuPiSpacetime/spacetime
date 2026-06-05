## ADDED Requirements

### Requirement: Hero 区干净排版
系统 SHALL 在 Hero 区展示昵称、三重认证标签和地点/年龄/星座信息，不使用蓝色渐变背景和头像 50% 药丸。

#### Scenario: 昵称和认证标签
- **WHEN** 用户进入「我的」页面且已认证
- **THEN** 显示昵称（64rpx / 32px, #333, fontWeight 500）
- **THEN** 右侧显示「三重认证」标签（#E3F1FE 背景, 8px 圆角, 138×48px）

#### Scenario: 位置信息
- **WHEN** Hero 区渲染
- **THEN** 昵称下方显示「杭州市丨28岁丨双鱼座」（52rpx / 26px, #333, 上边距 10px）

#### Scenario: 无渐变背景
- **WHEN** Hero 区渲染
- **THEN** 不出现蓝色渐变背景或头像百分比药丸
