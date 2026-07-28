-- ======================================================
-- PRD-07 推广裂变与邀请奖励模块标准 DDL
-- 版本：2026-07-27
-- 事实源：最新版 PRD-07 与重构技术方案
-- ======================================================

CREATE TABLE IF NOT EXISTS promotion_rule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_type VARCHAR(30) NOT NULL COMMENT 'normal_user/campus_agent',
    reward_mode VARCHAR(20) NOT NULL COMMENT 'fixed/ladder',
    version_no INT NOT NULL,
    status VARCHAR(20) NOT NULL COMMENT 'published/superseded',
    published_at DATETIME NOT NULL,
    published_by BIGINT DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_source_version (source_type, version_no),
    INDEX idx_rule_source_status (source_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广规则不可变版本头';

CREATE TABLE IF NOT EXISTS promotion_rule_current (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_type VARCHAR(30) NOT NULL,
    rule_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_rule_current_source (source_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广当前规则指针';

CREATE TABLE IF NOT EXISTS promotion_rule_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_label VARCHAR(100) NOT NULL,
    enabled TINYINT NOT NULL DEFAULT 1,
    amount DECIMAL(16,2) NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_rule_event (rule_id, event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广规则事件快照';

CREATE TABLE IF NOT EXISTS promotion_rule_tier (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_id BIGINT NOT NULL,
    threshold_count INT NOT NULL,
    amount DECIMAL(16,2) NOT NULL DEFAULT 0,
    enabled TINYINT NOT NULL DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_rule_threshold (rule_id, threshold_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广阶梯精确阈值快照';

CREATE TABLE IF NOT EXISTS promotion_source_trace (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trace_no VARCHAR(64) NOT NULL,
    source_type VARCHAR(30) NOT NULL COMMENT 'normal_user/campus_agent',
    inviter_id BIGINT DEFAULT NULL,
    agent_id BIGINT DEFAULT NULL,
    qr_token VARCHAR(96) DEFAULT NULL,
    request_key VARCHAR(128) DEFAULT NULL COMMENT '匿名来源请求幂等键',
    traced_at DATETIME NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_trace_no (trace_no),
    UNIQUE KEY uk_trace_request_key (request_key),
    INDEX idx_trace_normal (source_type, inviter_id, traced_at),
    INDEX idx_trace_agent (source_type, agent_id, traced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='匿名推广来源记录';

CREATE TABLE IF NOT EXISTS promotion_invite_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    relation_no VARCHAR(64) NOT NULL,
    source_trace_id BIGINT NOT NULL,
    source_type VARCHAR(30) NOT NULL COMMENT 'normal_user/campus_agent',
    inviter_id BIGINT DEFAULT NULL,
    agent_id BIGINT DEFAULT NULL,
    invitee_id BIGINT NOT NULL,
    registered_at DATETIME NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_relation_no (relation_no),
    UNIQUE KEY uk_invitee_id (invitee_id),
    INDEX idx_relation_inviter (inviter_id, registered_at),
    INDEX idx_relation_agent (agent_id, registered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='永久邀请关系事实';

CREATE TABLE IF NOT EXISTS promotion_invite_counter (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_type VARCHAR(30) NOT NULL,
    reward_object_id BIGINT NOT NULL,
    success_count INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_invite_counter (source_type, reward_object_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请对象成功人数计数器';

CREATE TABLE IF NOT EXISTS promotion_event_inbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_key VARCHAR(128) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    user_id BIGINT NOT NULL,
    biz_no VARCHAR(128) DEFAULT NULL,
    payload_json JSON DEFAULT NULL,
    normal_rule_id BIGINT DEFAULT NULL,
    agent_rule_id BIGINT DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/success/failed',
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_time DATETIME DEFAULT NULL,
    last_error VARCHAR(500) DEFAULT NULL,
    processed_at DATETIME DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_event_key (event_key),
    INDEX idx_inbox_claim (status, next_retry_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广事实事件收件箱';

CREATE TABLE IF NOT EXISTS promotion_reward_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reward_no VARCHAR(64) NOT NULL,
    relation_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL,
    invitee_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_label_snapshot VARCHAR(100) NOT NULL,
    rule_id BIGINT NOT NULL,
    rule_version INT NOT NULL,
    ladder_threshold INT DEFAULT NULL,
    amount DECIMAL(16,0) NOT NULL DEFAULT 0 COMMENT '千寻币整数',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/success/failed',
    idempotency_key VARCHAR(160) NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_time DATETIME DEFAULT NULL,
    last_retry_time DATETIME DEFAULT NULL,
    failure_reason VARCHAR(500) DEFAULT NULL,
    coin_log_id BIGINT DEFAULT NULL,
    success_time DATETIME DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_reward_no (reward_no),
    UNIQUE KEY uk_reward_idempotency (idempotency_key),
    INDEX idx_reward_inviter (inviter_id, status, create_time),
    INDEX idx_reward_relation (relation_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='普通邀请奖励流水';

CREATE TABLE IF NOT EXISTS promotion_agent (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_no VARCHAR(64) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(50) DEFAULT NULL,
    contact_phone VARCHAR(255) DEFAULT NULL COMMENT '沿用现有PII存储规范，接口默认脱敏并受敏感字段权限控制',
    school VARCHAR(100) NOT NULL,
    campus VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'enabled' COMMENT 'enabled/disabled',
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_agent_no (agent_no),
    INDEX idx_agent_school_status (school, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园推广员';

CREATE TABLE IF NOT EXISTS promotion_agent_qr_code (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL,
    qr_token VARCHAR(96) NOT NULL,
    miniapp_path VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_agent_qr (agent_id),
    UNIQUE KEY uk_qr_token (qr_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园推广员永久二维码';

CREATE TABLE IF NOT EXISTS promotion_agent_bonus_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bonus_no VARCHAR(64) NOT NULL,
    agent_id BIGINT NOT NULL,
    relation_id BIGINT NOT NULL,
    invitee_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_label_snapshot VARCHAR(100) NOT NULL,
    rule_id BIGINT NOT NULL,
    rule_version INT NOT NULL,
    ladder_threshold INT DEFAULT NULL,
    amount DECIMAL(16,2) NOT NULL DEFAULT 0,
    occurred_at DATETIME NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    settlement_id BIGINT DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_bonus_no (bonus_no),
    UNIQUE KEY uk_bonus_idempotency (idempotency_key),
    INDEX idx_bonus_agent_time (agent_id, occurred_at),
    INDEX idx_bonus_settlement (settlement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园推广员奖金事实';

CREATE TABLE IF NOT EXISTS promotion_agent_settlement (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    settlement_no VARCHAR(64) NOT NULL,
    agent_id BIGINT NOT NULL,
    settlement_month DATE NOT NULL COMMENT '结算自然月首日',
    payable_amount DECIMAL(16,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_confirm' COMMENT 'pending_confirm/confirmed',
    confirmed_time DATETIME DEFAULT NULL,
    confirmed_by BIGINT DEFAULT NULL,
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_settlement_no (settlement_no),
    UNIQUE KEY uk_agent_month (agent_id, settlement_month),
    INDEX idx_settlement_status (status, settlement_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园推广员月度结算';

CREATE TABLE IF NOT EXISTS promo_agent_stat (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL,
    agent_no VARCHAR(64) NOT NULL,
    click_cnt INT NOT NULL DEFAULT 0,
    success_invite_count INT NOT NULL DEFAULT 0,
    total_bonus_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
    pending_bonus_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
    confirmed_bonus_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
    last_settlement_time DATETIME DEFAULT NULL,
    last_rebuild_time DATETIME DEFAULT NULL,
    stat_version INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_agent_stat (agent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校园推广员可重建统计快照';

CREATE TABLE IF NOT EXISTS promotion_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    biz_type VARCHAR(50) NOT NULL,
    biz_id BIGINT DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    before_value JSON DEFAULT NULL,
    after_value JSON DEFAULT NULL,
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    INDEX idx_audit_biz (biz_type, biz_id),
    INDEX idx_audit_action_time (action, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广敏感操作审计';

CREATE TABLE IF NOT EXISTS promotion_export_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_no VARCHAR(64) NOT NULL,
    page_type VARCHAR(30) NOT NULL,
    filter_json JSON DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    file_name VARCHAR(255) DEFAULT NULL,
    file_url VARCHAR(500) DEFAULT NULL,
    row_count INT DEFAULT NULL,
    failure_reason VARCHAR(500) DEFAULT NULL,
    finished_at DATETIME DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_export_task_no (task_no),
    INDEX idx_export_creator (created_by, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广异步导出任务';

-- 资产流水由业务幂等键承担最终防重；使用 information_schema 保证 MySQL 8/9 可重复执行。
DROP PROCEDURE IF EXISTS prd07_ensure_coin_idempotency;
DELIMITER $$
CREATE PROCEDURE prd07_ensure_coin_idempotency()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'app_user_coin_log'
           AND column_name = 'biz_idempotency_key'
    ) THEN
        ALTER TABLE app_user_coin_log
            ADD COLUMN biz_idempotency_key VARCHAR(160) DEFAULT NULL COMMENT '业务幂等键';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = 'app_user_coin_log'
           AND index_name = 'uk_coin_biz_idempotency'
    ) THEN
        ALTER TABLE app_user_coin_log
            ADD UNIQUE KEY uk_coin_biz_idempotency (biz_idempotency_key);
    END IF;
END$$
DELIMITER ;
CALL prd07_ensure_coin_idempotency();
DROP PROCEDURE prd07_ensure_coin_idempotency;

-- 推广后台只保留五个页面；先删除旧 700 段种子再重建。
DELETE FROM sys_role_menu WHERE menu_id BETWEEN 700 AND 799;
DELETE FROM sys_menu WHERE id BETWEEN 700 AND 799;

INSERT INTO sys_menu
    (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status)
VALUES
    (700, 0, '推广裂变', 'M', NULL, NULL, 'Share2', NULL, 70, 1, 'ENABLED'),
    (701, 700, '推广规则', 'C', '/promotion/rules', 'promotion/PromotionRulesPage', 'Settings', 'promotion:rule:view', 1, 1, 'ENABLED'),
    (702, 701, '发布普通规则', 'F', NULL, NULL, NULL, 'promotion:rule:normal:publish', 1, 0, 'ENABLED'),
    (703, 701, '发布推广员规则', 'F', NULL, NULL, NULL, 'promotion:rule:agent:publish', 2, 0, 'ENABLED'),
    (710, 700, '邀请关系', 'C', '/promotion/relations', 'promotion/PromotionRelationsPage', 'Users', 'promotion:relation:view', 2, 1, 'ENABLED'),
    (711, 710, '导出邀请关系', 'F', NULL, NULL, NULL, 'promotion:relation:export', 1, 0, 'ENABLED'),
    (720, 700, '邀请奖励', 'C', '/promotion/rewards', 'promotion/PromotionRewardsPage', 'Coins', 'promotion:reward:view', 3, 1, 'ENABLED'),
    (721, 720, '重试失败奖励', 'F', NULL, NULL, NULL, 'promotion:reward:retry', 1, 0, 'ENABLED'),
    (722, 720, '导出邀请奖励', 'F', NULL, NULL, NULL, 'promotion:reward:export', 2, 0, 'ENABLED'),
    (730, 700, '校园推广员', 'C', '/promotion/agents', 'promotion/PromotionAgentsPage', 'UserCheck', 'promotion:agent:view', 4, 1, 'ENABLED'),
    (731, 730, '编辑校园推广员', 'F', NULL, NULL, NULL, 'promotion:agent:edit', 1, 0, 'ENABLED'),
    (732, 730, '校园推广员二维码', 'F', NULL, NULL, NULL, 'promotion:agent:qrcode', 2, 0, 'ENABLED'),
    (733, 730, '导出校园推广员', 'F', NULL, NULL, NULL, 'promotion:agent:export', 3, 0, 'ENABLED'),
    (734, 730, '查看推广员敏感字段', 'F', NULL, NULL, NULL, 'promotion:agent:sensitive', 4, 0, 'ENABLED'),
    (740, 700, '推广员结算', 'C', '/promotion/settlements', 'promotion/PromotionSettlementsPage', 'DollarSign', 'promotion:settlement:view', 5, 1, 'ENABLED'),
    (741, 740, '确定结算', 'F', NULL, NULL, NULL, 'promotion:settlement:confirm', 1, 0, 'ENABLED'),
    (742, 740, '导出推广员结算', 'F', NULL, NULL, NULL, 'promotion:settlement:export', 2, 0, 'ENABLED');

-- 超级管理员自动获得推广模块全部菜单与按钮权限。
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT role.id, menu.id
  FROM sys_role role
  JOIN sys_menu menu ON menu.id BETWEEN 700 AND 799
 WHERE role.role_code = 'super_admin'
   AND role.deleted = 0
   AND menu.deleted = 0;
