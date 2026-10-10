# 外层“关于我”动态展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“编辑资料”外层“关于我”卡片与内层页面消费同一份后台字段配置，并让主展示项与推荐项互斥。

**Architecture:** 将外层卡片的主展示项和推荐项合并为一个纯领域函数输出；页面只保存接口返回的原始题目，配置显隐与展示分组全部由 `usePrd01Store.config.fieldSettings` 派生。内层页面保持不变。

**Tech Stack:** React 18、TypeScript 5.6、Taro 4.1、Node `node:test`。

## Global Constraints

- 只在 `master` 修改，开始时必须与 `origin/master` 同步。
- 不提交工作区现有无关删除、构建缓存和测试产物。
- 本轮未获提交或推送授权，不执行 `git commit`、`git push`。
- 后台配置为不展示的问题，在外层卡片任何位置都不得出现。
- 内层 `miniapp/src/pages/profile-edit/about.tsx` 不改业务行为。

---

### Task 1: 用纯领域模型生成互斥的主展示项和推荐项

**Files:**
- Modify: `miniapp/src/domain/profileAboutPresentation.ts`
- Test: `miniapp/scripts/test-profile-edit-closure.cjs`

**Interfaces:**
- Consumes: `AboutMeQuestion[]`，调用方传入已按后台配置过滤的题目。
- Produces: `buildProfileAboutSection(questions): { items: ProfileAboutSummaryItem[]; prompts: ProfileAboutSummaryItem[]; visible: boolean }`。

- [ ] **Step 1: 写失败测试**

在 `test-profile-edit-closure.cjs` 中用 6 个问题覆盖：已填写项优先、主展示最多 3 条、推荐只取未填写且未进入主展示的前 3 条、两组 key 无交集、空输入返回 `visible: false`。

```js
const { buildProfileAboutSection } = loadTypeScriptModule(presentationPath)
const section = buildProfileAboutSection(configuredQuestions)
assert.deepEqual(section.items.map(item => item.key), ['housingStatus', 'carStatus', 'childrenPlan'])
assert.deepEqual(section.prompts.map(item => item.key), ['hasChild', 'meetingPreference', 'preferredActivities'])
assert.equal(section.items.some(item => section.prompts.some(prompt => prompt.key === item.key)), false)
assert.deepEqual(buildProfileAboutSection([]), { items: [], prompts: [], visible: false })
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd miniapp && node --test scripts/test-profile-edit-closure.cjs`

Expected: FAIL，提示 `buildProfileAboutSection is not a function`。

- [ ] **Step 3: 实现最小领域函数**

在 `profileAboutPresentation.ts` 中增加：

```ts
export type ProfileAboutSection = {
  items: ProfileAboutSummaryItem[]
  prompts: ProfileAboutSummaryItem[]
  visible: boolean
}

export function buildProfileAboutSection(
  questions: Array<Pick<AboutMeQuestion, 'questionKey' | 'title' | 'placeholder' | 'latestContent' | 'effectiveContent'>> = [],
): ProfileAboutSection {
  const filled = questions.filter(question => Boolean(resolveOwnerVisibleText(question)))
  const unfilled = questions.filter(question => !resolveOwnerVisibleText(question))
  const selected = [...filled, ...unfilled].slice(0, 3)
  const selectedKeys = new Set(selected.map(question => question.questionKey))
  const prompts = unfilled
    .filter(question => !selectedKeys.has(question.questionKey))
    .slice(0, 3)
  return {
    items: selected.map(question => toProfileAboutSummaryItem(question, resolveOwnerVisibleText(question))),
    prompts: prompts.map(question => toProfileAboutSummaryItem(question, '')),
    visible: questions.length > 0,
  }
}
```

保留现有预览函数；旧的 `buildProfileAboutPrompts`、`buildProfileAboutSummary` 只在确认无其他调用后删除。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd miniapp && node --test scripts/test-profile-edit-closure.cjs`

Expected: PASS。

### Task 2: 外层页面统一消费 Store 配置和领域模型

**Files:**
- Modify: `miniapp/src/pages/profile/edit.tsx`
- Test: `miniapp/scripts/test-profile-edit-closure.cjs`

**Interfaces:**
- Consumes: Task 1 的 `buildProfileAboutSection`。
- Produces: 外层卡片只渲染 `aboutSection.items` 与 `aboutSection.prompts`。

- [ ] **Step 1: 写页面契约失败测试**

```js
assert.match(edit, /filterVisibleAboutQuestions\(aboutQuestions, config\?\.fieldSettings \|\| \[\]\)/)
assert.match(edit, /buildProfileAboutSection\(configuredAboutQuestions\)/)
assert.doesNotMatch(edit, /home\.fieldSettings \|\| basicResult\.fieldSettings/)
assert.match(edit, /aboutSection\.visible \? \(/)
assert.match(edit, /prompts\.length > 0 \? \(/)
assert.match(edit, /onClick=\{\(\) => onClick\(item\.key\)\}/)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd miniapp && node --test scripts/test-profile-edit-closure.cjs`

Expected: FAIL，页面仍使用接口配置快照和重复 prompt 生成逻辑。

- [ ] **Step 3: 改为派生状态**

在页面中保留原始 `aboutQuestions`，删除 `fieldSettings`、`aboutVisibilityReady`、`aboutTopics` 的重复状态，增加：

```ts
const configuredAboutQuestions = useMemo(
  () => filterVisibleAboutQuestions(aboutQuestions, config?.fieldSettings || []),
  [aboutQuestions, config?.fieldSettings],
)
const aboutSection = useMemo(
  () => buildProfileAboutSection(configuredAboutQuestions),
  [configuredAboutQuestions],
)
const previewAboutTopics = useMemo(
  () => buildProfilePreviewAboutSummary(configuredAboutQuestions),
  [configuredAboutQuestions],
)
```

初始化和子页面回传都只执行 `setAboutQuestions(...)`。渲染改为：

```tsx
{aboutSection.visible ? (
  <AboutDetailSection
    items={aboutSection.items}
    prompts={aboutSection.prompts}
    onAdd={() => handleProfileAction('关于我', '/pages/profile-edit/about')}
    onFill={key => handleProfileAction('关于我', `/pages/profile-edit/about?topic=${key}`)}
  />
) : null}
```

- [ ] **Step 4: 推荐区域按剩余题目动态显隐并直达题目**

将 `AboutStoryChips` 的回调改为 `(key: string) => void`，点击 chip 调用 `onClick(item.key)`；仅在 `prompts.length > 0` 时渲染分隔线、标题和 chips。“去添加”按钮保留为进入全部题目的入口。

- [ ] **Step 5: 运行相关测试**

Run: `cd miniapp && node --test scripts/test-profile-edit-closure.cjs scripts/test-profile-score-refresh.cjs`

Expected: PASS。

### Task 3: 构建回归

**Files:**
- Verify only: `miniapp/`

- [ ] **Step 1: 运行 PRD01 和完整小程序构建**

Run: `cd miniapp && npm run validate:prd01-handoff`

Expected: PASS。

Run: `cd miniapp && npm run build:weapp`

Expected: build 与 postbuild 校验全部 PASS。

- [ ] **Step 2: 核对任务差异**

Run: `git diff -- miniapp/src/domain/profileAboutPresentation.ts miniapp/src/pages/profile/edit.tsx miniapp/scripts/test-profile-edit-closure.cjs`

Expected: 只有外层“关于我”领域分组、页面消费及测试变化，内层页面没有改动。
