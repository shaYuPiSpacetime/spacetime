-- ======================================================
-- 生产业务表安全迁移
-- 从 backend/docs/sql 的非破坏性 schema 机械提取 CREATE TABLE IF NOT EXISTS。
-- ======================================================


-- 来源：backend/docs/sql/schema-dict.sql
CREATE TABLE IF NOT EXISTS sys_dict_type (
    id BIGINT AUTO_INCREMENT COMMENT '字典主键',
    dict_name VARCHAR(100) NOT NULL COMMENT '字典名称',
    dict_type VARCHAR(100) NOT NULL COMMENT '字典类型（唯一编码），如 gender, member_level',
    dict_sort INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态：ENABLED=启用 / DISABLED=禁用',
    remark VARCHAR(500) DEFAULT '' COMMENT '备注',
    create_time DATETIME COMMENT '创建时间',
    update_time DATETIME COMMENT '更新时间',
    created_by BIGINT COMMENT '创建人',
    updated_by BIGINT COMMENT '更新人',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    UNIQUE KEY uk_dict_type (dict_type),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典类型表';

CREATE TABLE IF NOT EXISTS sys_dict_data (
    id BIGINT AUTO_INCREMENT COMMENT '字典数据主键',
    dict_type VARCHAR(100) NOT NULL COMMENT '所属字典类型编码',
    parent_id BIGINT DEFAULT 0 COMMENT '父级ID（0=顶级），支持多层级',
    dict_label VARCHAR(100) NOT NULL COMMENT '字典标签（显示文本）',
    dict_value VARCHAR(100) NOT NULL COMMENT '字典键值（存储值）',
    dict_sort INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态：ENABLED=启用 / DISABLED=禁用',
    remark VARCHAR(500) DEFAULT '' COMMENT '备注',
    create_time DATETIME COMMENT '创建时间',
    update_time DATETIME COMMENT '更新时间',
    created_by BIGINT COMMENT '创建人',
    updated_by BIGINT COMMENT '更新人',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_dict_type (dict_type),
    INDEX idx_parent_id (parent_id),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典数据表（支持多层级）';


-- 来源：backend/docs/sql/schema-content.sql
CREATE TABLE IF NOT EXISTS content_article (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL COMMENT '文章类型 @see ArticleTypeEnum',
    category VARCHAR(50) DEFAULT NULL COMMENT '子分类/内容分类',
    title VARCHAR(100) NOT NULL COMMENT '标题',
    summary VARCHAR(300) DEFAULT '' COMMENT '摘要',
    cover_url VARCHAR(500) DEFAULT NULL COMMENT '封面图 URL',
    content_type VARCHAR(20) NOT NULL COMMENT '内容类型 @see ContentTypeEnum: H5/NATIVE',
    content_url VARCHAR(500) DEFAULT NULL COMMENT 'H5 跳转地址',
    content_body TEXT DEFAULT NULL COMMENT '原生内容正文',
    sort INT DEFAULT 0 COMMENT '排序号，越小越靠前',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    effective_time DATETIME DEFAULT NULL COMMENT '生效时间，NULL 表示立即生效',
    expire_time DATETIME DEFAULT NULL COMMENT '失效时间，NULL 表示长期有效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_content_article_type_status (type, status, deleted),
    INDEX idx_content_article_category (category, status, deleted),
    INDEX idx_content_article_time (effective_time, expire_time),
    INDEX idx_content_article_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公共内容文章表';

CREATE TABLE IF NOT EXISTS app_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键，唯一',
    config_value TEXT DEFAULT NULL COMMENT '配置值',
    config_group VARCHAR(50) DEFAULT 'DEFAULT' COMMENT '配置分组 @see ConfigGroupEnum',
    config_type VARCHAR(20) DEFAULT 'TEXT' COMMENT '配置类型 @see ConfigTypeEnum',
    public_visible TINYINT DEFAULT 0 COMMENT '是否允许小程序公共接口返回：0=否，1=是',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    remark VARCHAR(200) DEFAULT '' COMMENT '备注说明',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    active_config_key VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN config_key ELSE NULL END) STORED COMMENT '未删除配置唯一键',
    UNIQUE KEY uk_app_config_key (active_config_key),
    INDEX idx_app_config_group (config_group, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应用配置表';

CREATE TABLE IF NOT EXISTS mobile_entry_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_code VARCHAR(50) NOT NULL COMMENT '页面编码 @see MobilePageCodeEnum',
    entry_key VARCHAR(100) NOT NULL COMMENT '入口稳定业务键',
    entry_name VARCHAR(50) NOT NULL COMMENT '入口展示名称',
    icon VARCHAR(100) DEFAULT NULL COMMENT '入口图标标识',
    jump_type VARCHAR(30) NOT NULL COMMENT '跳转类型 @see JumpTypeEnum',
    jump_target VARCHAR(500) DEFAULT NULL COMMENT '跳转目标',
    badge_text VARCHAR(30) DEFAULT NULL COMMENT '角标文案',
    badge_type VARCHAR(20) DEFAULT 'NONE' COMMENT '角标类型：TEXT/DOT/NONE',
    login_required TINYINT DEFAULT 0 COMMENT '是否需要登录：0=否，1=是',
    sort INT DEFAULT 0 COMMENT '排序号，越小越靠前',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    extra_json TEXT DEFAULT NULL COMMENT '扩展 JSON',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    active_entry_key VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN entry_key ELSE NULL END) STORED COMMENT '未删除入口唯一键',
    UNIQUE KEY uk_mobile_entry_page_key (page_code, active_entry_key),
    INDEX idx_mobile_entry_page_status (page_code, status, deleted),
    INDEX idx_mobile_entry_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='移动端入口配置表';

CREATE TABLE IF NOT EXISTS search_hot_word (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(30) NOT NULL COMMENT '热词内容',
    scene VARCHAR(30) DEFAULT 'GLOBAL' COMMENT '适用场景：GLOBAL/USER/POST/TOPIC',
    sort INT DEFAULT 0 COMMENT '排序号，越小越靠前',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_search_hot_scene_status (scene, status, deleted),
    INDEX idx_search_hot_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='搜索热词表';

CREATE TABLE IF NOT EXISTS search_block_word (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(50) NOT NULL COMMENT '屏蔽词内容',
    block_type VARCHAR(30) NOT NULL COMMENT '屏蔽类型 @see SearchBlockTypeEnum',
    match_type VARCHAR(20) DEFAULT 'FUZZY' COMMENT '匹配类型 @see MatchTypeEnum',
    reason_code VARCHAR(50) DEFAULT NULL COMMENT '屏蔽原因字典值',
    hit_message VARCHAR(200) DEFAULT NULL COMMENT '命中提示文案',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    remark VARCHAR(200) DEFAULT '' COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_search_block_type_status (block_type, status, deleted),
    INDEX idx_search_block_word (word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='搜索屏蔽词/违规词表';

CREATE TABLE IF NOT EXISTS content_operation_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    biz_type VARCHAR(50) NOT NULL COMMENT '业务类型：ARTICLE/APP_CONFIG/MOBILE_ENTRY/HOT_WORD/BLOCK_WORD',
    biz_id BIGINT DEFAULT NULL COMMENT '业务主键',
    action VARCHAR(50) NOT NULL COMMENT '动作：CREATE/UPDATE/ENABLE/DISABLE/DELETE/SORT',
    before_value TEXT DEFAULT NULL COMMENT '变更前摘要 JSON',
    after_value TEXT DEFAULT NULL COMMENT '变更后摘要 JSON',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_content_log_biz (biz_type, biz_id),
    INDEX idx_content_log_action_time (action, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公共内容配置操作日志';


-- 来源：backend/docs/sql/schema-community.sql
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
    UNIQUE KEY uk_post_user (post_id, user_id),
    INDEX idx_like_user (user_id)
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
    UNIQUE KEY uk_follow_pair (follower_id, target_user_id),
    INDEX idx_follow_target (target_user_id, status)
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
    handler_id BIGINT DEFAULT NULL COMMENT '处理人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_report_target (target_type, target_id, deleted),
    INDEX idx_report_status (status, update_time),
    INDEX idx_report_user (reporter_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区举报单';


-- 来源：backend/docs/sql/schema-promotion.sql
CREATE TABLE IF NOT EXISTS promotion_rule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    rule_type VARCHAR(30) NOT NULL COMMENT '规则类型: user_invite/agent_bonus/risk_control',
    event_type VARCHAR(50) NOT NULL COMMENT '奖励事件',
    reward_amount DECIMAL(16,4) DEFAULT 0 COMMENT '奖励成家币或奖金金额',
    reward_unit VARCHAR(20) DEFAULT 'coin' COMMENT 'coin/cash',
    daily_limit DECIMAL(16,4) DEFAULT NULL COMMENT '单日上限',
    effective_time DATETIME DEFAULT NULL COMMENT '生效时间',
    expire_time DATETIME DEFAULT NULL COMMENT '失效时间',
    agent_group VARCHAR(50) DEFAULT NULL COMMENT '适用代理组',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态',
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_rule_type_event (rule_type, event_type),
    INDEX idx_status_time (status, effective_time, expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广规则主表';

CREATE TABLE IF NOT EXISTS promotion_rule_tier (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_id BIGINT NOT NULL COMMENT 'promotion_rule.id',
    min_count INT NOT NULL COMMENT '阶梯最小成功邀请数',
    max_count INT NOT NULL COMMENT '阶梯最大成功邀请数',
    reward_amount DECIMAL(16,4) NOT NULL COMMENT '单人成家币奖励',
    status VARCHAR(20) DEFAULT 'ENABLED',
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_rule_tier (rule_id, min_count, max_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广阶梯规则表';

CREATE TABLE IF NOT EXISTS promotion_source_trace (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trace_no VARCHAR(64) NOT NULL COMMENT '来源追踪号',
    source_type VARCHAR(30) NOT NULL COMMENT 'user_qr/agent_qr',
    inviter_id BIGINT DEFAULT NULL COMMENT '普通邀请人ID',
    invite_code VARCHAR(64) DEFAULT NULL COMMENT '普通邀请码',
    agent_id BIGINT DEFAULT NULL COMMENT '代理ID',
    qr_code VARCHAR(64) DEFAULT NULL COMMENT '校园代理二维码编号',
    visitor_user_id BIGINT DEFAULT NULL COMMENT '打开时已登录用户ID',
    invitee_user_id BIGINT DEFAULT NULL COMMENT '注册后绑定用户ID',
    scene VARCHAR(255) DEFAULT NULL COMMENT '小程序scene或路径参数',
    device_hash VARCHAR(128) DEFAULT NULL COMMENT '设备指纹摘要',
    ip VARCHAR(64) DEFAULT NULL,
    bind_status VARCHAR(20) DEFAULT 'unbound' COMMENT 'unbound/bound/ignored/invalid',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_trace_no (trace_no),
    INDEX idx_source_inviter (source_type, inviter_id),
    INDEX idx_source_agent (source_type, qr_code),
    INDEX idx_invitee (invitee_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广来源追踪表';

CREATE TABLE IF NOT EXISTS promotion_invite_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    relation_no VARCHAR(64) NOT NULL COMMENT '关系编号',
    source_trace_id BIGINT DEFAULT NULL COMMENT '来源记录ID',
    source_type VARCHAR(30) NOT NULL COMMENT 'user_qr/agent_qr',
    inviter_id BIGINT DEFAULT NULL COMMENT '普通邀请人ID',
    invitee_id BIGINT NOT NULL COMMENT '被邀请用户ID',
    agent_id BIGINT DEFAULT NULL COMMENT '代理ID',
    qr_code VARCHAR(64) DEFAULT NULL COMMENT '校园代理二维码编号',
    status VARCHAR(30) DEFAULT 'registered' COMMENT 'registered/profile_completed/verify_success',
    bind_time DATETIME NOT NULL COMMENT '绑定时间',
    first_click_time DATETIME DEFAULT NULL,
    register_time DATETIME DEFAULT NULL,
    first_login_time DATETIME DEFAULT NULL,
    profile_complete_time DATETIME DEFAULT NULL,
    verify_success_time DATETIME DEFAULT NULL,
    frozen_before_status VARCHAR(30) DEFAULT NULL COMMENT '冻结前状态',
    invalid_reason VARCHAR(100) DEFAULT NULL COMMENT '无效原因',
    success_metric_hit_time DATETIME DEFAULT NULL COMMENT '命中后台成功口径时间',
    total_reward_coin DECIMAL(16,4) DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_invitee_active (invitee_id, deleted),
    UNIQUE KEY uk_relation_no (relation_no),
    INDEX idx_inviter_status (inviter_id, status),
    INDEX idx_agent_status (agent_id, status),
    INDEX idx_bind_time (bind_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请关系表';

CREATE TABLE IF NOT EXISTS promotion_reward_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reward_no VARCHAR(64) NOT NULL COMMENT '奖励流水号',
    relation_id BIGINT NOT NULL COMMENT '邀请关系ID',
    inviter_id BIGINT NOT NULL COMMENT '邀请人ID',
    invitee_id BIGINT NOT NULL COMMENT '被邀请人ID',
    event_type VARCHAR(50) NOT NULL COMMENT '奖励事件类型',
    reward_coin DECIMAL(16,4) NOT NULL COMMENT '奖励成家币',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/success/frozen/invalid',
    risk_reason VARCHAR(500) DEFAULT NULL,
    coin_log_id BIGINT DEFAULT NULL COMMENT 'app_user_coin_log.id',
    arrive_time DATETIME DEFAULT NULL,
    review_time DATETIME DEFAULT NULL,
    reviewer_id BIGINT DEFAULT NULL,
    review_remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_relation_event (relation_id, event_type, deleted),
    UNIQUE KEY uk_reward_no (reward_no),
    INDEX idx_inviter_status_time (inviter_id, status, create_time),
    INDEX idx_invitee (invitee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='普通邀请奖励流水表';

CREATE TABLE IF NOT EXISTS promotion_agent (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_no VARCHAR(64) DEFAULT NULL COMMENT '代理展示编号',
    agent_name VARCHAR(100) NOT NULL COMMENT '代理名称',
    contact_name VARCHAR(50) DEFAULT NULL COMMENT '联系人',
    contact_phone VARCHAR(30) DEFAULT NULL COMMENT '联系电话',
    school VARCHAR(100) DEFAULT NULL COMMENT '学校',
    campus VARCHAR(100) DEFAULT NULL COMMENT '校区',
    agent_group VARCHAR(50) DEFAULT 'DEFAULT' COMMENT '奖金规则组',
    bonus_rule_group VARCHAR(64) DEFAULT NULL COMMENT '正式版奖金规则组',
    status VARCHAR(20) DEFAULT 'normal' COMMENT 'normal/paused/terminated',
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_agent_no (agent_no),
    INDEX idx_school_status (school, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园代理表';

CREATE TABLE IF NOT EXISTS promo_agent_stat (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL COMMENT '代理ID',
    agent_no VARCHAR(64) DEFAULT NULL COMMENT '代理展示编号',
    click_cnt INT DEFAULT 0 COMMENT '累计扫码/点击数',
    register_cnt INT DEFAULT 0 COMMENT '累计注册数',
    profile_cnt INT DEFAULT 0 COMMENT '累计资料完善数',
    verify_cnt INT DEFAULT 0 COMMENT '累计认证完成数',
    success_cnt INT DEFAULT 0 COMMENT '累计成功邀请数',
    first_vip_cnt INT DEFAULT 0 COMMENT '累计首次会员数',
    first_coin_recharge_cnt INT DEFAULT 0 COMMENT '累计首次充值成家币人数',
    bonus_due_amount DECIMAL(16,4) DEFAULT 0 COMMENT '累计应发奖金',
    bonus_pending_amount DECIMAL(16,4) DEFAULT 0 COMMENT '累计待结算奖金',
    bonus_confirmed_amount DECIMAL(16,4) DEFAULT 0 COMMENT '累计已确认待发奖金',
    bonus_paid_amount DECIMAL(16,4) DEFAULT 0 COMMENT '累计已发奖金',
    last_event_time DATETIME DEFAULT NULL COMMENT '最近一次代理事件时间',
    last_settlement_time DATETIME DEFAULT NULL COMMENT '最近一次结算状态更新时间',
    last_rebuild_time DATETIME DEFAULT NULL COMMENT '最近一次全量重算时间',
    stat_version INT DEFAULT 0 COMMENT '统计版本',
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_agent_id (agent_id),
    INDEX idx_agent_no (agent_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园代理统计预聚合表';

CREATE TABLE IF NOT EXISTS promotion_agent_qr_code (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL COMMENT '代理ID',
    qr_code VARCHAR(64) NOT NULL COMMENT '校园代理二维码编号',
    miniapp_path VARCHAR(255) NOT NULL COMMENT '小程序路径',
    qr_url VARCHAR(500) DEFAULT NULL COMMENT '二维码OSS地址',
    material_url VARCHAR(500) DEFAULT NULL COMMENT '二维码素材OSS地址',
    version_no INT DEFAULT 1 COMMENT '版本号',
    status VARCHAR(20) DEFAULT 'enabled' COMMENT 'enabled/disabled',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_qr_code (qr_code),
    INDEX idx_agent_status (agent_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园代理二维码表';

CREATE TABLE IF NOT EXISTS promotion_agent_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL,
    qr_code VARCHAR(64) NOT NULL,
    relation_id BIGINT DEFAULT NULL,
    user_id BIGINT DEFAULT NULL COMMENT '被推广用户ID',
    event_type VARCHAR(50) NOT NULL COMMENT 'click/registered/profile_completed/verify_success/first_vip/first_coin_recharge',
    event_time DATETIME NOT NULL,
    bonus_generated TINYINT DEFAULT 0 COMMENT '是否已生成奖金',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_agent_user_event (agent_id, user_id, event_type, deleted),
    INDEX idx_agent_event_time (agent_id, event_type, event_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理推广事件表';

CREATE TABLE IF NOT EXISTS promotion_agent_bonus_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bonus_no VARCHAR(64) NOT NULL COMMENT '奖金流水号',
    agent_id BIGINT NOT NULL,
    relation_id BIGINT DEFAULT NULL,
    user_id BIGINT DEFAULT NULL COMMENT '被推广用户ID',
    event_type VARCHAR(50) NOT NULL COMMENT '奖金事件',
    bonus_amount DECIMAL(16,4) NOT NULL COMMENT '应发奖金',
    status VARCHAR(30) DEFAULT 'pending_settlement' COMMENT 'pending_settlement/confirmed/paid/cancelled',
    settlement_id BIGINT DEFAULT NULL COMMENT '结算单ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_bonus_no (bonus_no),
    UNIQUE KEY uk_agent_user_event (agent_id, user_id, event_type, deleted),
    INDEX idx_agent_status_time (agent_id, status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理奖金明细表';

CREATE TABLE IF NOT EXISTS promotion_agent_settlement (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    settlement_no VARCHAR(64) NOT NULL COMMENT '结算单号',
    agent_id BIGINT NOT NULL,
    period_start DATE NOT NULL COMMENT '结算开始日期',
    period_end DATE NOT NULL COMMENT '结算结束日期',
    stats_desc VARCHAR(500) DEFAULT NULL COMMENT '统计口径说明',
    payable_amount DECIMAL(16,4) NOT NULL COMMENT '应结算金额',
    paid_amount DECIMAL(16,4) DEFAULT 0 COMMENT '已结算金额',
    status VARCHAR(30) DEFAULT 'unsettled' COMMENT 'unsettled/confirmed/paid/cancelled',
    confirm_time DATETIME DEFAULT NULL,
    paid_time DATETIME DEFAULT NULL,
    operator_id BIGINT DEFAULT NULL,
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_settlement_no (settlement_no),
    INDEX idx_agent_period (agent_id, period_start, period_end),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理结算单表';

CREATE TABLE IF NOT EXISTS promotion_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    biz_type VARCHAR(50) NOT NULL COMMENT '规则/邀请/奖励/代理/结算',
    biz_id BIGINT DEFAULT NULL COMMENT '业务ID',
    action VARCHAR(50) NOT NULL COMMENT 'create/update/approve/reject/disable/confirm/paid',
    before_value VARCHAR(1000) DEFAULT NULL,
    after_value VARCHAR(1000) DEFAULT NULL,
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_biz_type_id (biz_type, biz_id),
    INDEX idx_action_time (action, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广模块操作日志';


-- 来源：backend/docs/sql/schema-commercial.sql
CREATE TABLE IF NOT EXISTS app_vip_benefit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    benefit_code VARCHAR(50) NOT NULL COMMENT '权益编码',
    benefit_name VARCHAR(100) DEFAULT NULL COMMENT '权益名称',
    benefit_type VARCHAR(30) DEFAULT NULL COMMENT '权益类型',
    benefit_desc VARCHAR(500) DEFAULT NULL COMMENT '权益描述',
    mobile_icon VARCHAR(100) DEFAULT NULL COMMENT '移动端图标',
    benefit_value INT DEFAULT NULL COMMENT '权益数值',
    fixed_flag TINYINT DEFAULT 0 COMMENT '是否固定权益: 0=否, 1=是',
    display_order INT DEFAULT 0 COMMENT '展示排序',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_benefit_code (benefit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP权益配置表';

CREATE TABLE IF NOT EXISTS app_vip_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    package_type VARCHAR(30) DEFAULT 'normal' COMMENT '套餐类型: normal/limited',
    subscription_type VARCHAR(30) DEFAULT 'once' COMMENT '订阅类型: once/month/quarter/year',
    price DECIMAL(10,2) DEFAULT 0 COMMENT '售价',
    origin_price DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    duration_days INT DEFAULT 0 COMMENT '有效天数',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
    wechat_product_id VARCHAR(100) DEFAULT NULL COMMENT '微信商品ID预留',
    agreement_config VARCHAR(500) DEFAULT NULL COMMENT '协议配置',
    pay_channel_reserve VARCHAR(500) DEFAULT NULL COMMENT '支付渠道预留字段',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP套餐配置表';

CREATE TABLE IF NOT EXISTS app_coin_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    amount DECIMAL(10,2) DEFAULT 0 COMMENT '售价',
    origin_amount DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    discount_amount DECIMAL(10,2) DEFAULT NULL COMMENT '优惠价',
    coin_count INT DEFAULT 0 COMMENT '成家币数量',
    bonus_coin_count INT DEFAULT 0 COMMENT '赠送成家币数量',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
    mobile_tag VARCHAR(50) DEFAULT NULL COMMENT '移动端展示标签',
    package_desc VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币套餐配置表';

CREATE TABLE IF NOT EXISTS app_user_asset (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    vip_status VARCHAR(20) DEFAULT 'inactive' COMMENT 'VIP状态: inactive/active/expired',
    vip_expire_time DATETIME DEFAULT NULL COMMENT 'VIP到期时间',
    coin_balance INT DEFAULT 0 COMMENT '成家币余额',
    today_free_whisper_remain INT DEFAULT 0 COMMENT '今日剩余免费悄悄话次数',
    total_recharge DECIMAL(10,2) DEFAULT 0 COMMENT '累计充值金额',
    last_consume_time DATETIME DEFAULT NULL COMMENT '最后消费时间',
    last_purchase_time DATETIME DEFAULT NULL COMMENT '最后购买时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资产表';

CREATE TABLE IF NOT EXISTS app_trade_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(64) NOT NULL COMMENT '订单编号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    order_type VARCHAR(20) DEFAULT NULL COMMENT '订单类型: vip/coin',
    package_id BIGINT DEFAULT NULL COMMENT '套餐ID',
    package_name VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
    pay_amount DECIMAL(10,2) DEFAULT 0 COMMENT '实付金额',
    pay_channel VARCHAR(30) DEFAULT 'mock' COMMENT '支付渠道: mock/wechat/alipay',
    channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT '渠道交易单号',
    prepay_id VARCHAR(100) DEFAULT NULL COMMENT '微信预支付交易会话标识',
    notify_summary VARCHAR(1000) DEFAULT NULL COMMENT '支付回调原始摘要',
    order_status VARCHAR(20) DEFAULT 'unpaid' COMMENT '订单状态: unpaid/success/closed/failed/refunding/refunded',
    success_time DATETIME DEFAULT NULL COMMENT '支付成功时间',
    expire_time DATETIME DEFAULT NULL COMMENT '订单过期时间',
    refund_time DATETIME DEFAULT NULL COMMENT '退款时间',
    refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_user_type_status (user_id, order_type, order_status),
    INDEX idx_status_time (order_status, create_time),
    INDEX idx_success_time (success_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易订单表';

CREATE TABLE IF NOT EXISTS app_user_coin_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flow_no VARCHAR(64) NOT NULL COMMENT '流水号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    flow_type VARCHAR(20) DEFAULT NULL COMMENT '流水类型: recharge/consume/gift/refund',
    change_amount INT DEFAULT 0 COMMENT '变动数量',
    balance_before INT DEFAULT 0 COMMENT '变动前余额',
    balance_after INT DEFAULT 0 COMMENT '变动后余额',
    biz_scene VARCHAR(50) DEFAULT NULL COMMENT '业务场景',
    biz_desc VARCHAR(200) DEFAULT NULL COMMENT '业务描述',
    ref_id BIGINT DEFAULT NULL COMMENT '关联业务ID',
    ref_type VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_flow_no (flow_no),
    INDEX idx_user_time (user_id, create_time),
    INDEX idx_ref (ref_id, ref_type),
    INDEX idx_scene_time (biz_scene, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币流水表';

CREATE TABLE IF NOT EXISTS app_coin_scene_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    scene_code VARCHAR(50) NOT NULL COMMENT '场景编码',
    mobile_name VARCHAR(100) NOT NULL COMMENT '移动端名称',
    mobile_icon VARCHAR(100) DEFAULT NULL COMMENT '移动端图标',
    scene_desc VARCHAR(500) DEFAULT NULL COMMENT '场景说明',
    unit_price INT DEFAULT 0 COMMENT '单价，单位：成家币',
    retention_days INT DEFAULT 0 COMMENT '保留期天数，0表示永久',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_scene_code (scene_code),
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币消费场景配置表';

CREATE TABLE IF NOT EXISTS app_commercial_config_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_version VARCHAR(50) NOT NULL COMMENT '配置版本号',
    change_module VARCHAR(50) DEFAULT 'commercial' COMMENT '变更模块',
    change_summary VARCHAR(500) DEFAULT NULL COMMENT '变更摘要',
    operator_id BIGINT DEFAULT NULL COMMENT '操作人ID',
    operator_name VARCHAR(100) DEFAULT NULL COMMENT '操作人名称',
    before_snapshot JSON DEFAULT NULL COMMENT '变更前快照',
    after_snapshot JSON DEFAULT NULL COMMENT '变更后快照',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_version_time (config_version, create_time),
    INDEX idx_module_time (change_module, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商业化配置变更审计表';

CREATE TABLE IF NOT EXISTS app_refund_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    refund_no VARCHAR(64) NOT NULL COMMENT '退款单号',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(64) NOT NULL COMMENT '订单编号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    refund_amount DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
    refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
    refund_status VARCHAR(30) DEFAULT 'processing' COMMENT '退款状态: processing/success/failed',
    operator_id BIGINT DEFAULT NULL COMMENT '发起人ID',
    operator_name VARCHAR(100) DEFAULT NULL COMMENT '发起人名称',
    asset_rollback_action VARCHAR(100) DEFAULT NULL COMMENT '资产回退动作',
    channel_refund_no VARCHAR(100) DEFAULT NULL COMMENT '渠道退款单号',
    channel_refund_status VARCHAR(50) DEFAULT NULL COMMENT '渠道退款状态',
    channel_response_summary VARCHAR(1000) DEFAULT NULL COMMENT '渠道响应摘要',
    refund_time DATETIME DEFAULT NULL COMMENT '退款完成时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_refund_no (refund_no),
    INDEX idx_order_id (order_id),
    INDEX idx_user_time (user_id, create_time),
    INDEX idx_status_time (refund_status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款记录表';

CREATE TABLE IF NOT EXISTS app_payment_notify_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pay_channel VARCHAR(30) DEFAULT NULL COMMENT '支付渠道',
    order_no VARCHAR(64) DEFAULT NULL COMMENT '订单编号',
    channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT '渠道交易单号',
    notify_type VARCHAR(50) DEFAULT NULL COMMENT '回调类型',
    notify_payload TEXT DEFAULT NULL COMMENT '回调原文',
    process_status VARCHAR(30) DEFAULT NULL COMMENT '处理状态: success/failed/ignored',
    process_message VARCHAR(1000) DEFAULT NULL COMMENT '处理结果摘要',
    notify_time DATETIME DEFAULT NULL COMMENT '通知时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_order_channel (order_no, pay_channel),
    INDEX idx_notify_time (notify_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付回调日志预留表';

CREATE TABLE IF NOT EXISTS app_user_unlock_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID（发起解锁者）',
    target_user_id BIGINT NOT NULL COMMENT '被解锁目标用户ID',
    unlock_scene VARCHAR(50) DEFAULT NULL COMMENT '解锁场景',
    unlock_method VARCHAR(20) DEFAULT NULL COMMENT '解锁方式',
    coin_cost INT DEFAULT 0 COMMENT '消耗成家币数量',
    effective_time DATETIME DEFAULT NULL COMMENT '生效时间',
    expire_time DATETIME DEFAULT NULL COMMENT '过期时间',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/expired',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_user_scene (user_id, unlock_scene, status),
    INDEX idx_target (target_user_id),
    INDEX idx_expire (expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户解锁记录表';


-- 来源：backend/docs/sql/schema-user-security.sql
CREATE TABLE IF NOT EXISTS app_user_privacy_setting (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  show_distance TINYINT NOT NULL DEFAULT 1 COMMENT '是否展示距离',
  hide_active_time TINYINT NOT NULL DEFAULT 0 COMMENT '是否隐藏活跃时间',
  show_marital_status TINYINT NOT NULL DEFAULT 1 COMMENT '是否展示婚恋状态',
  profile_update_visible TINYINT NOT NULL DEFAULT 1 COMMENT '资料更新是否可见',
  only_opposite_interaction TINYINT NOT NULL DEFAULT 0 COMMENT '只接受异性互动',
  personalized_push TINYINT NOT NULL DEFAULT 1 COMMENT '个性化推荐/推送',
  match_chat_hint TINYINT NOT NULL DEFAULT 1 COMMENT '匹配聊天提示',
  smart_reply TINYINT NOT NULL DEFAULT 1 COMMENT '智能回复',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_privacy_user (user_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户隐私设置表';

CREATE TABLE IF NOT EXISTS app_user_notification_setting (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  interaction TINYINT NOT NULL DEFAULT 1 COMMENT '互动通知',
  community TINYINT NOT NULL DEFAULT 1 COMMENT '社区通知',
  daily_recommend TINYINT NOT NULL DEFAULT 1 COMMENT '每日推荐',
  app_exit TINYINT NOT NULL DEFAULT 1 COMMENT '离开应用提醒',
  match_success TINYINT NOT NULL DEFAULT 1 COMMENT '匹配成功',
  chat TINYINT NOT NULL DEFAULT 1 COMMENT '聊天消息',
  whisper TINYINT NOT NULL DEFAULT 1 COMMENT '悄悄话',
  certification TINYINT NOT NULL DEFAULT 1 COMMENT '认证通知',
  report TINYINT NOT NULL DEFAULT 1 COMMENT '举报/申诉通知',
  asset TINYINT NOT NULL DEFAULT 1 COMMENT '资产通知',
  banner_in_app TINYINT NOT NULL DEFAULT 1 COMMENT '站内横幅',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_notification_user (user_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户通知设置表';

CREATE TABLE IF NOT EXISTS app_user_relation_block (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '操作用户ID',
  target_user_id BIGINT NOT NULL COMMENT '目标用户ID',
  block_type VARCHAR(30) NOT NULL COMMENT 'BLACKLIST/HIDDEN_DYNAMIC',
  source_scene VARCHAR(50) DEFAULT NULL COMMENT '来源场景',
  status VARCHAR(30) NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_relation_block (user_id, target_user_id, block_type, deleted),
  KEY idx_relation_target (target_user_id, block_type, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户屏蔽关系表';

CREATE TABLE IF NOT EXISTS app_user_keyword_block (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  keyword VARCHAR(80) NOT NULL COMMENT '个人屏蔽关键词',
  status VARCHAR(30) NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_user_keyword (user_id, keyword, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户个人关键词屏蔽表';

CREATE TABLE IF NOT EXISTS app_user_feedback (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  feedback_type VARCHAR(50) NOT NULL COMMENT '反馈类型',
  content VARCHAR(2000) NOT NULL COMMENT '反馈内容',
  image_urls VARCHAR(2000) DEFAULT NULL COMMENT '截图URL，JSON数组',
  contact VARCHAR(100) DEFAULT NULL COMMENT '联系方式',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/PROCESSING/RESOLVED/CLOSED',
  handle_remark VARCHAR(1000) DEFAULT NULL COMMENT '处理备注',
  handled_by BIGINT DEFAULT NULL COMMENT '处理人',
  handled_time DATETIME DEFAULT NULL COMMENT '处理时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_feedback_user (user_id, deleted),
  KEY idx_feedback_status (status, create_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户反馈表';

CREATE TABLE IF NOT EXISTS app_user_cancel_request (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  status VARCHAR(30) NOT NULL DEFAULT 'COOLING_OFF' COMMENT 'COOLING_OFF/REVOKED/CANCELLED/BLOCKED',
  reason VARCHAR(500) DEFAULT NULL COMMENT '注销原因',
  block_reason VARCHAR(1000) DEFAULT NULL COMMENT '阻断原因',
  remark VARCHAR(1000) DEFAULT NULL COMMENT '后台备注',
  cooling_end_time DATETIME DEFAULT NULL COMMENT '后悔期结束时间',
  revoked_time DATETIME DEFAULT NULL COMMENT '撤销时间',
  final_cancel_time DATETIME DEFAULT NULL COMMENT '最终注销时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_cancel_user (user_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户注销申请表';

CREATE TABLE IF NOT EXISTS app_user_search_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  keyword VARCHAR(100) NOT NULL COMMENT '搜索关键词',
  search_type VARCHAR(30) NOT NULL COMMENT 'all/user/post/topic',
  result_count INT NOT NULL DEFAULT 0 COMMENT '返回结果数',
  violation TINYINT NOT NULL DEFAULT 0 COMMENT '是否命中违规词',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'BaseEntity统一字段，本表不做UPDATE',
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_search_user_time (user_id, create_time, deleted),
  KEY idx_search_keyword (keyword, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户搜索日志表';

CREATE TABLE IF NOT EXISTS app_user_security_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '目标用户ID',
  operator_id BIGINT DEFAULT NULL COMMENT '操作人ID',
  biz_type VARCHAR(50) NOT NULL COMMENT '业务类型',
  biz_id BIGINT DEFAULT NULL COMMENT '业务ID',
  action VARCHAR(50) NOT NULL COMMENT '动作',
  before_value VARCHAR(2000) DEFAULT NULL COMMENT '变更前摘要',
  after_value VARCHAR(2000) DEFAULT NULL COMMENT '变更后摘要',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_security_audit_user (user_id, create_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户安全设置审计日志';

