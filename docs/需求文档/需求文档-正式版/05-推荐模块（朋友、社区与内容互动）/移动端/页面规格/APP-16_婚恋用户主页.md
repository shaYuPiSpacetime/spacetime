# 页面规格 - APP-05-PAGE-user-profile 婚恋用户主页

| 版本 | 日期 | 修改人 | 变更摘要 |
|------|------|--------|----------|
| 版本01 | 2026-07-15 | Codex | 按 PRD-02 开发答疑新增统一婚恋用户主页 |

- **页面 ID**：`APP-05-PAGE-user-profile`
- **页面路由**：`/pages/heart/user?userId={userId}&sourceScene={sourceScene}`
- **入口来源**：推荐卡、喜欢我的、最近看过我的、相互喜欢、社区作者区、个人动态区
- **对应后台**：`ADM-02-PAGE-user-relation-section`

---

## 1. 页面定位

统一展示他人的婚恋资料并承接关系动作。资料和认证引用 PRD-01，访客、喜欢、取消喜欢、匹配引用 PRD-02，聊天引用 PRD-03，个人动态引用 `APP-05-PAGE-user-posts`。

## 2. 布局与弹层

页面从上到下为：封面与头像、认证和基础资料、标签与自我介绍、个人动态区、底部关系操作区。右上更多操作弹窗提供举报和拉黑；不可把按钮烘焙进背景图。

### 2.4 UI 画板拆分（必填）

| 画板 ID | 画板名称 | 必须展示内容 | 优先级 |
|---------|----------|--------------|--------|
| `APP-05-user-profile-01` | 婚恋用户主页-未喜欢 | 资料、认证、关注/粉丝/获赞统计、个人动态、喜欢按钮 | P0 |
| `APP-05-user-profile-02` | 婚恋用户主页-已喜欢 | 已喜欢态、取消喜欢、申请认识入口 | P0 |
| `APP-05-user-profile-03` | 婚恋用户主页-已匹配 | 聊天主按钮、取消喜欢、关系状态 | P0 |
| `APP-05-user-profile-04` | 婚恋用户主页-无公开动态 | 资料保留、个人动态空态 | P1 |
| `APP-05-user-profile-05` | 婚恋用户主页-更多操作 | 举报、拉黑、不看 TA 动态/取消不看 | P0 |
| `APP-05-user-profile-06` | 婚恋用户主页-对象失效 | 不可见提示和返回动作 | P0 |

## 3. 字段表

| 字段 ID | 显示名 | 类型 | 必填 | 取值范围 | 校验规则 | 默认值 | 可编辑 | 敏感级别 | 数据来源 |
|---------|--------|------|------|----------|----------|--------|--------|----------|----------|
| `APP-05-PAGE-user-profile-FIELD-user-id` | 用户标识 | string | 是 | 业务用户 ID | 不展示内部主键 | 无 | 否 | 敏感；注销后匿名化 | PRD-01 |
| `APP-05-PAGE-user-profile-FIELD-profile` | 婚恋资料 | json | 是 | PRD-01 已审核可见字段 | 按隐私范围返回 | 无 | 否 | 敏感；按字段脱敏 | PRD-01 |
| `APP-05-PAGE-user-profile-FIELD-certifications` | 三重认证 | json | 是 | PRD-01 认证状态 | 仅展示可公开徽章 | 无 | 否 | 普通 | PRD-01 |
| `APP-05-PAGE-user-profile-FIELD-like-status` | 喜欢状态 | enum | 是 | 未喜欢/已喜欢 | 服务端最终状态 | 未喜欢 | 否 | 普通 | PRD-02 |
| `APP-05-PAGE-user-profile-FIELD-match-status` | 匹配状态 | enum | 是 | `M02-SM-mutual-match` | 仅有效匹配可聊天 | 未匹配 | 否 | 普通 | PRD-02 |
| `APP-05-PAGE-user-profile-FIELD-posts` | 个人动态 | json[] | 否 | 仅公开动态 | 引用个人动态区 | 空数组 | 否 | 普通 | PRD-05 |

