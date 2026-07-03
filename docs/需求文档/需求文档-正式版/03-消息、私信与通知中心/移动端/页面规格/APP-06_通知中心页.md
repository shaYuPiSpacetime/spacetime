# 页面规格 - APP-03-PAGE-notification-center 通知中心页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-02 | Codex | 按第 1 轮 Claude 核查补充邀请响应跳转和移动端展示属性 |
| 版本01 | 2026-07-02 | Codex | 初稿 |

- **页面 ID**：`APP-03-PAGE-notification-center`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-03_消息、私信与通知中心.md`
- **页面路由**：`/pages/message/notifications`
- **入口来源**：消息列表右上角通知、官方消息卡片
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端页面**：MVP-PAGE-038 / APP-PAGE-054

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：查看互动、系统、资产、活动和邀请响应等站内通知
- **页面类型**：列表页

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌────────────────────────────┐
│ 返回  通知中心      全部已读│
├────────────────────────────┤
│ 类型筛选：全部/互动/系统... │
├────────────────────────────┤
│ 通知列表                    │
└────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 顶部栏 | 顶部 | 返回、标题、全部已读 | 否 | 否 |
| 类型筛选 | 顶部下方 | 全部、互动、系统、资产、活动 | 否 | 本次页面内保留 |
| 通知列表 | 主体 | 标题、摘要、时间、未读点 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

| 弹层 | 触发方式 | 大小 | 内容 | 关闭方式 |
|------|----------|------|------|----------|
| 全部已读确认 | 点击全部已读且未读数 > 0 | 底部确认弹窗 | 确认将当前通知全部置已读 | 取消/确认 |

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-03-notify-center-01` | 通知中心页-主页面 | 类型筛选、列表、未读点 | P0 |
| `APP-03-notify-center-02` | 通知中心页-空态 | 无通知 | P0 |
| `APP-03-notify-center-03` | 通知中心页-筛选无结果 | 清除筛选 | P1 |
| `APP-03-notify-center-04` | 通知中心页-全部已读确认 | 确认弹窗 | P1 |

### 2.5 编辑控件口径

本页无表单编辑；类型筛选使用 segmented control。

---

## 3. 筛选与搜索

### 3.1 搜索

首版不提供关键词搜索。

### 3.2 筛选条件

| 筛选 ID | 筛选名 | 类型 | 选项来源 | 是否多选 | 默认值 | 是否可清除 |
|---------|--------|------|----------|----------|--------|------------|
| `APP-03-PAGE-notification-center-FILTER-type` | 通知类型 | 分段控件 | `M03-ENUM-notification-type` | 否 | 全部 | 是 |
| `APP-03-PAGE-notification-center-FILTER-biz-type` | 业务类型 | 二级筛选标签 | `M03-ENUM-notification-biz-type`；一级选择互动时显式展示邀请响应 | 否 | 全部 | 是 |

### 3.3 筛选交互

- 筛选项变化后：自动查询
- 是否显示当前筛选条件标签：否
- 筛选条件是否在 URL 上持久化：否

---

## 4. 字段表

### 4.1 列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-03-PAGE-notification-center-FIELD-notice-no` | 通知编号 | string | 是 | 业务编号 | 当前用户可访问 | 无 | 不可编辑 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-center-FIELD-notice-type` | 通知类型 | enum | 是 | `M03-ENUM-notification-type` | 展示中文 | `system` | 系统生成 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-center-FIELD-biz-type` | 业务类型 | enum | 是 | `M03-ENUM-notification-biz-type` | 展示中文 | 无 | 系统生成 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-center-FIELD-title` | 标题 | string | 是 | 1-50 字 | 模板渲染后非空 | 无 | 后台模板配置 | 普通 | 文案与消息中心 |
| `APP-03-PAGE-notification-center-FIELD-summary` | 摘要 | string | 否 | 0-80 字 | 超长省略 | 无 | 后台模板配置 | 普通 | 文案与消息中心 |
| `APP-03-PAGE-notification-center-FIELD-created-time` | 时间 | datetime | 是 | datetime | 展示相对时间或日期 | 无 | 不可编辑 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-center-FIELD-read-status` | 已读状态 | enum | 是 | `M03-ENUM-read-status` | 未读显示红点 | `unread` | 系统流转 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-center-FIELD-jump-type` | 跳转类型 | enum | 否 | `M03-ENUM-jump-type` | 用于点击跳转 | `notification_detail` | 后台模板配置 | 普通 | 通知记录 |

#### 列表字段附加属性

| 字段 ID | 展示位置 | 主次层级 | 点击行为 | 长按/左滑行为 | 溢出处理 |
|---------|----------|----------|----------|----------------|----------|
| `APP-03-PAGE-notification-center-FIELD-created-time` | 通知卡片右上角 | 辅助信息 | 随整条通知点击进入目标页 | 不单独响应 | 相对时间 |
| `APP-03-PAGE-notification-center-FIELD-summary` | 通知标题下方 | 次要信息 | 随整条通知点击进入目标页 | 左滑首版不提供删除 | 两行省略 |

