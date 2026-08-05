# 社区话题列表与发布动态 UI 修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除“社区话题-列表”的系统标题与返回箭头重复问题，并按蓝湖发布动态稿恢复首屏、图片状态、话题胶囊和工具栏图标。

**Architecture:** 继续复用项目统一 `NativeNavigation`，通过页面级 `navigationStyle: 'custom'` 关闭微信原生导航。发布动态保留现有业务状态与接口，仅替换展示结构和字符占位图标，不改变上传、草稿、话题选择和发布协议。

**Tech Stack:** Taro 4、React 18、TypeScript、微信小程序、Node.js 静态门禁、微信开发者工具自动化。

## Global Constraints

- 不覆盖工作区中关系反馈模块的未提交改动。
- 禁止整页截图、透明热区和字符冒充图标。
- 空白发布态、单图态、满九图态、话题选中态均以蓝湖 375×812 基线为准。
- 先写失败门禁，再改生产代码；完成前必须执行专项门禁、正式构建和运行态截图核对。

---

## Task 1：锁定重复导航根因

- [x] 在 `miniapp/scripts/validate-qianxun-topic-demo-closure.mjs` 增加 `topics.config.ts` 与 `navigationStyle: 'custom'` 断言。
- [x] 运行门禁并确认先失败。
- [x] 新增 `miniapp/src/pages/qianxun/topics.config.ts`，只关闭原生导航，不改列表业务逻辑。
- [x] 重跑门禁确认通过。

## Task 2：发布动态首屏与图标还原

- [x] 在同一专项门禁中约束图片/视频/表情真实图标、加图与删除图标、话题胶囊图标和空白态结构。
- [x] 运行门禁并确认现有字符图标与空白加图块触发失败。
- [x] 修改 `miniapp/src/pages/qianxun/compose.tsx`：空白态不显示加图块，已有图片时显示加图块；移除设计稿不存在的图片计数；用真实 View 图形组件替换字符图标。
- [x] 对齐话题胶囊的蓝色 `#` 圆标、选中关闭态和未选箭头态。
- [x] 重跑专项门禁确认通过。

## Task 3：运行态闭环

- [x] 构建微信小程序并用开发者工具分别打开社区话题列表、发布动态页面。
- [x] 截取当前微信模拟器 390×844 运行图，对照 `031.png`、`013.png`、`020.png`、`191.png` 检查顶部导航、底部固定栏与图标。
- [x] 根据截图差异修正并再次截图，直至首屏达到交付门禁。
- [x] 执行 `npm --prefix miniapp run build:weapp`、专项门禁和 `git diff --check`。
- [x] 更新技术方案与验收报告，记录证据和剩余差异。