## 4. 操作表

| 操作 ID | 操作名 | 触发条件 | 前置权限 | 二次确认 | 成功态 | 失败态 | 影响 |
|---------|--------|----------|----------|----------|--------|--------|------|
| `APP-05-PAGE-user-profile-ACT-open` | 进入主页 | 对象可见 | 已登录 | 否 | 展示主页 | 对象不可用提示 | 通知 PRD-02 按 30 分钟规则写访客并累计 PV |
| `APP-05-PAGE-user-profile-ACT-like` | 喜欢 | 未喜欢 | `M01-RULE-core-access` | 否 | 切换已喜欢 | 引用 PRD-02 错误码 | 可能新增匹配来源 |
| `APP-05-PAGE-user-profile-ACT-cancel-like` | 取消喜欢 | 已喜欢 | `M01-RULE-core-access` | 是 | 撤销爱心来源 | 引用 PRD-02 错误码 | 仍有其他来源时匹配继续有效 |
| `APP-05-PAGE-user-profile-ACT-chat` | 聊天 | 有效匹配且会话可用 | PRD-03 | 否 | 打开私信 | 展示不可聊天原因 | 不改变匹配关系 |
| `APP-05-PAGE-user-profile-ACT-report` | 举报 | 对象可见 | `M05-RULE-report-gate` | 否 | 打开举报弹窗 | 登录提示 | 生成举报记录 |
| `APP-05-PAGE-user-profile-ACT-block` | 拉黑 | 对象可见 | 已登录且账号正常 | 是 | 前台退出主页 | 操作失败提示 | 整个匹配关系失效并禁止互动 |

## 5. 状态与异常

| 状态类型 | 触发场景 | 页面表现 | 用户可做的操作 | 引用 |
|----------|----------|----------|---------------|------|
| 加载态 | 聚合数据请求中 | 页面骨架屏 | 返回 | 移动端通用态 |
| 空态 | 无公开动态 | 资料正常展示，动态区显示空态 | 喜欢/返回 | `APP-05-PAGE-user-posts` |
| 错误态 | 请求失败 | Toast 与重试 | 重试/返回 | 移动端通用态 |
| 无权限态 | 未登录或核心准入不足 | 浏览按全局规则；互动时引导登录/认证 | 登录/认证 | PRD-01 |
| 业务态-未匹配 | 无有效匹配 | 底部展示喜欢或打招呼 | 喜欢/打招呼 | PRD-02/03 |
| 业务态-已匹配 | 存在有效匹配 | 底部主操作切换为聊天 | 聊天/取消喜欢 | `M02-RULE-match-lifecycle` |
| 业务态-对象失效 | 拉黑、冻结、注销、封禁、认证失效 | 不继续展示主页，返回来源页 | 返回 | `M02-RULE-relation-invalid` |
| 降级态 | 动态服务不可用 | 保留资料和关系操作，动态区提示暂不可用 | 重试 | PRD-05 |

## 6. 查询与验收

个人动态默认每页 20 条加载更多；主页本身不分页。进入页面必须写入访客事件，30 分钟内只生成或更新一条展示记录但 PV 累计。

```text
AC-ID: APP-05-AC-user-profile-match-source
Given 双方匹配同时存在爱心和悄悄话回复来源
When 当前用户在主页取消喜欢
Then 爱心来源被撤销，但主页仍展示聊天操作且匹配继续有效

AC-ID: APP-05-AC-user-profile-account-invalid
Given 目标用户已注销、冻结、封禁或与当前用户互相拉黑
When 当前用户尝试打开主页
Then 不展示目标资料并返回不可互动提示，后台永久保留匿名化关系事实
```

## 7. 反向缺口补充

主页统计新增 `followingCount/followerCount/receivedLikeCount`，分别进入 `APP-05-PAGE-follow-relations` 或 `APP-05-PAGE-interaction-center`；“申请认识”引用 `M05-RULE-apply-acquaintance-alias`；“不看 TA 动态”仅改变内容偏好，不替代拉黑。
