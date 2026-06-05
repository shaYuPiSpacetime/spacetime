## ADDED Requirements

### Requirement: 菜单列表
系统 SHALL 在菜单区域展示「我的动态」「帮助与客服」「设置」三个菜单项，项之间使用分割线分隔。

#### Scenario: 菜单项
- **WHEN** 菜单区域渲染
- **THEN** 显示三个菜单项：「我的动态」「帮助与客服」「设置」
- **THEN** 每项文字 56rpx / 28px, #595F77
- **THEN** 每项左侧有对应图标（iconPost / iconService / iconSettings）
- **THEN** 每项右侧有箭头指示符 `›`（#CCCCCC）

#### Scenario: 分割线
- **WHEN** 菜单项之间有间隔
- **THEN** 分割线宽 660px, 高 1px, 颜色 #EFF4FC
- **THEN** 分割线上下边距 26px（蓝湖值）

#### Scenario: 卡片样式
- **WHEN** 菜单区域渲染
- **THEN** 白色背景, 8px 圆角, 内边距 27px/20px
- **THEN** 距离功能卡片区上边距 92px（蓝湖值）
