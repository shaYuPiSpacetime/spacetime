## ADDED Requirements

### Requirement: VIP 状态横幅
系统 SHALL 根据会员状态展示对应的 VIP 横幅，不使用暗黑渐变背景。

#### Scenario: 已开通状态
- **WHEN** 用户会员状态为已开通（active）
- **THEN** 显示金色文字「VIP会员已开通，享尊享特权」（56rpx / 28px, #FFC969, fontWeight 500）
- **THEN** 不显示「立即开通」按钮

#### Scenario: 已过期状态
- **WHEN** 用户会员状态为已过期（expired）
- **THEN** 显示金色文字「VIP会员已过期，开通享尊享特权」
- **THEN** 右侧显示黄色「立即开通」按钮（#FFC969 背景, 48px 圆角, 52rpx / 26px 文字 #232323）

#### Scenario: 未开通状态
- **WHEN** 用户无会员信息
- **THEN** 仅显示黄色「立即开通」按钮（居中或右对齐）

#### Scenario: 无暗黑背景
- **WHEN** VIP 横幅渲染
- **THEN** 不出现暗黑渐变背景（`#151515→#484848`）
