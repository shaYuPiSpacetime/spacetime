# PRD-05 社区互动 测试用例文档

> 日期：2026-05-29
> 关联技术方案：`docs/技术方案/2026-05-29-PRD-05-推荐模块（朋友、社区与内容互动）-tcdesign.md`

## 1. 测试层级说明

| 层级 | 覆盖范围 | 工具 | 产物 |
| --- | --- | --- | --- |
| L1 cURL | 小程序社区接口、后台审核接口、配置接口冒烟 | Bash + curl | `社区互动-PRD05-test-l1.sh` |
| L2 MockMvc | Controller 路由、参数校验、返回结构、权限拦截 | Spring MockMvc | `*ControllerTest.java` |
| L3 JUnit | Service 业务逻辑、状态流转、边界校验 | JUnit 5 + Mockito | `*ServiceTest.java` |
| L4 Playwright | 后台社区管理页加载、Tab 切换、审核/配置基础流程 | Playwright | `community.spec.ts` |

## 2. L1 cURL 冒烟测试用例

### 2.1 小程序接口

| 编号 | 用例 | Method | URL | 预期 |
| --- | --- | --- | --- | --- |
| L1-M-01 | 社区列表查询 | GET | `/miniapp/community/posts?postType=community` | 200 |
| L1-M-02 | 诚意贴列表查询 | GET | `/miniapp/community/posts?postType=sincere_post` | 200 |
| L1-M-03 | 社区配置查询 | GET | `/miniapp/community/config` | 200，返回配置和首页Tab |
| L1-M-04 | 发布社区动态 | POST | `/miniapp/community/posts` | 200，返回 postId |
| L1-M-05 | 发布诚意贴 | POST | `/miniapp/community/posts` | 200，返回 postId |
| L1-M-06 | 发布动态缺少话题 | POST | `/miniapp/community/posts` | 4001 |
| L1-M-07 | 内容详情查询 | GET | `/miniapp/community/posts/{id}` | 200 |
| L1-M-08 | 评论列表查询 | GET | `/miniapp/community/posts/{id}/comments` | 200 |
| L1-M-09 | 发表评论 | POST | `/miniapp/community/comments` | 200，返回 commentId |
| L1-M-10 | 删除自己的评论 | DELETE | `/miniapp/community/comments/{id}` | 200 |
| L1-M-11 | 点赞动态 | POST | `/miniapp/community/posts/{id}/like` | 200，liked=true |
| L1-M-12 | 取消点赞动态 | POST | `/miniapp/community/posts/{id}/like` | 200，liked=false |
| L1-M-13 | 关注用户 | POST | `/miniapp/community/follows/{targetUserId}` | 200，following=true |
| L1-M-14 | 取消关注用户 | POST | `/miniapp/community/follows/{targetUserId}` | 200，following=false |
| L1-M-15 | 举报动态 | POST | `/miniapp/community/reports` | 200，返回 reportId |
| L1-M-16 | 删除自己的动态 | DELETE | `/miniapp/community/posts/{id}` | 200 |
| L1-M-17 | 未登录发布动态 | POST | `/miniapp/community/posts` | 401 |

### 2.2 管理后台接口

| 编号 | 用例 | Method | URL | 预期 |
| --- | --- | --- | --- | --- |
| L1-A-01 | 社区内容审核列表 | GET | `/admin/community/posts/list?page=1&size=10` | 200 |
| L1-A-02 | 社区内容详情 | GET | `/admin/community/posts/{id}` | 200 |
| L1-A-03 | 审核通过内容 | PUT | `/admin/community/posts/{id}/audit` | 200 |
| L1-A-04 | 驳回内容 | PUT | `/admin/community/posts/{id}/audit` | 200 |
| L1-A-05 | 评论审核列表 | GET | `/admin/community/comments/list?page=1&size=10` | 200 |
| L1-A-06 | 审核通过评论 | PUT | `/admin/community/comments/{id}/audit` | 200 |
| L1-A-07 | 举报列表 | GET | `/admin/community/reports/list?page=1&size=10` | 200 |
| L1-A-08 | 举报处理-下架动态 | PUT | `/admin/community/reports/{id}/handle` | 200 |
| L1-A-09 | 社区配置查询 | GET | `/admin/community/configs` | 200 |
| L1-A-10 | 社区配置保存 | POST | `/admin/community/configs` | 200 |
| L1-A-11 | 社区首页Tab配置查询 | GET | `/admin/community/home-tabs` | 200 |
| L1-A-12 | 无 token 访问后台社区接口 | GET | `/admin/community/posts/list` | 401 |
| L1-A-13 | 无权限角色访问后台社区接口 | GET | `/admin/community/posts/list` | 403 |

## 3. L3 JUnit Service 层测试用例

