-- ======================================================
-- 推广裂变模块 DDL
-- 包含：推广规则、来源追踪、邀请关系、奖励流水、代理、结算
-- ======================================================

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

-- ======================================================
-- 推广裂变后台菜单与权限种子
-- 说明：若已初始化 RBAC，可按需执行本段。ID 使用 700 段避免与基础菜单冲突。
-- ======================================================

INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status)
VALUES
(700, 0, '推广裂变', 'M', NULL, NULL, 'Share2', NULL, 70, 1, 'ENABLED'),
(701, 700, '推广规则配置', 'C', '/promotion/rule-config', 'promotion/PromotionManagement', 'Settings', 'promotion:rule:list', 1, 1, 'ENABLED'),
(702, 701, '保存普通奖励规则', 'F', NULL, NULL, NULL, 'promotion:rule:invite:save', 1, 0, 'ENABLED'),
(703, 701, '保存代理奖励规则', 'F', NULL, NULL, NULL, 'promotion:rule:agent:save', 2, 0, 'ENABLED'),
(704, 701, '保存风控参数', 'F', NULL, NULL, NULL, 'promotion:rule:risk:save', 3, 0, 'ENABLED'),
(710, 700, '普通邀请关系', 'C', '/promotion/invite-relation', 'promotion/PromotionManagement', 'Users', 'promotion:relation:list', 2, 1, 'ENABLED'),
(711, 710, '邀请关系处理', 'F', NULL, NULL, NULL, 'promotion:relation:review', 1, 0, 'ENABLED'),
(712, 700, '邀请关系详情', 'C', '/promotion/invite-relation', 'promotion/PromotionManagement', 'FileText', 'promotion:relation:detail', 3, 0, 'ENABLED'),
(720, 700, '普通邀请奖励流水', 'C', '/promotion/invite-reward', 'promotion/PromotionManagement', 'Coins', 'promotion:reward:list', 4, 1, 'ENABLED'),
(721, 700, '冻结奖励处理页', 'C', '/promotion/invite-reward/frozen', 'promotion/PromotionManagement', 'ShieldAlert', 'promotion:reward:frozen', 5, 1, 'ENABLED'),
(722, 721, '冻结奖励处理', 'F', NULL, NULL, NULL, 'promotion:reward:review', 1, 0, 'ENABLED'),
(730, 700, '代理列表', 'C', '/promotion/agent', 'promotion/PromotionManagement', 'UserCheck', 'promotion:agent:list', 6, 1, 'ENABLED'),
(731, 730, '新增代理', 'F', NULL, NULL, NULL, 'promotion:agent:add', 1, 0, 'ENABLED'),
(732, 730, '编辑代理', 'F', NULL, NULL, NULL, 'promotion:agent:edit', 2, 0, 'ENABLED'),
(733, 700, '代理详情页', 'C', '/promotion/agent', 'promotion/PromotionManagement', 'FileText', 'promotion:agent:detail', 7, 0, 'ENABLED'),
(740, 700, '代理结算管理', 'C', '/promotion/settlement', 'promotion/PromotionManagement', 'DollarSign', 'promotion:settlement:list', 8, 1, 'ENABLED'),
(742, 740, '确认结算', 'F', NULL, NULL, NULL, 'promotion:settlement:confirm', 1, 0, 'ENABLED'),
(743, 740, '发放结算', 'F', NULL, NULL, NULL, 'promotion:settlement:pay', 2, 0, 'ENABLED'),
(750, 700, '推广素材与二维码管理', 'C', '/promotion/material', 'promotion/PromotionManagement', 'QrCode', 'promotion:material:list', 9, 1, 'ENABLED'),
(751, 750, '重生成二维码', 'F', NULL, NULL, NULL, 'promotion:material:regenerate', 1, 0, 'ENABLED'),
(752, 750, '停用二维码展示', 'F', NULL, NULL, NULL, 'promotion:material:disable', 2, 0, 'ENABLED')
ON DUPLICATE KEY UPDATE
menu_name = VALUES(menu_name),
parent_id = VALUES(parent_id),
menu_type = VALUES(menu_type),
path = VALUES(path),
component = VALUES(component),
icon = VALUES(icon),
perms = VALUES(perms),
menu_sort = VALUES(menu_sort),
visible = VALUES(visible),
status = VALUES(status);
