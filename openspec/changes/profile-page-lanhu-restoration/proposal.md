## Why

当前「我的」页面基于 Figma 旧稿还原，多处与蓝湖最新设计稿不一致：Hero 区多余的蓝色渐变和头像药丸、统计卡片遗漏数字徽标、VIP 区暗黑背景、菜单缺少分割线、TabBar 缺少推荐圆按钮。同时页面大量使用 `Text` 在 flex 容器中做布局，在微信小程序中完全不生效。需要一次性重写，严格对齐蓝湖设计稿。

## What Changes

- **重写 Hero 区**：去掉蓝色渐变背景和头像 50% 药丸，干净排版昵称+认证标签+地点/年龄/星座
- **重写统计卡片**：红底数字徽标（45/99）+ "提升人气" 按钮，白色卡片圆角 12px
- **重写 VIP 区**：去掉暗黑渐变背景，金色文字 + 黄色按钮，区分已开通/已过期/未开通三种状态
- **重写功能双卡片**：成家币（#00469F）+ 邀请好友（#6600AF），卡片背景图保持不变
- **重写菜单区域**：增加分割线（#EFF4FC），行高 94px
- **新增 TabBar 推荐按钮**：150px 蓝色圆形按钮悬浮在 TabBar 上方
- **全页 Text→View**：将所有 flex 容器中的 `Text` 替换为 `View`，使用 `display: flex` + `flexDirection: column` + `alignItems: center` 可靠方案

## Capabilities

### New Capabilities
- `profile-hero`: 我的页面 Hero 区（昵称、认证、位置信息）
- `profile-stats-card`: 统计卡片（数字徽标 + 提升人气）
- `profile-vip-banner`: VIP 状态横幅（三种状态：已开通/已过期/未开通）
- `profile-function-cards`: 功能双卡片（成家币 + 邀请好友）
- `profile-menu-list`: 菜单列表（我的动态、帮助与客服、设置，含分割线）
- `profile-tabbar-recommend`: TabBar 推荐圆形按钮

## Impact

- **受影响的文件**：`miniapp/src/pages/profile/index.tsx`（重写）、`miniapp/src/pages/profile/index.config.ts`（不改）
- **关联组件**：`CustomNavBar`（保持不变）、`AppTabBar`（可能需要调整以支持推荐按钮）
- **数据层**：`useProfile` hook 基本不变，可能需要补充 visitorCount 字段
- **不修改后端接口、API URL、路由**