### 4.2 详情/表单字段

详情字段见 `APP-07_通知详情页.md`。

---

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响（副作用） |
|---------|--------|----------|----------|----------|--------|--------|----------------|
| `APP-03-PAGE-notification-center-ACT-open-detail` | 查看通知 | 通知存在 | `GLB-ROLE-app-user` | 否 | `jumpType=invite_response` 时进入 `APP-03-PAGE-invite-response` 并置已读；其他通知进入通知详情并置已读 | `M03-ERR-notification-not-found` | 未读数刷新 |

### 5.2 批量操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 批量选择 | 二次确认 | 成功态 | 失败态 |
|---------|--------|----------|----------|----------|----------|--------|--------|
| `APP-03-PAGE-notification-center-ACT-read-all` | 全部已读 | 当前筛选下存在未读 | `GLB-ROLE-app-user` | 不需要勾选 | 是 | 当前用户通知全部置已读 | 部分失败提示重试 |

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-03-PAGE-notification-center-ACT-change-type` | 切换类型 | 类型筛选 | 任意 | `GLB-ROLE-app-user` | 否 | 列表刷新 | 网络失败保留原数据 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 类型筛选 | 切换 | 列表 | 按一级通知类型查询第一页 | `M03-ENUM-notification-type` |
| 业务类型筛选 | 选择 `invite_response` | 列表 | 查询邀请响应通知，一级类型固定归属互动通知 | `M03-ENUM-notification-biz-type` |
| `jumpType` | `invite_response` | 页面跳转 | 跳转 `APP-03-PAGE-invite-response`，携带 `noticeNo`、`responseNo`/`jumpValue` | `M03-ENUM-jump-type` |
| 打开详情 | 成功 | 已读状态 | 单条置已读 | `M03-SM-notification-read` |
| 全部已读 | 确认 | 未读汇总 | 清零通知未读 | `M03-RULE-unread` |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 首次进入/切换类型 | 列表骨架 | 等待 | 通用态 |
| 空态（无数据） | 无通知 | 暂无通知 | 返回 | `M03-RULE-notification-scope` |
| 空态（筛选无结果） | 类型筛选无数据 | 未找到相关通知 | 切回全部 | `M03-ENUM-notification-type` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 通用态 |
| 无权限态 | 未登录 | 引导登录 | 登录 | `GLB-ROLE-visitor` |
| 业务态-unread | 未读通知 | 标题加粗/红点 | 打开详情 | `M03-ENUM-read-status` |
| 业务态-read | 已读通知 | 常规样式 | 打开详情 | `M03-ENUM-read-status` |
| 降级态 | 微信订阅未授权 | 不影响站内通知 | 查看站内通知 | `M03-RULE-notification-subscribe` |

---

## 8. 查询与列表

- **默认排序**：创建时间倒序
- **分页**：默认 20 条
- **分页方式**：下拉刷新 + 上滑加载更多
- **列表轮询/实时刷新**：进入页面刷新一次，不轮询
- **批量选择**：不支持勾选，全部已读按当前用户执行
- **列表为空时引导**：切回全部或返回消息页

---

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-03-AC-notification-center-filter` | 按通知类型筛选 | 正常 | P0 |
| `APP-03-AC-notification-read-all` | 全部已读 | 正常 | P0 |
| `APP-03-AC-notification-no-setting` | 无通知设置入口 | 正常 | P0 |
| `APP-03-AC-notification-invite-response-jump` | 邀请响应通知跳转邀请响应页 | 正常 | P0 |

```text
AC-ID: APP-03-AC-notification-read-all
Given 当前用户通知中心存在未读通知
When  点击全部已读并确认
Then  当前用户通知记录状态变为 `read`，消息 Tab 通知未读数刷新为 0
```

```text
AC-ID: APP-03-AC-notification-invite-response-jump
Given 通知中心存在一条 `bizType=invite_response` 且 `jumpType=invite_response` 的未读通知
When  用户点击该通知
Then  系统将通知置为 `read`，并携带 `noticeNo` 与 `jumpValue` 进入 `APP-03-PAGE-invite-response`
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖枚举 | `M03-ENUM-notification-type` | 通知类型 |
| 依赖枚举 | `M03-ENUM-notification-biz-type` | 邀请响应筛选 |
| 依赖状态机 | `M03-SM-notification-read` | 已读状态 |
| 依赖页面 | `APP-03-PAGE-notification-detail` | 通知详情 |
| 依赖页面 | `APP-03-PAGE-invite-response` | 邀请响应通知跳转 |
