# 页面规格 - APP-05-PAGE-community-more-actions 社区更多操作弹窗

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-06 | Codex | 按一期上线目标补充社区更多操作弹窗 |
| 版本02 | 2026-07-06 | Codex | 补充屏蔽当前内容后的 3 秒撤销交互 |
| 版本03 | 2026-07-07 | Codex | 按移动端 Demo 审查明确 `post/comment/user` 对象类型分流和置灰态 |

- **页面 ID**：`APP-05-PAGE-community-more-actions`
- **所属模块 PRD**：`模块PRD_APP-05_推荐模块（朋友、社区与内容互动）`
- **页面路由**：业务页内弹窗 `/components/community-more-actions`
- **入口来源**：成家关注/同城/热门信息流、动态详情、话题详情、悦目、诚意贴、个人动态区
- **对应设计稿**：待补充；设计画板按第 2.4 节输出
- **对应移动端 / 技术方案**：`MVP-PAGE-009`

## 1. 页面定位

- **目标用户**：已登录用户
- **核心任务**：对社区内容、评论或用户执行举报、屏蔽当前内容、复制链接、打招呼、发私信等操作
- **页面类型**：底部操作弹窗

## 2. 布局（给 UI）

### 2.1 整体布局

```
┌────────────────────────┐
│ 更多操作                │
├────────────────────────┤
│ 按 targetType 展示操作    │
│ post：举报/屏蔽/复制      │
│ comment：举报/复制       │
│ user：打招呼/发私信/举报  │
│ 取消                    │
└────────────────────────┘
```

### 2.2 区块说明

| 区块 | 位置 | 内容 | 是否可折叠 | 是否记住展开状态 |
|------|------|------|------------|------------------|
| 标题区 | 顶部 | 标题、关闭按钮 | 否 | 否 |
| 操作列表 | 中部 | 按对象类型展示可用操作 | 否 | 否 |
| 取消区 | 底部 | 取消/关闭 | 否 | 否 |

### 2.3 弹层 / 抽屉 / 模态

本页面即底部弹窗；点击举报、打招呼或发私信后关闭当前弹窗并进入对应页面。

### 2.4 UI 画板拆分（必填）

| 画板 ID | 画板名称 | 设计内容 | 备注 |
|---------|----------|----------|------|
| `APP-05-more-actions-01` | 社区更多操作-内容对象 | 举报、屏蔽当前内容、复制链接 | P0 |
| `APP-05-more-actions-02` | 社区更多操作-用户对象 | 打招呼、发私信、举报 | P0 |
| `APP-05-more-actions-03` | 社区更多操作-评论对象 | 举报、复制链接 | P0 |
| `APP-05-more-actions-04` | 社区更多操作-不可用态 | 操作置灰和原因提示 | P1 |
| `APP-05-more-actions-05` | 社区更多操作-屏蔽成功 | 屏蔽反馈 toast | P1 |

### 2.5 编辑控件口径

本页为操作弹窗，不提供文本编辑控件。

## 3. 筛选与搜索

### 3.1 搜索

本页无搜索。

### 3.2 筛选条件

本页无筛选条件。

### 3.3 筛选交互

本页不涉及筛选交互。

## 4. 字段表

### 4.1 列表字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-community-more-actions-FIELD-action-code` | 操作编码 | enum | 是 | report/hide/copy/greeting/private | 按对象类型返回 | 无 | 否 | 普通 | 服务端/前端规则 |
| `APP-05-PAGE-community-more-actions-FIELD-action-name` | 操作名称 | string | 是 | 1-20 字 | 与编码匹配 | 无 | 否 | 普通 | 前端文案 |
| `APP-05-PAGE-community-more-actions-FIELD-enabled` | 是否可用 | bool | 是 | true/false | 按权限和对象状态计算 | true | 否 | 普通 | 服务端/前端规则 |
| `APP-05-PAGE-community-more-actions-FIELD-disabled-reason` | 不可用原因 | string | 否 | 0-80 字 | enabled=false 时展示 | 无 | 否 | 普通 | 服务端/前端规则 |

