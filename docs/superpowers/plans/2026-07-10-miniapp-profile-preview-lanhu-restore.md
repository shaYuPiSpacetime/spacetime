# 主页预览蓝湖还原实施计划

> **供智能执行者使用：** 必须按任务逐项执行，并在完成后更新复选框状态。

**目标：** 按蓝湖“主页预览”稿重建小程序公开资料预览长页，并使编辑资料页的顶部标签能够实际进入和返回该页面。

**架构：** 在不改变“我的”默认页的前提下，为 `profile/index` 的 `variant=preview` 渲染独立预览长页；编辑页与预览页复用同一个顶部双标签组件，避免两端的安全区、文字和下划线定位逐步漂移。页面继续读取 `lanhuDemo` 及现有资料 mock，运行期只使用组件与已有局部图片资产。

**技术栈：** Taro React、TypeScript、内联 rpx 样式、Node 原生 `assert` 静态校验。

## 全局约束

- 设计基线为 `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/03-主页预览.webp`，仅用于验收，不得进入运行包。
- 不回滚用户已有的 `miniapp` 商业化改动或其他未提交文件。
- 蓝湖 MCP 对该稿返回 `totalSlices=0`；不得从整页参考图裁剪运行素材。
- 缺失的相册图以已有主图进行结构化占位，并在验收报告中登记，不以高保真素材宣称。
- 代码注释和文档保持中文。

---

### 任务 1：主页预览红灯门禁

**文件：**

- 修改：`miniapp/scripts/validate-profile-guest-ui-coverage.mjs`

**接口：**

- 消费：`miniapp/src/pages/profile/index.tsx`、`miniapp/src/pages/profile/edit.tsx`
- 产出：主页预览完整结构和双标签真实跳转的静态门禁

- [x] **步骤 1：编写失败校验**

要求预览页拥有导航、首图、资料、标签、介绍、相册、认证、歌曲、MBTI 等真实组件，并禁止引用整页蓝湖截图；要求编辑页“主页预览”标签跳转至 `/pages/profile/index?variant=preview`。

- [x] **步骤 2：运行红灯**

运行：`cd miniapp && node scripts/validate-profile-guest-ui-coverage.mjs`

预期：失败，原因是当前页面只有 `PreviewProfileCard` 提示卡且顶部标签只改变局部状态。

### 任务 2：双标签导航与预览页面

**文件：**

- 新增：`miniapp/src/components/ProfilePreviewTopNav.tsx`
- 修改：`miniapp/src/pages/profile/edit.tsx`
- 修改：`miniapp/src/pages/profile/index.tsx`

**接口：**

- 消费：`getWindowMetrics()`、`navigateBackOrRedirect()`、`getDemoPageData('profile')`
- 产出：`ProfilePreviewTopNav`，支持 `form | preview` 激活状态及真实跳转；`variant=preview` 的公开资料预览长页

- [x] **步骤 1：抽取双标签顶部导航**

将编辑页顶部安全区、返回热区、双标题和下划线抽成共享组件；编辑页的“主页预览”标签通过 `Taro.navigateTo` 进入预览路由。

- [x] **步骤 2：实现主页预览首屏与资料卡**

按蓝湖参考实现首图、头像、昵称、认证、情感状态、基础资料、标签与自我介绍。所有文案保持真实文本、所有点击区域与可见组件一致。

- [x] **步骤 3：实现后续资料区块**

补齐相册、认证、歌曲和 MBTI 区块；相册素材缺口使用可替换的结构化图片组件，而非整页热区。

### 任务 3：绿灯验证与验收记录

**文件：**

- 修改：`miniapp/scripts/validate-profile-guest-ui-coverage.mjs`
- 新增：`docs/验收报告/2026-07-10-主页预览-蓝湖还原-acceptance.md`

**接口：**

- 消费：蓝湖整页参考图、静态门禁执行结果与 H5 截图证据
- 产出：可复核的差异清单、还原度评分与素材缺口记录

- [x] **步骤 1：运行绿灯**

运行：`cd miniapp && node scripts/validate-profile-guest-ui-coverage.mjs`，再执行可用的 TypeScript 或 H5 构建校验。

- [x] **步骤 2：按小程序构建路径记录验收**

用户明确要求只执行微信小程序编译，不执行 H5 截图。已以蓝湖基线、静态门禁与微信小程序构建替代截图验证，并在验收报告记录未闭环素材及评分。
