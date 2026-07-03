# 页面规格 - APP-03-PAGE-notification-detail 通知详情页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本02 | 2026-07-02 | Codex | 按第 1 轮 Claude 核查明确邀请响应跳转目标 |
| 版本01 | 2026-07-02 | Codex | 初稿 |

- **页面 ID**：`APP-03-PAGE-notification-detail`
- **所属模块 PRD**：`../模块PRD文档/模块PRD_APP-03_消息、私信与通知中心.md`
- **页面路由**：`/pages/message/notification-detail`
- **入口来源**：通知中心列表、官方消息详情跳转
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端页面**：MVP-PAGE-039 / APP-PAGE-055

---

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：查看单条业务通知详情并跳转到对应业务页面
- **页面类型**：详情页

---

## 2. 布局（给 UI）

### 2.1 整体布局

```text
┌────────────────────────────┐
│ 返回  通知详情              │
├────────────────────────────┤
│ 标题 / 类型 / 时间          │
├────────────────────────────┤
│ 摘要 / 正文 / 业务信息      │
├────────────────────────────┤
│ 主按钮：查看对应内容        │
└────────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 标题区 | 顶部 | 标题、通知类型、时间 | 否 | 否 |
| 内容区 | 主体 | 正文、业务变量、处理结果 | 否 | 否 |
| 操作区 | 底部 | 跳转按钮或无跳转说明 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

本页不提供弹层。

### 2.4 UI 画板拆分

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-03-notify-detail-01` | 通知详情页-主页面 | 标题、正文、跳转按钮 | P0 |
| `APP-03-notify-detail-02` | 通知详情页-无跳转态 | 无底部按钮 | P1 |
| `APP-03-notify-detail-03` | 通知详情页-失效态 | 目标对象不可用 | P1 |

### 2.5 编辑控件口径

本页为只读详情页，无编辑控件。

---

## 3. 筛选与搜索

本页为详情页，无列表查询筛选。

---

## 4. 字段表

### 4.1 列表字段

本页非列表页，列表字段不适用。

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-03-PAGE-notification-detail-FIELD-notice-no` | 通知编号 | string | 是 | 业务编号 | 当前用户可访问 | 无 | 不可编辑 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-detail-FIELD-notice-type` | 通知类型 | enum | 是 | `M03-ENUM-notification-type` | 展示中文 | 无 | 不可编辑 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-detail-FIELD-biz-type` | 业务类型 | enum | 是 | `M03-ENUM-notification-biz-type` | 展示中文 | 无 | 不可编辑 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-detail-FIELD-title` | 标题 | string | 是 | 1-50 字 | 模板渲染后非空 | 无 | 后台模板配置 | 普通 | 文案与消息中心 |
| `APP-03-PAGE-notification-detail-FIELD-content` | 正文 | string | 是 | 1-2000 字 | 富文本白名单 | 无 | 后台模板配置 | 普通 | 通知模板 |
| `APP-03-PAGE-notification-detail-FIELD-created-time` | 时间 | datetime | 是 | datetime | 展示到分钟 | 无 | 不可编辑 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-detail-FIELD-read-status` | 已读状态 | enum | 是 | `M03-ENUM-read-status` | 进入详情置已读 | `unread` | 系统流转 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-detail-FIELD-jump-type` | 跳转类型 | enum | 否 | `M03-ENUM-jump-type` | 有按钮时必填 | 无 | 后台模板配置 | 普通 | 通知记录 |
| `APP-03-PAGE-notification-detail-FIELD-jump-value` | 跳转参数 | string | 否 | 业务编号/URL | 按 jumpType 校验 | 无 | 后台模板配置 | 普通 | 通知记录 |

---

## 5. 操作表

### 5.1 行级操作

本页无行级操作。

### 5.2 批量操作

本页无批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-03-PAGE-notification-detail-ACT-open-target` | 查看对应内容 | 底部 | `jumpType` 非空 | `GLB-ROLE-app-user` | 否 | 跳转对应页面 | 目标失效时提示并保留详情 |
| `APP-03-PAGE-notification-detail-ACT-back` | 返回 | 顶部 | 任意 | `GLB-ROLE-app-user` | 否 | 返回通知中心 | 无 |

---

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| 进入详情 | 加载成功 | readStatus | 置已读 | `M03-SM-notification-read` |
| `bizType` | `match_success` | 跳转按钮 | 跳转会话或相互喜欢 | PRD-02/PRD-03 |
| `bizType` | `coin_changed` | 跳转按钮 | 跳转千寻币流水 | PRD-04 |
| `bizType` | `invite_response` | 跳转按钮 | 跳转 `APP-03-PAGE-invite-response`，携带 `noticeNo` 与 `jumpValue`/`responseNo` | PRD-03 承接展示，PRD-07 提供邀请关系数据 |

---

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 进入详情 | 骨架屏 | 等待 | 通用态 |
| 空态 | 通知不存在 | 通知不存在 | 返回 | `M03-ERR-notification-not-found` |
| 错误态 | 网络失败 | toast + 重试 | 重试 | 通用态 |
| 无权限态 | 通知不属于当前用户 | 无权限提示 | 返回 | `GLB-ROLE-app-user` |
| 业务态-有跳转 | jumpType 非空 | 显示主按钮 | 跳转 | `M03-ENUM-jump-type` |
| 业务态-目标失效 | 目标对象不可用 | 按钮置灰，展示说明 | 返回 | 目标模块 |
| 降级态 | H5 或资产服务不可用 | toast + 稍后重试 | 稍后重试 | PRD-04/外部 H5 |

---

## 8. 查询与列表

本页为详情页，不提供分页、排序、批量或导出。

---

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-03-AC-notification-detail-read` | 进入详情置已读 | 正常 | P0 |
| `APP-03-AC-notification-detail-jump` | 通知按类型跳转 | 正常 | P0 |
| `APP-03-AC-notification-detail-invite-response` | 邀请响应通知详情跳转 | 正常 | P0 |

```text
AC-ID: APP-03-AC-notification-detail-jump
Given 用户打开一条 `bizType=coin_changed` 的通知详情
When  点击查看对应内容
Then  页面跳转 PRD-04 千寻币流水页，并保留当前通知为已读状态
```

```text
AC-ID: APP-03-AC-notification-detail-invite-response
Given 用户打开一条 `bizType=invite_response` 且 `jumpType=invite_response` 的通知详情
When  点击查看对应内容
Then  页面携带 `noticeNo` 与 `jumpValue`/`responseNo` 跳转 `APP-03-PAGE-invite-response`
```

---

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖状态机 | `M03-SM-notification-read` | 已读 |
| 依赖枚举 | `M03-ENUM-notification-biz-type` | 业务类型 |
| 对应页面 | `APP-03-PAGE-invite-response` | 邀请响应跳转 |
