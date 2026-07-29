# 邀请好友五页蓝湖高还原实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use verification-before-completion before claiming completion.

**Goal:** 在不改动 PRD-07 邀请归因、奖励和 H5 配置契约的前提下，将小程序“邀请好友”组五张蓝湖稿按 375×812 基线进行像素级还原，并为 414×896 补充适配验收。

**Architecture:** 保留现有三个生产路由 `invite-home`、`invite-records`、`invite-rules`。蓝湖中的五张画板映射为“首页有记录态、首页空记录态、首页完成 20 人态、邀请记录页、活动说明页”；首页状态由接口数据自然驱动，不新增伪页面或写死演示数字。所有按钮、返回、列表、分享和 H5 降级继续使用真实组件。

**Tech Stack:** Taro 4、React 18、TypeScript、SCSS、微信小程序原生分享能力、现有 PRD-07/PRD-06 接口。

---

### Task 1: 固化蓝湖设计基线与差异清单

**Files:**

- Create: `docs/验收报告/截图证据/2026-07-29-邀请好友五页/蓝湖基线/*.png`
- Create: `docs/技术方案/2026-07-29-邀请好友五页-蓝湖还原-tcdesign.md`

**Steps:**

1. 通过蓝湖 MCP 定位父稿和四张子稿。
2. 下载五张原始封面图，不使用压缩或 CDN 图片处理参数。
3. 从蓝湖 Sketch JSON 提取画板、布局、字体、颜色、圆角和素材边界。
4. 记录现有实现与设计稿在结构、尺寸、视觉、素材和状态上的差异。

### Task 2: 先补静态门禁（RED）

**Files:**

- Modify: `miniapp/scripts/validate-promotion-ui.mjs`

**Steps:**

1. 增加“五张画板对应三个路由和两个首页状态”的静态断言。
2. 增加首页动态空态、完成态、设计素材、真实交互组件断言。
3. 增加邀请记录页汇总区和扁平奖励流断言。
4. 增加活动说明标题、RichText 安全清洗、缓存/错误降级断言。
5. 运行 `npm run validate:prd07-miniapp`，确认旧实现失败。

### Task 3: 还原邀请首页三种设计状态（GREEN）

**Files:**

- Modify: `miniapp/src/pages/promotion/invite-home.tsx`
- Modify: `miniapp/src/pages/promotion/invite-home.scss`
- Create: `miniapp/src/assets/lanhu/promotion/invite-hero.png`
- Create: `miniapp/src/assets/lanhu/promotion/invite-empty.png`

**Steps:**

1. 按蓝湖坐标重构主视觉、奖励卡、进度卡、记录卡和规则卡。
2. 保留 `useShareAppMessage`、复制链接降级、归因捕获、活动说明和记录页跳转。
3. 以 `recentRecords.length` 驱动记录卡正常/空态。
4. 以服务端 `successCount/current/max/ladders` 驱动完成 20 人及后续阶梯状态，不写死 20/40、25/30/40。
5. 骨架、错误和重试状态沿用同一视觉壳。

### Task 4: 还原邀请记录页（GREEN）

**Files:**

- Modify: `miniapp/src/pages/promotion/invite-records.tsx`
- Modify: `miniapp/src/pages/promotion/invite-records.scss`

**Steps:**

1. 通过 `getInviteHome` 补齐设计稿顶部累计邀请成功与累计到账汇总。
2. 将关系与奖励明细转换为蓝湖稿的扁平时间流：好友注册奖励行与额外阶梯奖励行。
3. 保留下拉刷新、触底分页、加载、空态和错误重试。
4. 头像、礼物图标和金额均使用真实独立组件，禁止整页图片。

### Task 5: 还原活动说明页（GREEN）

**Files:**

- Modify: `miniapp/src/pages/promotion/invite-rules.tsx`
- Modify: `miniapp/src/pages/promotion/invite-rules.scss`

**Steps:**

1. 原生导航标题固定为“活动说明”，按蓝湖稿还原白底、深蓝标题和正文排版。
2. 当前 HTML 快照继续使用安全清洗后的 `RichText`。
3. 保留 PRD-06 配置、最近成功缓存、WebView、重试和返回降级链路。
4. 缓存提示和不可用态保持真实组件，并服从本页视觉体系。

### Task 6: 切图与 OSS 规则闭环

**Files:**

- Create: `miniapp/src/assets/lanhu/promotion/*.png`

**Steps:**

1. 从蓝湖原图按 Sketch 标注无损裁切人物和空态插画。
2. 英雄插画、空态插画作为独立非交互视觉资产；标题和文案保持真实文本。
3. 检查 `DEV_OSS_*` 上传参数；参数齐全时才通过 `npm run assets:upload-icons` 原字节上传。
4. 本次参数不齐全，停止 OSS 写入并将小型功能图标改为 DOM/CSS 原生绘制；不修改上传脚本或生成清单，不把静态小图标留在包内。

### Task 7: 构建、截图差异与验收（REFACTOR / VERIFY）

**Files:**

- Create: `docs/验收报告/截图证据/2026-07-29-邀请好友五页/运行态/*.png`
- Create: `docs/验收报告/2026-07-29-邀请好友五页-蓝湖还原-acceptance.md`

**Steps:**

1. 运行 PRD-07 静态门禁和小程序全量预构建门禁。
2. 构建 H5 与微信小程序。
3. 在 375×812 截取首页有记录、首页空态、首页完成 20 人、邀请记录、活动说明五个状态。
4. 逐页与蓝湖基线对照结构、尺寸、字体颜色、素材、交互和适配，低于 97 分继续修复。
5. 输出验收报告，列出截图证据、差异清单、评分和未关闭项。
