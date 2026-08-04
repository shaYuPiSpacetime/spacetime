# 登录出生日期三列滚轮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首次资料填写的出生日期控件改成可独立滑动、联动后始终合法的年/月/日三列原生滚轮。

**Architecture:** 使用 Taro `PickerView` 和三个 `PickerViewColumn` 承载原生惯性滚动；把日期天数、索引修正、默认值和提交格式化下沉到无框架依赖的 `birthDateWheel.ts`。页面只维护三列索引，年月变化时通过纯函数将日索引收敛到当前月份有效范围。

**Tech Stack:** Taro 4.1、React 18、TypeScript 5.6、Node.js `node:test`、微信小程序原生 `picker-view`。

## Global Constraints

- 页面范围仅限 `miniapp/src/pages/login/age.tsx` 及其样式、领域函数和专项门禁。
- 复用现有登录资料页壳、背景和下一步按钮，不改接口协议与首登步骤。
- 年、月、日必须都能独立触摸滑动，选中项居中并保持蓝色选中框。
- 日期必须满足公历月份天数与闰年规则，提交格式固定为 `yyyy-MM-dd`。
- 不覆盖仓库中现有 PRD-05 社区相关未提交改动；本任务不自动提交 Git。

---

### Task 1: 日期滚轮领域逻辑

**Files:**
- Create: `miniapp/src/domain/birthDateWheel.ts`
- Modify: `miniapp/scripts/test-login-pending-items-closure.cjs`

**Interfaces:**
- Consumes: 年份标签数组，如 `['1977年']`；滚轮索引 `[yearIndex, monthIndex, dayIndex]`。
- Produces: `getDaysInMonth(year, monthIndex)`、`normalizeBirthDateSelection(years, selection)`、`resolveBirthDateInitialValue(birthday, years)`、`formatBirthDate(years, selection)`。

- [ ] **Step 1: 写失败测试**

```js
test('出生日期滚轮按闰年和月份生成合法天数', () => {
  const wheel = requireBirthDateWheel()
  assert.equal(wheel.getDaysInMonth(2024, 1), 29)
  assert.equal(wheel.getDaysInMonth(2023, 1), 28)
  assert.equal(wheel.getDaysInMonth(2024, 3), 30)
})

test('月份从 31 天切到 2 月时自动修正日期', () => {
  const wheel = requireBirthDateWheel()
  assert.deepEqual(
    wheel.normalizeBirthDateSelection(['2024年'], [0, 1, 30]),
    [0, 1, 28]
  )
  assert.equal(wheel.formatBirthDate(['2024年'], [0, 1, 28]), '2024-02-29')
})
```

- [ ] **Step 2: 运行测试确认按预期失败**

Run: `npm --prefix miniapp run validate:login-closure`

Expected: FAIL，提示缺少 `src/domain/birthDateWheel.ts`。

- [ ] **Step 3: 编写最小领域实现**

```ts
export type BirthDateSelection = [number, number, number]

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function normalizeBirthDateSelection(
  years: string[],
  selection: readonly number[],
): BirthDateSelection {
  const yearIndex = clamp(selection[0] || 0, 0, Math.max(years.length - 1, 0))
  const monthIndex = clamp(selection[1] || 0, 0, 11)
  const year = Number(years[yearIndex]?.replace('年', ''))
  const maxDayIndex = Number.isFinite(year) ? getDaysInMonth(year, monthIndex) - 1 : 0
  return [yearIndex, monthIndex, clamp(selection[2] || 0, 0, maxDayIndex)]
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm --prefix miniapp run validate:login-closure`

Expected: PASS，闰年、平年、30 天月份及日期修正测试全部通过。

### Task 2: 三列原生滚轮页面

**Files:**
- Modify: `miniapp/src/pages/login/age.tsx`
- Modify: `miniapp/src/pages/login/age.scss`
- Modify: `miniapp/scripts/test-login-pending-items-closure.cjs`

**Interfaces:**
- Consumes: Task 1 的合法化与格式化函数、接口年龄范围和已有生日。
- Produces: 三列 `PickerViewColumn`，统一 `onChange` 后写入合法索引，并向原接口提交 `yyyy-MM-dd`。

- [ ] **Step 1: 写滚轮结构失败测试**

```js
test('出生日期使用年月日三列原生滚轮并联动合法日期', () => {
  const age = read('src/pages/login/age.tsx')
  assert.match(age, /PickerView/)
  assert.equal((age.match(/<PickerViewColumn/g) || []).length, 3)
  assert.match(age, /normalizeBirthDateSelection/)
  assert.doesNotMatch(age, /const ROWS/)
})
```

- [ ] **Step 2: 运行测试确认旧实现失败**

Run: `npm --prefix miniapp run validate:login-closure`

Expected: FAIL，旧页面没有 `PickerView`，仍存在静态 `ROWS`。

- [ ] **Step 3: 替换为原生滚轮**

```tsx
<PickerView
  className="login-age-picker"
  indicatorStyle="height: 128rpx;"
  value={value}
  onChange={event => setValue(normalizeBirthDateSelection(years, event.detail.value))}
>
  <PickerViewColumn>{renderItems(years)}</PickerViewColumn>
  <PickerViewColumn>{renderItems(MONTHS)}</PickerViewColumn>
  <PickerViewColumn>{renderItems(days)}</PickerViewColumn>
</PickerView>
```

- [ ] **Step 4: 运行专项测试确认通过**

Run: `npm --prefix miniapp run validate:login-closure`

Expected: PASS，原生三列结构、联动函数和旧静态行移除均通过。

### Task 3: 构建与单页验收

**Files:**
- Create: `docs/验收报告/2026-08-03-登录出生日期选择器-蓝湖还原-acceptance.md`
- Create: `docs/验收报告/证据/2026-08-03-login-birthday-picker/`

**Interfaces:**
- Consumes: 完成后的微信小程序构建产物与用户截图基线。
- Produces: 构建结果、默认态/滚动态/月份边界态差异清单和还原度评分。

- [ ] **Step 1: 执行 TypeScript/登录专项门禁**

Run: `npm --prefix miniapp run validate:login-closure`

Expected: PASS，全部登录闭环测试通过且无失败。

- [ ] **Step 2: 执行微信小程序完整构建**

Run: `npm --prefix miniapp run build:weapp`

Expected: exit 0；前置门禁、Taro 编译、页面注册及包体检查全部通过。

- [ ] **Step 3: 采集页面截图并复核交互状态**

默认态核对三列居中和选中框；滚动年、月、日分别确认惯性滚动；切换 `1 月 31 日 -> 2 月` 确认日期回落；验证 2024 年 2 月可选择 29 日。

- [ ] **Step 4: 写验收报告**

报告记录设计来源、视口、组件映射、截图证据、差异、评分和无法自动化的真机手感项；不得在无截图时声明达到高还原门禁。

## Self-Review

- 需求覆盖：年/月/日独立滑动、日期联动、闰年、默认值、提交格式、视觉选中态和构建验证均有对应任务。
- 占位符检查：无 `TBD`、`TODO` 或未定义接口。
- 类型一致性：页面与测试统一使用 `BirthDateSelection = [number, number, number]`，月份索引为 `0-11`，日期索引为 `0-(days-1)`。
