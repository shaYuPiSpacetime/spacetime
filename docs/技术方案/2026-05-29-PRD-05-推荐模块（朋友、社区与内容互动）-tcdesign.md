# PRD-05 推荐模块（朋友、社区与内容互动）技术方案设计

> 日期：2026-05-29
> 关联需求：
> - `docs/需求文档/移动端/细化PRD-05_推荐模块（朋友、社区与内容互动）.md`
> - `docs/需求文档/管理后台/管理后台细化PRD-05_推荐模块（朋友、社区与内容互动）.md`
> - `docs/需求文档/B同学分工明细.md`
> - `docs/技术方案/2026-05-28-公共内容配置-tcdesign.md`
> - `docs/技术方案/2026-05-28-PRD-04-商业化-tcdesign.md`
> - `docs/技术方案/2026-05-29-PRD-06用户安全设置与搜索主链路-tcdesign.md`

## 1. 背景与目标

PRD-05 承接推荐一级导航下的朋友内容、社区内容和轻互动链路，是 B 同学负责域中最靠近用户活跃和社区治理的主模块。本期目标不是一次性做完完整社区系统，而是在现有仓库能力之上落地一个可以真正跑通的首批闭环：

1. 小程序侧形成 `社区动态 / 诚意贴列表与详情 -> 发布 -> 点赞 -> 评论 -> 关注 -> 举报` 的最小主链路。
2. 管理后台形成 `内容审核 -> 举报处理 -> 社区轻配置` 的治理闭环。
3. 复用已落地的 RBAC、字典、内容配置、公共内容、用户安全设置等平台能力，避免重复建设独立“社区运营系统”。
4. 对尚未落地的 PRD-01 三项认证、PRD-03 通知中心做显式依赖声明，首批以配置契约和降级策略承接，不伪造完整闭环。

## 2. 范围

| 模块 | 是否涉及 | 说明 |
| --- | --- | --- |
| 小程序后端 | 是 | 新增社区内容、评论、关注、点赞、举报接口 |
| 管理后台后端 | 是 | 新增内容审核、举报处理、社区配置查询保存接口 |
| 管理后台前端 | 是 | 新增社区管理聚合页 |
| 小程序前端 | 否 | 本仓库不含移动端前端，仅输出接口契约 |
| 数据库 | 是 | 新增社区内容、评论、点赞、关注、举报表 |
| 通知中心 | 否 | 仅预留事件与配置，不落表、不发送 |
| 三项认证状态机 | 否 | 仅做准入模式配置与代码预留，真实认证态依赖 PRD-01 |
| 微信官方内容机审 | 否 | 首批以“人工审核/待接入”状态承接，不在本仓库接真实调用 |

## 3. 关键决策与依赖边界

| 类型 | 内容 | 决策/状态 | 来源 |
| --- | --- | --- | --- |
| 已确认 | 本期后台不新开一级“社区系统” | 复用 `运营中心` 和 `移动端配置管理` | 后台 PRD-05 |
| 已确认 | 首批实现重点 | 社区动态、诚意贴、评论、关注、点赞、举报、审核与轻配置 | 用户任务拆解 |
| 已确认 | 话题与举报原因来源 | 复用 `sys_dict_type/sys_dict_data` | 现有代码 |
| 已确认 | 社区规则与空态文案来源 | 复用 `app_config` | 现有代码 |
| 已确认 | 社区首页 Tab 轻配置 | 复用 `mobile_entry_config` | 现有代码 |
| 已确认 | 后台鉴权 | 所有后台接口使用 `@RequirePermission` | 项目规则 |
| 待联动 | 三项认证准入 | 当前无真实认证表，首批用 `community.interaction_gate_mode` 配置降级 | PRD-01 未落地 |
| 待联动 | 互动通知 | 点赞/评论/关注/@/审核结果通知仅记录技术预留，不真正写通知 | PRD-03 未落地 |
| 待联动 | 微信机审 | 首批不接真实 `msg_sec_check/media_check_async`，默认人工审核流 | 外部依赖未接入 |

## 4. 方案选择

