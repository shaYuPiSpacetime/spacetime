# 页面规格 - ADM-07-PAGE-promo-rule-config 推广规则配置页

> 涉及枚举/状态/权限/错误码/文案，一律引用全局定义、模块公共定义或模块端内定义。

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-06-24 | Codex | 版本 01：按最终确认口径收敛 |

- **页面 ID**：`ADM-07-PAGE-promo-rule-config`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_ADM-07_推广管理.md`
- **页面路由**：`/admin/promotion/rule-config`
- **入口来源**：推广管理菜单 → 推广规则配置
- **对应移动端**：`APP-07-PAGE-invite-home`、`APP-07-PAGE-invite-rules`

---

## 1. 页面定位

- **目标用户**：运营（普通裂变规则）、渠道运营（代理奖励规则）、风控（风控参数）、超管
- **核心任务**：配置普通用户奖励规则、代理奖励规则、关系有效期、风控参数
- **页面类型**：表单页（多 Tab）

---

## 2. 布局

### 2.1 整体布局

```
┌─────────────────────────────────────────────┐
│ Tab: 普通用户奖励 | 代理奖励 | 关系有效期 | 风控参数 │
├─────────────────────────────────────────────┤
│ 表单区（按 Tab 切换）                         │
│  普通用户奖励：5 类奖励事件 + 奖励方式 + 阶梯   │
│  代理奖励：5 类奖金事件配置                    │
│  关系有效期：普通/代理均永久有效               │
│  风控参数：阈值 + 开关                         │
├─────────────────────────────────────────────┤
│ 底部固定：保存（二次确认）                     │
└─────────────────────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|-----------|----------------|
| 普通用户奖励 Tab | Tab1 | 5 类奖励事件启用/金额、奖励方式、阶梯配置、上限、生效失效时间 | 否 | 是 |
| 代理奖励 Tab | Tab2 | 代理奖金规则组 + 5 类代理奖金事件（金额/生效时间/启用） | 否 | 是 |
| 关系有效期 Tab | Tab3 | 普通邀请关系、代理推广关系均为永久有效，只展示说明与后续新增奖励复用规则 | 否 | 是 |
| 风控参数 Tab | Tab4 | 单日上限/同设备/同手机/同支付阈值、冻结开关、人工复核开关 | 否 | 是 |

---

## 4. 字段表

### 4.1 规则列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 展示/排序规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|---------------|--------|--------|----------|----------|
| `ADM-07-PAGE-promo-rule-config-LIST-rule-name` | 规则名称 | string | 是 | — | 展示规则名称与备注 | — | 否 | 普通 | `promotion_rule.rule_name` |
| `...-LIST-rule-type` | 数据类型 | enum | 是 | 普通邀请/代理奖金/风控参数 | 只展示中文名称 | — | 否 | 普通 | `promotion_rule.rule_type` |
| `...-LIST-event-type` | 事件 | enum | 是 | 注册成功登录奖励/资料完善奖励/认证完成奖励/首次会员奖励/首次充值奖励等 | 只展示中文名称 | — | 否 | 普通 | `promotion_rule.event_type` |
| `...-LIST-reward` | 奖励 | decimal+enum | 是 | 金额+单位 | 千寻币/现金/计数/布尔值按中文单位展示 | — | 否 | 普通 | `promotion_rule.reward_amount` / `reward_unit` |
| `...-LIST-daily-limit` | 上限 | decimal | 否 | ≥0 | 无上限展示 `-` | — | 否 | 普通 | `promotion_rule.daily_limit` |
| `...-LIST-status` | 状态 | enum | 是 | 启用/停用 | 只展示中文名称；同一「数据类型+事件」启用状态只能存在一条数据 | 启用 | 可编辑 | 普通 | `promotion_rule.status` |
| `...-LIST-update-time` | 修改时间 | datetime | 是 | `yyyy-MM-dd HH:mm:ss` | 列表先按修改时间倒序，再按创建时间倒序 | — | 否 | 普通 | `promotion_rule.update_time` |
| `...-LIST-create-time` | 创建时间 | datetime | 是 | `yyyy-MM-dd HH:mm:ss` | 同修改时间相同时按创建时间倒序 | — | 否 | 普通 | `promotion_rule.create_time` |
| `...-LIST-updated-by` | 修改人 | string | 否 | 系统用户 | 展示昵称/账号，缺失展示用户 ID 或 `-` | — | 否 | 普通 | `promotion_rule.updated_by` |
| `...-LIST-created-by` | 创建人 | string | 否 | 系统用户 | 展示昵称/账号，缺失展示用户 ID 或 `-` | — | 否 | 普通 | `promotion_rule.created_by` |

> 列表约束：新增、编辑、启用规则时，若存在相同「数据类型 + 事件」且状态=启用的其他规则，应阻止保存并提示“同一数据类型、事件在启用状态下只能保留一条规则”。

### 4.2 表单字段

