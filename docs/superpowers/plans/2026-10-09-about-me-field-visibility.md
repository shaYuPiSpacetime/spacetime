# “关于我”字段动态展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小程序仅展示后台字段配置中 `visible !== false` 的“关于我”题目和分类，不修改后端接口及提交限制。

**Architecture:** 在独立领域模块中集中维护 11 个题目与分类映射，并提供题目、分类和摘要默认项的纯函数过滤。资料编辑页与“关于我”子页共同消费该领域模块，避免页面各自解释后台配置。

**Tech Stack:** Taro、React、TypeScript、Zustand、Node test runner

## Global Constraints

- 仅修改小程序，不修改后端返回和提交校验。
- 字段配置缺失时默认展示，兼容旧配置。
- 已关闭字段的历史回答只隐藏、不删除。
- 不提交、不推送、不发布，除非用户另行明确要求。

---

### Task 1: 建立“关于我”可见性领域模型

**Files:**
- Create: `miniapp/src/domain/profileAboutVisibility.ts`
- Modify: `miniapp/scripts/test-profile-edit-closure.cjs`

**Interfaces:**
- Produces: `filterVisibleAboutQuestions(questions, fieldSettings)`、`buildVisibleAboutTabs(questions)`、`visibleAboutFieldKeys(fieldSettings)`。

- [x] **Step 1: 写失败测试**：覆盖 `visible=false` 过滤、配置缺失默认展示、空分类隐藏。
- [x] **Step 2: 运行 `node --test scripts/test-profile-edit-closure.cjs`，确认因函数不存在而失败。**
- [x] **Step 3: 实现纯函数与 11 个字段/四个分类映射。**
- [x] **Step 4: 重跑测试并确认通过。**

### Task 2: “关于我”子页动态过滤题目和 Tab

**Files:**
- Modify: `miniapp/src/pages/profile-edit/about.tsx`
- Modify: `miniapp/scripts/test-profile-edit-closure.cjs`

**Interfaces:**
- Consumes: Task 1 的过滤函数和动态 Tab。

- [x] **Step 1: 写失败闭环测试**：页面必须读取 `config.fieldSettings`，列表和 Tab 必须消费过滤结果。
- [x] **Step 2: 运行测试确认失败。**
- [x] **Step 3: 页面接入 Zustand 运行配置；关闭字段不展示，空分类不展示，关闭 topic 回退列表。**
- [x] **Step 4: 重跑测试确认通过。**

### Task 3: 资料编辑页摘要同步显隐

**Files:**
- Modify: `miniapp/src/domain/profileAboutPresentation.ts`
- Modify: `miniapp/src/pages/profile/edit.tsx`
- Modify: `miniapp/scripts/test-profile-edit-closure.cjs`

**Interfaces:**
- `buildProfileAboutSummary(questions, visibleFieldKeys?)`：传入可见字段集合时，默认摘要仅保留可见项。

- [x] **Step 1: 写失败测试**：已关闭默认摘要不得出现，全部关闭时不渲染“关于我”区块。
- [x] **Step 2: 运行测试确认失败。**
- [x] **Step 3: 加载和局部更新时先过滤问题，再生成摘要；页面按可见问题数量渲染区块。**
- [x] **Step 4: 重跑测试确认通过。**

### Task 4: 验证

**Files:**
- Verify only

- [x] **Step 1: 运行 `node --test scripts/test-profile-edit-closure.cjs`。**（本次相关 6 条通过；全脚本 35/37，剩余 2 条为既有背景图/语音源码匹配断言）
- [x] **Step 2: 运行相关资料配置/一致性门禁。**（4/4 通过）
- [x] **Step 3: 运行 `npx tsc --noEmit --pretty false`。**（本次文件无错误；仓库既有 Taro 类型依赖及其他页面错误仍存在）
- [x] **Step 4: 检查目标文件 diff，确认无后端和无关业务改动。**