| 方案 | 说明 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- | --- |
| 最小配置方案 | 只做后台配置和文档，不落真实社区表与接口 | 快 | 无法支持后续 PRD-05 联调和测试 | 不选 |
| 首批闭环方案 | 社区内容/评论/点赞/关注/举报独立建表，后台做审核与轻配置，认证和通知做预留 | 能跑通主链路，边界清晰，符合六层架构 | 认证/通知仍有部分降级 | **选择** |
| 完整社区方案 | 直接接微信机审、通知中心、推荐排序、话题运营平台 | 功能全 | 依赖过多，超出本期 | 后续迭代 |

本方案采用**首批闭环方案**：社区内容主数据独立建表；朋友/社区内容浏览与互动统一走社区域；后台通过单一聚合页承接内容审核、举报处理与社区轻配置。

## 5. 依赖自查与 PRD 关联

### 5.1 对 PRD-01 的依赖

PRD-05 规定 `发布动态/诚意贴、点赞、评论、关注、@用户` 需三项认证全部通过。但当前仓库只有推广/安全文档里对三项认证的口径说明，没有真实认证表与认证服务。

本期处理：

1. 技术方案与代码中保留 `community.interaction_gate_mode` 配置，支持 `LOGIN_ONLY` / `FULL_CERT`。
2. 当前实现默认以 `LOGIN_ONLY` 可运行，避免因 PRD-01 未落地导致社区全链路不可测。
3. 待 PRD-01 落地后，在社区统一准入校验处接入真实认证查询，不改 Controller 契约。

### 5.2 对 PRD-03 的依赖

PRD-05 涉及点赞、评论、回复、关注、@、审核结果、举报处理结果通知，但仓库中通知中心表和统一通知服务尚未实现。

本期处理：

1. 文档中明确通知类型枚举与触发时机。
2. 不在本期代码中伪造通知表或侧写消息系统。
3. 后续 PRD-03 落地时，由社区服务在成功事务后接入通知生产。

### 5.3 对 PRD-04 的依赖

PRD-04 仅与“社交权益需认证后才生效”的口径有关，不直接影响社区内容主链路。本期不依赖 VIP / 成家币逻辑。

### 5.4 对 PRD-06 的依赖

1. 社区轻配置复用 `app_config`、`mobile_entry_config`。
2. 个人关键词屏蔽、隐藏动态等安全逻辑后续可在社区列表查询时接入，本期先不实现过滤。

## 6. 数据库设计

### 6.1 表清单

| 表名 | 说明 |
| --- | --- |
| `community_post` | 社区动态 / 诚意贴 |
| `community_comment` | 评论与回复 |
| `community_like` | 点赞关系 |
| `community_follow` | 关注关系 |
| `community_report` | 举报单 |

### 6.2 DDL