#### Tab1 普通用户奖励

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `ADM-07-PAGE-promo-rule-config-FIELD-event-enable` | 各奖励事件启用 | bool×5 | 是 | 注册成功登录奖励/资料完善奖励/认证完成奖励/首次会员奖励/首次充值奖励 | 只展示中文名称；首次配置前无默认值，需运营自行选择 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-event-enable` / `M07-ENUM-invite-reward-event` |
| `...-FIELD-reward-register` | 注册成功登录奖励币数 | int | 条件必填（启用时） | ≥0 | 整数 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-register` |
| `...-FIELD-reward-profile` | 资料完善奖励币数 | int | 条件必填（启用时） | ≥0 | 整数 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-profile` |
| `...-FIELD-reward-verify` | 认证完成奖励币数 | int | 条件必填（启用时） | ≥0 | 整数 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-verify` |
| `...-FIELD-reward-first-vip` | 首次会员奖励币数 | int | 条件必填（启用时） | ≥0 | 整数 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-first-vip` |
| `...-FIELD-reward-first-coin` | 首次充值奖励币数 | int | 条件必填（启用时） | ≥0 | 整数 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-first-coin` |
| `...-FIELD-success-metric` | 成功邀请统计节点 | enum | 是 | 注册成功登录/资料完善/认证完成/首次会员/首次充值 | 只展示中文名称；必须选择已启用或业务可用的节点；未配置时移动端不展示成功邀请/阶梯进度 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-success-metric` |
| `...-FIELD-reward-mode` | 奖励方式 | enum | 是 | 固定/阶梯 | 只展示中文名称 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-mode` |
| `...-FIELD-reward-cap` | 奖励上限 | int | 否 | ≥0 | — | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-cap` |
| `...-FIELD-effective-time` | 生效时间 | datetime | 否 | `yyyy-MM-dd HH:mm:ss` | 早于失效时间，统一展示到秒 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-effective-window` |
| `...-FIELD-expire-time` | 失效时间 | datetime | 否 | `yyyy-MM-dd HH:mm:ss` | 晚于生效时间，统一展示到秒 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-reward-effective-window` |
| `...-FIELD-ladder` | 阶梯配置 | json | 条件必填（阶梯方式） | 档位区间、单人币数、是否启用、备注均后台自定义 | 区间不可重叠、起止人数合法、启用档位币数必填 | 无 | 运营/超管 | 普通 | `M07-CFG-invite-ladder` / `M07-RULE-invite-ladder` |

#### Tab2 代理奖励

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `...-FIELD-agent-bonus-rules` | 代理奖金规则组 | json | 是 | 规则组名称、是否启用、适用说明、5 类奖金事件配置 | 规则组名称唯一；已绑定代理的规则组不可删除，仅可停用后不再新增绑定 | 无 | 渠道运营/超管 | 普通 | `M07-CFG-agent-bonus-rules` |
| `...-FIELD-agent-bonus-events` | 代理奖金事件 | json×5 | 是 | 注册成功登录/资料完善/认证完成/首次会员/首次充值，每项：单次金额+生效时间+是否启用 | 金额≥0；首次会员/首次充值依赖 PRD-04 支付成功事件；只展示中文名称 | 无 | 渠道运营/超管 | 普通 | `M07-CFG-agent-bonus-rules` |

> 说明：代理奖励默认走奖金/佣金台账，不走千寻币到账；首版不做自动打款；代理成功邀请人数口径统一取后台 `M07-RULE-invite-success` 配置节点。
> 付费归因规则：代理关系永久有效，首次会员/首次充值千寻币继续归因原代理；不做续费、复购、长期消费分成（`M07-RULE-agent-paid-attribution`）。
> 代理列表新增/编辑代理时的「奖金规则组」下拉来源于本 Tab 的 `M07-CFG-agent-bonus-rules`，首版不新增单独的代理组管理页。

#### Tab3 关系有效期

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `...-FIELD-normal-expire` | 普通邀请关系有效期 | enum | 是 | 永久有效 | 只展示中文名称；不可编辑 | 永久有效 | 否 | 普通 | `M07-CFG-invite-relation-expire` |
| `...-FIELD-agent-expire` | 代理推广关系有效期 | enum | 是 | 永久有效 | 只展示中文名称；不可编辑 | 永久有效 | 否 | 普通 | `M07-CFG-agent-relation-expire` |
| `...-FIELD-validity-note` | 有效期说明 | string | 是 | — | — | 奖励完成后通常无实际作用，后续新增奖励事件可复用归因 | 否 | 普通 | `M07-RULE-invite-relation-validity` |

#### Tab4 风控参数

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `...-FIELD-daily-cap` | 单日奖励上限 | int | 是 | ≥0 | — | 无 | 风控/超管 | 普通 | `M07-CFG-invite-daily-cap` |
| `...-FIELD-device-threshold` | 同设备邀请阈值 | int | 是 | ≥1 | — | 无 | 风控/超管 | 普通 | `M07-CFG-invite-device-threshold` |
| `...-FIELD-phone-threshold` | 同手机号异常阈值 | int | 是 | ≥1 | — | 无 | 风控/超管 | 普通 | `M07-CFG-invite-phone-threshold` |
| `...-FIELD-payment-threshold` | 同支付账号异常阈值 | int | 是 | ≥1 | — | 无 | 风控/超管 | 普通 | `M07-CFG-invite-payment-threshold` |
| `...-FIELD-freeze-switch` | 冻结开关 | bool | 是 | 开/关 | — | 开 | 风控/超管 | 普通 | `M07-CFG-invite-freeze-switch` |
| `...-FIELD-review-switch` | 人工复核开关 | bool | 是 | 开/关 | — | 开 | 风控/超管 | 普通 | `M07-CFG-invite-review-switch` |

---

## 5. 操作表

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `ADM-07-PAGE-promo-rule-config-ACT-save` | 保存 | 底部 | 表单校验通过 | 对应 Tab 权限（见 ADM-07_端内定义.md 第 2.2 节） | 是「确认修改规则？将立即生效」 | toast 保存成功，规则即时生效，记审计日志 | 校验失败逐项提示；无权限置灰 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 奖励方式 | 选「阶梯」 | 阶梯配置 | 展开后台配置的阶梯明细，固定方式时隐藏 | |
| 各奖励事件启用 | 关闭 | 对应币数 | 置灰对应币数输入 | |
| 代理奖金规则组 | 停用 | 代理列表新增/编辑表单 | 停用规则组不再允许新代理选择；历史代理按停用后的规则不再新增计奖 | `M07-CFG-agent-bonus-rules` |
| 关系有效期 | 固定永久有效 | 有效期输入 | 不展示可编辑天数字段，仅展示说明 | |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 首次加载配置 | 骨架屏 | 无 | — |
| 错误态（网络/服务端） | 保存失败 | toast + 重试 | 重试 | — |
| 无权限态 | 角色无对应 Tab 权限 | 该 Tab 只读或隐藏，保存置灰 | 无 | ADM-07_端内定义.md 第 2.2 节 |
| 业务态-未配置 | 首次进入无默认值 | 提示需填写奖励金额、成功统计节点、阶梯/上限、代理奖金规则组等配置 | 配置 | — |

---

## 9. 验收标准

```
AC-ID: ADM-07-AC-rule-save
Given 运营角色（GLB-ROLE-operation）在普通用户奖励 Tab
When  修改认证完成奖励币数并点击保存，确认二次弹窗
Then  M07-CFG-invite-reward-verify 更新并立即生效，写审计日志（操作人+时间），移动端下次取数生效

