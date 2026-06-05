## ADDED Requirements

### Requirement: 统计卡片展示
系统 SHALL 在统计卡片中展示红底数字徽标和「提升人气」按钮。

#### Scenario: 有统计数据时
- **WHEN** 用户有心动/被喜欢统计数据
- **THEN** 卡片左侧显示红底白色数字徽标（45 和 99，#EE2525 背景, 13px 圆角, 12px 字号）
- **THEN** 徽标文字白色，fontWeight 500
- **THEN** 卡片右侧显示「提升人气」按钮（#E3F1FE 背景, #2876FF 文字, 48rpx / 24px, 100px 左圆角）

#### Scenario: 无统计数据时
- **WHEN** 用户无统计数据
- **THEN** 仅显示「提升人气」按钮（居中或右对齐）

#### Scenario: 卡片样式
- **WHEN** 统计卡片渲染
- **THEN** 白色背景（#FFFFFF）, 12px 圆角, 宽 700px
- **THEN** 距离 Hero 区上边距 33px（蓝湖值）