### 3.1 CommunityServiceTest

| 编号 | 用例 | 前置条件 | 预期 |
| --- | --- | --- | --- |
| L3-C-01 | 发布社区动态-正常 | `postType=community`，话题存在 | 生成记录，状态 `PENDING` |
| L3-C-02 | 发布诚意贴-正常 | 标题存在，正文长度达标 | 生成记录，状态 `PENDING` |
| L3-C-03 | 发布动态-无话题 | topicId 为空 | 抛 `BusinessException` |
| L3-C-04 | 发布诚意贴-正文过短 | 小于配置最小长度 | 抛 `BusinessException` |
| L3-C-05 | 点赞动态-首次点击 | 无现有点赞记录 | liked=true，likeCount+1 |
| L3-C-06 | 点赞动态-再次点击 | 已点赞 | liked=false，likeCount-1 |
| L3-C-07 | 关注用户-首次点击 | 无现有关注记录 | following=true |
| L3-C-08 | 关注用户-再次点击 | 已关注 | following=false |
| L3-C-09 | 发表评论 | 内容存在 | 写评论，post.commentCount+1 |
| L3-C-10 | 删除自己的评论 | 作者本人 | comment.status=DELETED |
| L3-C-11 | 删除他人评论 | 非作者 | 抛 `BusinessException` |
| L3-C-12 | 提交举报 | 合法 targetType/targetId | 生成举报单，目标 reportCount+1 |

### 3.2 CommunityAdminServiceTest

| 编号 | 用例 | 前置条件 | 预期 |
| --- | --- | --- | --- |
| L3-A-01 | 审核通过内容 | 待审核内容 | `auditStatus=APPROVED`，`status=PUBLISHED` |
| L3-A-02 | 审核驳回内容 | 待审核内容 | `auditStatus=REJECTED`，`status=REJECTED` |
| L3-A-03 | 审核通过评论 | 待审核评论 | `auditStatus=APPROVED`，`status=PUBLISHED` |
| L3-A-04 | 驳回评论 | 待审核评论 | `auditStatus=REJECTED`，`status=REJECTED` |
| L3-A-05 | 举报处理-下架动态 | 举报目标为动态 | 动态 `status=BLOCKED`，举报单 `RESOLVED` |
| L3-A-06 | 举报处理-屏蔽评论 | 举报目标为评论 | 评论 `status=BLOCKED`，举报单 `RESOLVED` |
| L3-A-07 | 举报处理-驳回举报 | 有举报单 | 举报单 `REJECTED` |
| L3-A-08 | 社区配置批量保存 | 配置列表合法 | 成功保存 `app_config` |

## 4. L2 MockMvc Controller 测试用例

| 编号 | 用例 | 预期 |
| --- | --- | --- |
| L2-01 | 小程序社区查询接口路由 | 返回 200 |
| L2-02 | 小程序发布接口未登录拦截 | 返回 401 |
| L2-03 | 后台社区接口权限校验 | 无权限返回 403 |
| L2-04 | 发布内容参数校验 | 缺少必填字段返回 4001 |
| L2-05 | 审核接口参数校验 | 非法状态返回业务错误 |
| L2-06 | 所有接口返回统一 `R<T>` | 有 `code/msg/data` |

## 5. L4 Playwright E2E 测试用例

| 编号 | 用例 | 操作步骤 | 预期 |
| --- | --- | --- | --- |
| L4-01 | 社区内容审核页加载 | 登录 -> 打开 `/community/posts` | 页面加载成功 |
| L4-02 | 社区管理 Tab 切换 | 内容审核 -> 评论审核 -> 举报处理 -> 社区配置 | URL 正常切换 |
| L4-03 | 审核列表筛选区存在 | 打开内容审核页 | 查询按钮、筛选条件可见 |
| L4-04 | 举报处理页加载 | 打开 `/community/reports` | 表格可见 |
| L4-05 | 社区配置页加载 | 打开 `/community/configs` | 配置卡片可见 |

## 6. 测试数据准备

1. `sys_dict_type` 中新增：
   - `community_topic`
   - `community_report_reason`
2. `sys_dict_data` 中准备至少：
   - 3 个话题
   - 3 个举报原因
3. 测试用户：
   - 至少 2 个已登录可用用户
4. 社区配置：
   - `community.interaction_gate_mode=LOGIN_ONLY`
   - 其它长度/数量配置均有默认值

## 7. 跳过与限制说明

以下用例在当前仓库中只能设计、不能真实执行通过：

1. 三项认证准入校验：
   - 原因：PRD-01 认证表与认证服务未落地
2. 互动通知与审核结果通知：
   - 原因：PRD-03 通知中心未落地
3. 微信内容机审：
   - 原因：外部接口未接入