AC-ID: ADM-07-AC-agent-bonus-rule-save
Given 渠道运营角色（GLB-ROLE-channel-op）在代理奖励 Tab
When  新增一个奖金规则组，配置 5 类奖金事件金额/启用状态并保存
Then  M07-CFG-agent-bonus-rules 更新并立即生效，代理列表新增/编辑代理时可选择该规则组

AC-ID: ADM-07-AC-rule-ladder-validate
Given 奖励方式选「阶梯」
When  启用档位的起止人数重叠或币数为空时保存
Then  校验拦截，提示档位区间/币数错误，不保存

AC-ID: ADM-07-AC-rule-no-permission
Given 财务角色（GLB-ROLE-finance）
When  进入风控参数 Tab
Then  风控参数只读，保存按钮置灰
```

### 验收标准清单

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `ADM-07-AC-rule-save` | 规则保存生效 | 正常 | P0 |
| `ADM-07-AC-agent-bonus-rule-save` | 代理奖金规则组保存生效 | 正常 | P0 |
| `ADM-07-AC-rule-ladder-validate` | 阶梯校验 | 异常 | P0 |
| `ADM-07-AC-rule-no-permission` | 无权限 | 异常 | P0 |

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块枚举 | `M07-ENUM-invite-reward-event` | 奖励事件 |
| 依赖的模块规则 | `M07-RULE-invite-ladder` / `-success` / `-antifraud` / `-daily-cap` | 规则口径 |
| 依赖的模块配置项 | `M07-CFG-invite-*` / `M07-CFG-agent-bonus-rules` | 全部规则配置 |
| 依赖的全局权限 | `GLB-ROLE-operation` / `-channel-op` / `-risk` / `-super-admin` | 分 Tab 权限 |
| 依赖的模块文案 | `M07-TXT-*` | 见 `../../PRD-07_模块公共定义.md` 第 8 节；文案在 `ADM-GLB-PAGE-copy-message-center` 的「推广裂变」分组配置，本页只配置奖励/风控/关系规则 |
| 依赖的模块端内定义 | `../ADM-07_端内定义.md` | 权限矩阵、UI 状态 |
| 对应移动端页面 | `APP-07-PAGE-invite-home` / `-rules` | 规则消费方 |
