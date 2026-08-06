# 编辑资料整体 1:1 还原与回显闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以蓝湖编辑资料页面组为唯一视觉基线，闭环主编辑页和全部子页面的交互、比例、图标与保存回显，并保证“关于我”空数据时固定展示三项入口、填写后原位回显。

**Architecture:** 保留现有 `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper` 后端分层和小程序 `page -> prd01Api -> EventChannel` 数据链路。新增纯领域映射收敛“关于我”固定摘要项和最新/生效内容选择；页面继续使用真实 Taro 组件，不引入整页截图或透明热区。按“设计基线 -> 失败测试 -> 单页实现 -> 微信截图 -> 差异修复”的顺序逐页闭环。

**Tech Stack:** Taro 4、React 18、TypeScript、微信小程序自动化、Node.js `node:test`、Spring Boot 3.4 / JUnit 5（仅在后端契约受影响时执行）。

## Global Constraints

- 目标设计视口以蓝湖 375px 宽为基准，微信运行态补充 390×844；关键首屏还原度不得低于 97%。
- 非底部静态图标只允许复用现有 OSS 图标常量或按项目图标上传流程新增，不混用本地/远程同一图标。
- 所有按钮、输入框、Tab、弹层操作区必须是真实组件与真实事件。
- 保存后的父页只做 EventChannel 局部更新并保持滚动位置，不整页重载。
- 当前工作区已有其他任务改动，不回退、不覆盖无关文件。

---

## Task 1：锁定设计基线和当前差异

**Files:**

- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/05-编辑资料.webp`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/12-编辑资料-资料填写.webp`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/46-语音介绍.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/47-语音介绍-录制中.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/48-语音介绍-退出录音.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/49-语音介绍-点击播放.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/50-基本资料.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/51-爱听的歌曲.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/52-关于我.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/54-爱听的歌曲-添加成功.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/55-语音介绍-删除提示.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/57-自我介绍.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/80-语音介绍-录制完成.png`
- Read: `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/82-我的标签.png`
- Create: `docs/技术方案/2026-08-05-编辑资料整体-蓝湖还原-tcdesign.md`

- [ ] 记录每页画布、结构、间距、字体、颜色、圆角、图标和交互状态。
- [ ] 生成当前微信运行态截图，按页面列出差异与素材缺口。
- [ ] 明确“关于我”固定摘要项为 `meetingPreference`、`preferredActivities`、`housingStatus`。

## Task 2：先补失败测试

**Files:**

- Modify: `miniapp/scripts/test-profile-edit-closure.cjs`
- Create: `miniapp/src/domain/profileAboutPresentation.ts`
- Modify: `docs/测试文档/编辑资料蓝湖还原-testcase.md`

- [ ] 添加空接口/乱序接口下仍固定输出三项且顺序稳定的领域测试。
- [ ] 添加 `latestContent` 优先、`effectiveContent` 兜底的本人回显测试。
- [ ] 添加父页固定摘要、真实点击入口和局部更新的源码门禁。
- [ ] 添加关键页面比例、图标与真实交互控件门禁。
- [ ] 运行测试并记录预期失败，确认失败原因来自尚未实现的行为。

## Task 3：修复主编辑页和关于我闭环

**Files:**

- Modify: `miniapp/src/pages/profile/edit.tsx`
- Modify: `miniapp/src/pages/profile-edit/about.tsx`
- Modify: `miniapp/src/utils/profileEditEvents.ts`（仅类型契约需要时）
- Test: `miniapp/scripts/test-profile-edit-closure.cjs`

- [ ] 父页初始化和 EventChannel 更新统一走固定三项摘要映射。
- [ ] 空值显示三项标题与“去填写”，有值显示内容且仍可点击编辑。
- [ ] 关于我列表保留接口完整问题集，分类、选择、保存和返回状态与设计一致。
- [ ] 保存成功后父页原位回显，不触发整页请求和滚动归零。
- [ ] 对照 375px 蓝湖稿修正卡片高度、内边距、字号、行动文案和箭头图标。

## Task 4：逐页修复视觉与交互

**Files:**

- Modify: `miniapp/src/pages/profile/edit.tsx`
- Modify: `miniapp/src/pages/profile-edit/intro.tsx`
- Modify: `miniapp/src/pages/profile-edit/tags.tsx`
- Modify: `miniapp/src/pages/profile-edit/songs.tsx`
- Modify: `miniapp/src/pages/verification/basic.tsx`（仅发现与本轮设计稿不一致时）
- Modify: `miniapp/src/pages/verification/components/BasicInfoCard.tsx`（仅必要时）
- Modify: `miniapp/src/pages/verification/components/LanhuPickerSheet.tsx`（仅必要时）
- Modify: `miniapp/src/components/LanhuSubNav.tsx`（仅共享导航差异时）

- [ ] 主编辑页按蓝湖纵向节奏恢复资料评分、真实性提示、头图、六槽相册、卡片组。
- [ ] 统一图标来源、尺寸、对齐与可点击区域，移除近似字符箭头/加号造成的视觉偏差。
- [ ] 修正自我介绍、标签、歌曲、语音各默认态、已填态、加载态、弹层态和保存态。
- [ ] 每完成一页立即截图、列差异、修复后再进入下一页。

## Task 5：微信运行态闭环和文档交付

**Files:**

- Modify: `miniapp/scripts/capture-profile-edit-closure.cjs`
- Modify: `miniapp/scripts/verify-profile-edit-runtime.cjs`
- Modify: `docs/测试文档/编辑资料蓝湖还原-testreport.md`
- Create: `docs/验收报告/2026-08-05-编辑资料整体-蓝湖还原-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-08-05-编辑资料整体-蓝湖还原/`

- [ ] 微信自动化覆盖主编辑页首屏/中段/关于我、空值三项、填写保存回显、标签、歌曲、自我介绍、语音关键状态。
- [ ] 执行静态门禁、TypeScript/构建回归和 `git diff --check`。
- [ ] 逐页记录截图路径、差异修复、还原度评分和未闭环项。
- [ ] 最后重新执行正式发布构建，确保产物不残留开发固定登录。
