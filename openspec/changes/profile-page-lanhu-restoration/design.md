## Context

当前 ProfilePage (`miniapp/src/pages/profile/index.tsx`) 基于旧 Figma 稿还原，与蓝湖最新设计稿存在多处偏差。更严重的是页面大量使用 `<Text>` 在 flex 容器中——这在微信小程序原生渲染中完全不生效（Text 是 `<text>` 原生内联组件）。故采用一次性重写策略。

蓝湖设计稿尺寸基准：750×1624px，本页面按蓝湖 px ÷ 2 = rpx 直接映射。

## Goals / Non-Goals

**Goals:**
- 重写 ProfilePage，单文件完成，严格对齐蓝湖三份设计稿（我的 / 会员开通状态 / 会员过期状态）
- 全页零 `Text-in-flex` 问题，所有布局文字用 `View`
- 保留 `useProfile` hook 数据层不变，页面只改渲染层
- 支持三种 VIP 状态切换（数据驱动）

**Non-Goals:**
- 不修改 `useProfile` hook 或任何数据层
- 不新增独立子组件文件（单文件重写）
- 不修改 `CustomNavBar`、`AppTabBar` 组件
- 不修改后端接口

## Decisions

### 1. 单文件重写策略

全部代码在一个 `index.tsx` 中，不拆分子组件文件。原因：
- 页面各区块无跨页面复用需求
- 保持与项目其他页面一致的模式（如 login/gender.tsx 内联 GenderCard）
- 减少文件碎片，方便对照蓝湖整体验收

### 2. 布局方案：flex + View 子元素

```
❌ 旧方案：<View style={{ display:'flex' }}><Text>xxx</Text></View>
✅ 新方案：<View style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
           <View style={{...}}>xxx</View></View>
```

每个需换行/居中的文字区域：父容器 `display: flex` + `flexDirection: column` + `alignItems: center`，子元素全用 `View`。

### 3. 蓝湖尺寸转换表

| 蓝湖标注 | rpx | 说明 |
|---------|-----|------|
| 750px | 750rpx | 页面宽 |
| 32px | 64rpx | 昵称字号 |
| 26px | 52rpx | 副标题 |
| 28px | 56rpx | 菜单项 |
| 24px | 48rpx | 提升人气 |
| 20px | 40rpx | 二级文字 |
| 12px | 24rpx | 数字徽标 |

### 4. 三种 VIP 状态

| 状态 | 触发条件 | UI |
|------|---------|-----|
| 未开通 | `!membership \|\| membership.status !== 'active'` | "立即开通" 黄色按钮 |
| 已开通 | `membership.status === 'active'` | "VIP会员已开通，享尊享特权" 金色文字 |
| 已过期 | `membership.status === 'expired'` | "VIP会员已过期，开通享尊享特权" + "立即开通" |

## Risks / Trade-offs

- [TabBar 推荐按钮] 蓝湖设计中 TabBar 有 150px 蓝色圆形悬浮按钮 → 当前 `AppTabBar` 组件可能不支持。如果改动 AppTabBar 成本过高，此轮先跳过推荐按钮，单独提 change。
- [数据兼容] mock 数据目前 `membership.status` 用 `'active'` → 需确认 `'expired'` 状态的 mock 数据，或前端判断 `isVip` 布尔值。