```sql
CREATE TABLE IF NOT EXISTS community_post (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_id BIGINT NOT NULL COMMENT '作者用户ID',
    post_type VARCHAR(30) NOT NULL COMMENT 'community/sincere_post',
    title VARCHAR(200) DEFAULT NULL COMMENT '诚意贴标题',
    content VARCHAR(2000) NOT NULL COMMENT '正文内容',
    image_urls TEXT DEFAULT NULL COMMENT '图片JSON数组',
    topic_id BIGINT DEFAULT NULL COMMENT '话题字典数据ID',
    mention_user_ids VARCHAR(500) DEFAULT NULL COMMENT '@用户ID列表，逗号分隔',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/PUBLISHED/REJECTED/DELETED/BLOCKED',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/APPROVED/REJECTED',
    audit_remark VARCHAR(500) DEFAULT NULL COMMENT '审核说明',
    like_count INT NOT NULL DEFAULT 0 COMMENT '点赞数',
    comment_count INT NOT NULL DEFAULT 0 COMMENT '评论数',
    report_count INT NOT NULL DEFAULT 0 COMMENT '举报次数',
    deleted_by_user TINYINT NOT NULL DEFAULT 0 COMMENT '用户主动删除标记',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_post_author (author_id, deleted),
    INDEX idx_post_type_status (post_type, status, deleted),
    INDEX idx_post_audit (audit_status, update_time),
    INDEX idx_post_topic (topic_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区动态与诚意贴';

CREATE TABLE IF NOT EXISTS community_comment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL COMMENT '所属内容ID',
    author_id BIGINT NOT NULL COMMENT '评论作者ID',
    parent_comment_id BIGINT DEFAULT NULL COMMENT '父评论ID',
    reply_user_id BIGINT DEFAULT NULL COMMENT '回复目标用户ID',
    content VARCHAR(1000) NOT NULL COMMENT '评论内容',
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' COMMENT 'PUBLISHED/REJECTED/DELETED/BLOCKED',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/APPROVED/REJECTED',
    audit_remark VARCHAR(500) DEFAULT NULL COMMENT '审核说明',
    report_count INT NOT NULL DEFAULT 0 COMMENT '举报次数',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_comment_post (post_id, deleted),
    INDEX idx_comment_author (author_id, deleted),
    INDEX idx_comment_parent (parent_comment_id, deleted),
    INDEX idx_comment_audit (audit_status, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区评论';

CREATE TABLE IF NOT EXISTS community_like (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL COMMENT '动态ID',
    user_id BIGINT NOT NULL COMMENT '点赞用户ID',
    status VARCHAR(30) NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_post_user (post_id, user_id, deleted),
    INDEX idx_like_user (user_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞关系表';

CREATE TABLE IF NOT EXISTS community_follow (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    follower_id BIGINT NOT NULL COMMENT '关注者ID',
    target_user_id BIGINT NOT NULL COMMENT '被关注者ID',
    status VARCHAR(30) NOT NULL DEFAULT 'FOLLOW' COMMENT 'FOLLOW/UNFOLLOW',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_follow_pair (follower_id, target_user_id, deleted),
    INDEX idx_follow_target (target_user_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关注关系表';

CREATE TABLE IF NOT EXISTS community_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reporter_id BIGINT NOT NULL COMMENT '举报人ID',
    target_type VARCHAR(30) NOT NULL COMMENT 'post/comment/user',
    target_id BIGINT NOT NULL COMMENT '目标ID',
    reason_code VARCHAR(100) NOT NULL COMMENT '举报原因字典值',
    extra_text VARCHAR(1000) DEFAULT NULL COMMENT '补充说明',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/RESOLVED/REJECTED',
    handle_action VARCHAR(30) DEFAULT NULL COMMENT 'DISMISS/BLOCK_POST/BLOCK_COMMENT/WARN_USER',
    handle_remark VARCHAR(1000) DEFAULT NULL COMMENT '处理说明',
    handler_id BIGINT DEFAULT NULL COMMENT '处理人',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_report_target (target_type, target_id, deleted),
    INDEX idx_report_status (status, update_time),
    INDEX idx_report_user (reporter_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区举报单';
```

### 6.3 配置与字典复用

本期不新建社区专属配置表，统一复用：

1. `app_config`：
   - `community.interaction_gate_mode`
   - `community.post_max_images`
   - `community.post_max_text_length`
   - `community.post_max_mentions`
   - `community.sincere_post_min_text_length`
   - `community.contact_info_allowed`
   - `community.report_entry_enabled`
2. `mobile_entry_config`：
   - `COMMUNITY_HOME_TAB` 页面编码，配置 `关注 / 同城 / 发现`
3. `sys_dict_data`：
   - `community_topic`
   - `community_report_reason`

## 7. 后端设计

### 7.1 分层

严格遵守项目既有分层：

`Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`

#### 小程序侧

1. `CommunityController`
2. `CommunityService`
3. `CommunityServiceImpl`
4. `CommunityPostDao/CommunityCommentDao/CommunityLikeDao/CommunityFollowDao/CommunityReportDao`

#### 后台侧

1. `CommunityAdminController`
2. `CommunityAdminService`
3. `CommunityAdminServiceImpl`

### 7.2 小程序接口