#### 列表字段附加属性

| 字段 ID | 列表位置 | 主次层级 | 点击行为 | 手势行为 | 溢出处理 |
|---------|----------|----------|----------|----------|----------|
| `APP-05-PAGE-community-more-actions-FIELD-action-name` | 操作列表 | 主要信息 | 触发对应操作 | 无 | 单行省略 |
| `APP-05-PAGE-community-more-actions-FIELD-disabled-reason` | 操作副文案 | 辅助信息 | 不单独响应 | 无 | 两行内展示 |

### 4.2 详情/表单字段

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-community-more-actions-FIELD-target-type` | 操作对象类型 | enum | 是 | post/comment/user | 由入口传入 | post | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-community-more-actions-FIELD-target-id` | 操作对象 | string | 是 | 业务编号 | 对象必须存在 | 无 | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-community-more-actions-FIELD-target-user-id` | 目标用户 | string | 条件必填 | 业务编号 | 打招呼/发私信时必填 | 无 | 否 | 普通 | 来源页面 |
| `APP-05-PAGE-community-more-actions-FIELD-source-page` | 来源页面 | enum | 是 | following/city/hot/detail/topic/yuemu/sincere/userPosts | 由入口传入 | detail | 否 | 普通 | 来源页面 |

## 5. 操作表

### 5.1 行级操作

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响（副作用） |
|---------|--------|----------|----------|----------|--------|--------|----------------|
| `APP-05-PAGE-community-more-actions-ACT-report` | 举报 | 对象存在 | `M05-RULE-report-gate` | 否 | 打开举报弹窗 | `M05-ERR-login-required` | 进入 `APP-05-PAGE-report-modal` |
| `APP-05-PAGE-community-more-actions-ACT-hide` | 屏蔽当前内容 | targetType=post 且内容公开 | `GLB-ROLE-app-user` | 否 | 当前卡片从列表移除，toast 提供 3 秒撤销 | 网络失败提示重试 | 写入用户级屏蔽记录 |
| `APP-05-PAGE-community-more-actions-ACT-copy` | 复制链接 | 对象可分享 | `GLB-ROLE-app-user` | 否 | 复制成功 toast | 复制失败提示 | 无 |
| `APP-05-PAGE-community-more-actions-ACT-greeting` | 打招呼 | targetUserId 存在 | `M05-RULE-community-greeting-entry` | 否 | 跳转社区打招呼页 | 目标不可用提示 | 关闭当前弹窗 |
| `APP-05-PAGE-community-more-actions-ACT-private` | 发私信 | targetUserId 存在 | `M05-RULE-community-private-entry` | 否 | 跳转社区发私信页 | 目标不可用提示 | 关闭当前弹窗 |

### 5.2 批量操作

本页不支持批量操作。

### 5.3 页面级操作

| 操作 ID | 操作名 | 位置 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 |
|---------|--------|------|----------|----------|----------|--------|--------|
| `APP-05-PAGE-community-more-actions-ACT-close` | 关闭 | 顶部/底部/遮罩 | 弹窗打开 | `GLB-ROLE-app-user` | 否 | 关闭弹窗 | 无 |

## 6. 数据联动规则

| 触发字段 | 触发事件 | 影响字段 | 联动行为 | 备注 |
|----------|----------|----------|----------|------|
| targetType | 初始化 | 操作列表 | 内容对象只展示举报、屏蔽、复制；用户对象只展示打招呼、发私信、举报；评论对象只展示举报、复制；不展示与对象无关的操作 | `M05-RULE-community-more-actions` |
| enabled | false | 操作项 | 置灰并展示不可用原因 | 由入口状态计算 |
| 点击举报 | 操作成功 | 弹窗状态 | 关闭当前弹窗并打开举报弹窗 | `APP-05-PAGE-report-modal` |
| 点击打招呼 | 操作成功 | 页面跳转 | 携带 targetUserId/source 跳转社区打招呼页 | `APP-05-PAGE-community-greeting` |
| 点击发私信 | 操作成功 | 页面跳转 | 携带 targetUserId/source 跳转社区发私信页 | `APP-05-PAGE-community-private-entry` |
| 屏蔽成功 toast | 点击撤销 | 当前卡片/屏蔽记录 | 3 秒内撤销屏蔽并恢复当前卡片；超时后 toast 消失 | 当前反馈内闭环 |

## 7. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|----------------|------|
| 加载态 | 操作列表初始化 | loading | 等待 | 通用态 |
| 空态（无数据） | 无可用操作 | 展示暂无可用操作 | 关闭 | `M05-RULE-community-more-actions` |
| 空态（搜索无结果） | 本页无搜索 | 本节不适用 | — | — |
| 错误态（网络） | 屏蔽或状态查询失败 | toast + 保留弹窗 | 重试/关闭 | 通用态 |
| 无权限态 | 未登录 | 登录引导 | 去登录/关闭 | `M05-RULE-browse-gate` |
| 业务态-content | 内容对象 | 展示内容操作 | 举报/屏蔽/复制 | `M05-RULE-community-more-actions` |
| 业务态-user | 用户对象 | 展示用户触达操作 | 打招呼/发私信/举报 | `M05-RULE-community-more-actions` |
| 业务态-comment | 评论对象 | 展示评论操作 | 举报/复制 | `M05-RULE-community-more-actions` |
| 降级态 | 剪贴板能力不可用 | 复制操作置灰 | 其他操作 | 小程序能力 |

## 8. 查询与列表

本页为弹窗操作列表，不提供分页、排序、批量选择或导出。

## 9. 验收标准

| AC ID | 场景 | 类型 | 优先级 |
|-------|------|------|--------|
| `APP-05-AC-more-actions-by-type` | 按对象类型展示操作 | 正常 | P0 |
| `APP-05-AC-more-actions-report` | 点击举报进入举报弹窗 | 正常 | P0 |
| `APP-05-AC-more-actions-hide` | 屏蔽当前内容后列表移除 | 正常 | P0 |
| `APP-05-AC-more-actions-hide-undo` | 屏蔽成功后 3 秒内可撤销 | 正常 | P1 |
| `APP-05-AC-more-actions-contact` | 点击打招呼/发私信进入对应页面 | 正常 | P0 |

```
AC-ID: APP-05-AC-more-actions-by-type
Given 用户从不同对象打开社区更多操作弹窗
When  targetType 为 post、comment 或 user
Then  页面按对象类型展示对应操作，不展示与对象无关的操作
```

```
AC-ID: APP-05-AC-more-actions-contact
Given 用户从用户对象或内容作者区打开社区更多操作弹窗
When  点击打招呼或发私信
Then  系统携带 targetUserId、sourceType、sourceId 进入对应 APP-05 触达页面
```

## 10. 关联

| 关联类型 | 引用 ID | 说明 |
|----------|---------|------|
| 依赖的模块规则 | `M05-RULE-community-more-actions` | 更多操作展示规则 |
| 依赖的模块规则 | `M05-RULE-report-gate` | 举报准入 |
| 依赖的其他页面 | `APP-05-PAGE-report-modal` | 举报弹窗 |
| 依赖的其他页面 | `APP-05-PAGE-community-greeting` | 社区打招呼页 |
| 依赖的其他页面 | `APP-05-PAGE-community-private-entry` | 社区发私信页 |

## 11. 两级内容偏好动作

| actionCode | 展示文案 | 作用域 | 撤销方式 |
|------------|----------|--------|----------|
| `hide_post` | 屏蔽当前内容 | 仅当前 postId | 3 秒 toast 撤销 |
| `hide_author_posts` | 不看 TA 动态 | 当前 authorId 后续社区动态 | 原入口切换为“取消不看 TA 动态” |
| `unhide_author_posts` | 取消不看 TA 动态 | 解除当前 authorId 偏好 | 操作成功 toast |

用户对象动作可将“打招呼”展示为“申请认识”，但 actionCode 固定为 `greeting`。`hide_author_posts` 不取消关注、不撤销喜欢或匹配、不关闭私信，也不进入黑名单；一期不提供独立管理页。