| 接口 | URL | Method | 登录 | 入参 | 返回 |
| --- | --- | --- | --- | --- | --- |
| 社区内容列表 | `/miniapp/community/posts` | GET | 是 | `postType/topicId/status/page/size` | `Page<CommunityPostCardVO>` |
| 内容详情 | `/miniapp/community/posts/{id}` | GET | 是 | `id` | `CommunityPostDetailVO` |
| 发布内容 | `/miniapp/community/posts` | POST | 是 | `CommunityPostCreateReq` | `Long` |
| 删除内容 | `/miniapp/community/posts/{id}` | DELETE | 是 | `id` | `Void` |
| 评论列表 | `/miniapp/community/posts/{id}/comments` | GET | 是 | `id/page/size` | `Page<CommunityCommentVO>` |
| 发表评论 | `/miniapp/community/comments` | POST | 是 | `CommunityCommentCreateReq` | `Long` |
| 删除评论 | `/miniapp/community/comments/{id}` | DELETE | 是 | `id` | `Void` |
| 点赞/取消点赞 | `/miniapp/community/posts/{id}/like` | POST | 是 | 无 | `CommunityLikeToggleVO` |
| 关注/取消关注 | `/miniapp/community/follows/{targetUserId}` | POST | 是 | 无 | `CommunityFollowToggleVO` |
| 发起举报 | `/miniapp/community/reports` | POST | 是 | `CommunityReportCreateReq` | `Long` |
| 社区公共配置 | `/miniapp/community/config` | GET | 是 | 无 | `CommunityConfigVO` |

### 7.3 后台接口

| 接口 | URL | Method | 权限 | 入参 | 返回 |
| --- | --- | --- | --- | --- | --- |
| 内容列表 | `/admin/community/posts/list` | GET | `community:post:list` | `CommunityPostPageReq` | `Page<CommunityPostAdminVO>` |
| 内容详情 | `/admin/community/posts/{id}` | GET | `community:post:list` | `id` | `CommunityPostAdminVO` |
| 审核内容 | `/admin/community/posts/{id}/audit` | PUT | `community:post:audit` | `CommunityPostAuditReq` | `Void` |
| 评论列表 | `/admin/community/comments/list` | GET | `community:comment:list` | `CommunityCommentPageReq` | `Page<CommunityCommentAdminVO>` |
| 审核评论 | `/admin/community/comments/{id}/audit` | PUT | `community:comment:audit` | `CommunityCommentAuditReq` | `Void` |
| 举报列表 | `/admin/community/reports/list` | GET | `community:report:list` | `CommunityReportPageReq` | `Page<CommunityReportAdminVO>` |
| 处理举报 | `/admin/community/reports/{id}/handle` | PUT | `community:report:handle` | `CommunityReportHandleReq` | `Void` |
| 社区配置列表 | `/admin/community/configs` | GET | `community:config:list` | 无 | `List<AppConfigVO>` |
| 批量保存社区配置 | `/admin/community/configs` | POST | `community:config:edit` | `AppConfigBatchReq` | `Void` |
| 社区首页 Tab 列表 | `/admin/community/home-tabs` | GET | `community:config:list` | 无 | `List<MobileEntryConfigVO>` |

### 7.4 核心规则

#### 7.4.1 发布规则

1. `community`：
   - 文本必填，最大长度取 `community.post_max_text_length`
   - 图片最大数量取 `community.post_max_images`
   - 话题必填
   - `@用户` 上限取 `community.post_max_mentions`
2. `sincere_post`：
   - 标题必填
   - 正文长度不少于 `community.sincere_post_min_text_length`
   - 图片上限同社区动态
3. 发布后默认：
   - `status=PENDING`
   - `audit_status=PENDING`

#### 7.4.2 审核规则

1. 后台通过：
   - `audit_status=APPROVED`
   - `status=PUBLISHED`
2. 后台驳回：
   - `audit_status=REJECTED`
   - `status=REJECTED`
   - 写 `audit_remark`
3. 用户删除：
   - `status=DELETED`
   - `deleted_by_user=1`
4. 举报处理后屏蔽：
   - 动态 `status=BLOCKED`
   - 评论 `status=BLOCKED`

#### 7.4.3 点赞与关注

1. 点赞再次点击即取消。
2. 点赞数和关注状态在事务内更新。
3. 点赞/关注准入统一走社区准入校验，当前默认 `LOGIN_ONLY` 可运行。

#### 7.4.4 举报

1. 允许登录用户发起。
2. 同一用户可对不同对象重复举报。
3. 举报不直接删除内容，必须后台处理。

### 7.5 降级策略

| 能力 | 当前策略 |
| --- | --- |
| 三项认证校验 | 使用配置开关降级，默认仅登录 |
| 微信机审 | 不调用外部接口，直接进入人工审核 |
| 通知下发 | 仅在方案中定义触发点，不写消息 |
| 推荐排序 | 列表按 `create_time desc` 或后台配置兜底，不做算法 |

## 8. 前端设计

### 8.1 后台页面策略

新增单一聚合页 `CommunityManagementPage.tsx`，采用与财务中心类似的 Tab 聚合模式，避免过早拆碎菜单和页面：

1. `内容审核`
2. `评论审核`
3. `举报处理`
4. `社区配置`

### 8.2 前端 API

新增 `frontend/src/api/community.ts`，封装：

1. 内容列表、详情、审核
2. 评论列表、审核
3. 举报列表、处理
4. 社区配置查询与保存
5. 社区首页 Tab 轻配置查询

### 8.3 路由与菜单

新增静态路由：

1. `/community/posts`
2. `/community/comments`
3. `/community/reports`
4. `/community/configs`

前端四个路径都复用 `CommunityManagementPage.tsx`，与动态菜单相匹配。

## 9. 菜单与权限

建议菜单种子使用 `880-899` 段，避开当前 PRD-04 与公共内容模块 `800-860` 冲突：

| ID | 类型 | 菜单 | 路径 | 权限 |
| --- | --- | --- | --- | --- |
| 880 | M | 社区互动管理 | - | - |
| 881 | C | 内容审核 | `/community/posts` | `community:post:list` |
| 882 | F | 内容审核操作 | - | `community:post:audit` |
| 883 | C | 评论审核 | `/community/comments` | `community:comment:list` |
| 884 | F | 评论审核操作 | - | `community:comment:audit` |
| 885 | C | 举报处理 | `/community/reports` | `community:report:list` |
| 886 | F | 举报处理操作 | - | `community:report:handle` |
| 887 | C | 社区配置 | `/community/configs` | `community:config:list` |
| 888 | F | 社区配置编辑 | - | `community:config:edit` |

## 10. 测试策略

### 10.1 层级决策

本模块后端逻辑分支和后台页面都较多，采用：

1. `L1`：必做
2. `L3`：必做
3. `L4`：后台页首批加载与基础交互
4. `L2`：本期不强制落代码，但测试用例保留

### 10.2 重点覆盖

1. 发布动态/诚意贴的参数校验
2. 点赞、关注 toggle 逻辑
3. 评论新增/删除
4. 举报提交与后台处理
5. 内容/评论审核状态流转
6. 社区配置保存与读取

## 11. 风险与后续

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| PRD-01 认证表未落地 | 无法真实校验三项认证 | 用 `interaction_gate_mode` 降级并在代码集中预留接入点 |
| PRD-03 通知未落地 | 无法验证互动通知 | 技术方案显式声明未实现，测试用例标记跳过 |
| 微信机审未接入 | 无法验证机审异常/驳回 | 首批统一人工审核，后续扩展 `audit_source` |
| 现有菜单种子 ID 冲突 | 初始化脚本互相覆盖 | 社区模块使用 880 段独立种子 |

## 12. 本期实现清单

### 12.1 本次代码落地

1. 社区内容、评论、点赞、关注、举报建表与实体/DAO
2. 小程序社区主链路接口
3. 后台审核与举报处理接口
4. 后台社区管理聚合页
5. 社区配置与社区首页 Tab 轻配置读取
6. `docs/测试文档/社区互动-PRD05-testcase.md`
7. `docs/测试文档/社区互动-PRD05-test-l1.sh`
8. `backend/src/test/java/...Community*ServiceTest.java`
9. `frontend/e2e-tests/tests/community.spec.ts`

### 12.2 本期仅做文档/预留

1. 三项认证真实校验
2. 通知中心写入与红点
3. 微信官方内容机审
4. 推荐算法排序
5. 个人关键词屏蔽、隐藏动态过滤
