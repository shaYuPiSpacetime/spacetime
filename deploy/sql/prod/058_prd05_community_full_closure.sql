-- =============================================================
-- PRD-05 推荐与社区模块全链路闭环
-- 说明：增量、幂等迁移；保留存量帖子、评论、举报并迁移正式状态码。
-- =============================================================

DROP PROCEDURE IF EXISTS prd05_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd05_add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE prd05_add_column_if_missing(
    IN p_table_name VARCHAR(64), IN p_column_name VARCHAR(64), IN p_column_ddl TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = p_table_name AND column_name = p_column_name
    ) THEN
        SET @prd05_ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_column_ddl);
        PREPARE prd05_stmt FROM @prd05_ddl;
        EXECUTE prd05_stmt;
        DEALLOCATE PREPARE prd05_stmt;
    END IF;
END$$

CREATE PROCEDURE prd05_add_index_if_missing(
    IN p_table_name VARCHAR(64), IN p_index_name VARCHAR(64), IN p_index_ddl TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = p_table_name AND index_name = p_index_name
    ) THEN
        SET @prd05_ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD ', p_index_ddl);
        PREPARE prd05_stmt FROM @prd05_ddl;
        EXECUTE prd05_stmt;
        DEALLOCATE PREPARE prd05_stmt;
    END IF;
END$$
DELIMITER ;

CALL prd05_add_column_if_missing('community_post', 'post_no',
    'post_no VARCHAR(40) DEFAULT NULL COMMENT ''帖子业务编号'' AFTER id');
CALL prd05_add_column_if_missing('community_post', 'source_scene',
    'source_scene VARCHAR(40) NOT NULL DEFAULT ''qianxun_chengjia'' COMMENT ''内容来源场景'' AFTER post_type');
CALL prd05_add_column_if_missing('community_post', 'topic_code',
    'topic_code VARCHAR(64) DEFAULT NULL COMMENT ''话题稳定编码'' AFTER topic_id');
CALL prd05_add_column_if_missing('community_post', 'topic_name_snapshot',
    'topic_name_snapshot VARCHAR(100) DEFAULT NULL COMMENT ''发布时话题名称快照'' AFTER topic_code');
CALL prd05_add_column_if_missing('community_post', 'machine_result',
    'machine_result VARCHAR(30) DEFAULT NULL COMMENT ''pass/reject/review/unavailable'' AFTER audit_remark');
CALL prd05_add_column_if_missing('community_post', 'machine_code',
    'machine_code VARCHAR(64) DEFAULT NULL COMMENT ''内容安全服务结果码'' AFTER machine_result');
CALL prd05_add_column_if_missing('community_post', 'machine_detail',
    'machine_detail VARCHAR(1000) DEFAULT NULL COMMENT ''内容安全结果说明'' AFTER machine_code');
CALL prd05_add_column_if_missing('community_post', 'machine_checked_at',
    'machine_checked_at DATETIME DEFAULT NULL COMMENT ''机审完成时间'' AFTER machine_detail');
CALL prd05_add_column_if_missing('community_post', 'sample_required',
    'sample_required TINYINT NOT NULL DEFAULT 0 COMMENT ''是否进入人工抽检池'' AFTER machine_checked_at');
CALL prd05_add_column_if_missing('community_post', 'version',
    'version INT NOT NULL DEFAULT 0 COMMENT ''乐观锁版本'' AFTER sample_required');
CALL prd05_add_column_if_missing('community_post', 'published_at',
    'published_at DATETIME DEFAULT NULL COMMENT ''公开时间'' AFTER version');
CALL prd05_add_column_if_missing('community_post', 'handled_at',
    'handled_at DATETIME DEFAULT NULL COMMENT ''最后治理处理时间'' AFTER published_at');
CALL prd05_add_column_if_missing('community_post', 'author_ip',
    'author_ip VARCHAR(64) DEFAULT NULL COMMENT ''发布 IP（敏感）'' AFTER handled_at');

UPDATE community_post
   SET post_no = CONCAT('POST-', LPAD(id, 16, '0'))
 WHERE post_no IS NULL OR post_no = '';
UPDATE community_post
   SET source_scene = CASE WHEN post_type = 'sincere_post'
                           THEN 'qianxun_zhiyin_sincere' ELSE 'qianxun_chengjia' END
 WHERE source_scene IS NULL OR source_scene = '' OR source_scene = 'qianxun_chengjia';
UPDATE community_post
   SET post_type = CASE WHEN post_type IN ('community', 'normal_post') THEN 'community_post' ELSE post_type END,
       status = CASE UPPER(status)
           WHEN 'PENDING' THEN 'pending_manual'
           WHEN 'PUBLISHED' THEN 'published'
           WHEN 'REJECTED' THEN 'rejected'
           WHEN 'DELETED' THEN 'deleted'
           WHEN 'BLOCKED' THEN 'blocked'
           ELSE LOWER(status)
       END;
UPDATE community_post SET published_at = COALESCE(published_at, create_time)
 WHERE status = 'published';
CALL prd05_add_index_if_missing('community_post', 'uk_community_post_no',
    'UNIQUE INDEX uk_community_post_no (post_no)');
CALL prd05_add_index_if_missing('community_post', 'idx_community_post_scene_status',
    'INDEX idx_community_post_scene_status (source_scene, status, create_time)');

CALL prd05_add_column_if_missing('community_comment', 'comment_no',
    'comment_no VARCHAR(40) DEFAULT NULL COMMENT ''评论业务编号'' AFTER id');
CALL prd05_add_column_if_missing('community_comment', 'like_count',
    'like_count INT NOT NULL DEFAULT 0 COMMENT ''评论点赞数'' AFTER report_count');
CALL prd05_add_column_if_missing('community_comment', 'machine_result',
    'machine_result VARCHAR(30) DEFAULT NULL COMMENT ''pass/reject/review/unavailable'' AFTER audit_remark');
CALL prd05_add_column_if_missing('community_comment', 'machine_code',
    'machine_code VARCHAR(64) DEFAULT NULL COMMENT ''内容安全服务结果码'' AFTER machine_result');
CALL prd05_add_column_if_missing('community_comment', 'machine_detail',
    'machine_detail VARCHAR(1000) DEFAULT NULL COMMENT ''内容安全结果说明'' AFTER machine_code');
CALL prd05_add_column_if_missing('community_comment', 'machine_checked_at',
    'machine_checked_at DATETIME DEFAULT NULL COMMENT ''机审完成时间'' AFTER machine_detail');
CALL prd05_add_column_if_missing('community_comment', 'version',
    'version INT NOT NULL DEFAULT 0 COMMENT ''乐观锁版本'' AFTER machine_checked_at');
CALL prd05_add_column_if_missing('community_comment', 'published_at',
    'published_at DATETIME DEFAULT NULL COMMENT ''公开时间'' AFTER version');
CALL prd05_add_column_if_missing('community_comment', 'author_ip',
    'author_ip VARCHAR(64) DEFAULT NULL COMMENT ''评论 IP（敏感）'' AFTER published_at');
UPDATE community_comment SET comment_no = CONCAT('CMT-', LPAD(id, 16, '0'))
 WHERE comment_no IS NULL OR comment_no = '';
UPDATE community_comment SET status = CASE UPPER(status)
    WHEN 'PENDING' THEN 'pending_machine'
    WHEN 'PUBLISHED' THEN 'published'
    WHEN 'REJECTED' THEN 'rejected'
    WHEN 'DELETED' THEN 'deleted'
    WHEN 'BLOCKED' THEN 'blocked'
    ELSE LOWER(status) END;
UPDATE community_comment SET published_at = COALESCE(published_at, create_time)
 WHERE status = 'published';
CALL prd05_add_index_if_missing('community_comment', 'uk_community_comment_no',
    'UNIQUE INDEX uk_community_comment_no (comment_no)');

-- 举报目标升级为业务编号字符串，兼容旧数值 ID。
ALTER TABLE community_report MODIFY COLUMN target_id VARCHAR(64) NOT NULL COMMENT 'postNo/commentNo/userNo/会话业务编号';
CALL prd05_add_column_if_missing('community_report', 'report_no',
    'report_no VARCHAR(40) DEFAULT NULL COMMENT ''举报业务编号'' AFTER id');
CALL prd05_add_column_if_missing('community_report', 'source_type',
    'source_type VARCHAR(40) DEFAULT NULL COMMENT ''举报来源，聊天为 private_chat/whisper'' AFTER target_type');
CALL prd05_add_column_if_missing('community_report', 'target_user_id',
    'target_user_id BIGINT DEFAULT NULL COMMENT ''服务端反查的被举报用户'' AFTER target_id');
CALL prd05_add_column_if_missing('community_report', 'context_json',
    'context_json JSON DEFAULT NULL COMMENT ''服务端可信最小上下文'' AFTER extra_text');
CALL prd05_add_column_if_missing('community_report', 'evidence_json',
    'evidence_json JSON DEFAULT NULL COMMENT ''服务端证据快照'' AFTER context_json');
CALL prd05_add_column_if_missing('community_report', 'version',
    'version INT NOT NULL DEFAULT 0 COMMENT ''乐观锁版本'' AFTER status');
CALL prd05_add_column_if_missing('community_report', 'merged_to_report_id',
    'merged_to_report_id BIGINT DEFAULT NULL COMMENT ''合并到主举报 ID'' AFTER version');
CALL prd05_add_column_if_missing('community_report', 'punishment_action',
    'punishment_action VARCHAR(40) DEFAULT NULL COMMENT ''正式处罚动作'' AFTER handle_action');
CALL prd05_add_column_if_missing('community_report', 'punishment_until',
    'punishment_until DATETIME DEFAULT NULL COMMENT ''处罚截止时间'' AFTER punishment_action');
CALL prd05_add_column_if_missing('community_report', 'target_ip',
    'target_ip VARCHAR(64) DEFAULT NULL COMMENT ''风险 IP（敏感）'' AFTER punishment_until');
CALL prd05_add_column_if_missing('community_report', 'handler_time',
    'handler_time DATETIME DEFAULT NULL COMMENT ''处理完成时间'' AFTER handler_id');
CALL prd05_add_column_if_missing('community_report', 'active_marker',
    'active_marker TINYINT DEFAULT 1 COMMENT ''待处理幂等标记，结束后为空'' AFTER handler_time');
UPDATE community_report SET report_no = CONCAT('RPT-', LPAD(id, 16, '0'))
 WHERE report_no IS NULL OR report_no = '';
UPDATE community_report SET status = CASE UPPER(status)
    WHEN 'PENDING' THEN 'pending'
    WHEN 'PROCESSING' THEN 'processing'
    WHEN 'RESOLVED' THEN 'valid'
    WHEN 'REJECTED' THEN 'invalid'
    WHEN 'VALID' THEN 'valid'
    WHEN 'INVALID' THEN 'invalid'
    WHEN 'MERGED' THEN 'merged'
    ELSE LOWER(status) END;
UPDATE community_report SET active_marker = CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE NULL END;
CALL prd05_add_index_if_missing('community_report', 'uk_community_report_no',
    'UNIQUE INDEX uk_community_report_no (report_no)');
CALL prd05_add_index_if_missing('community_report', 'idx_community_report_active',
    'INDEX idx_community_report_active (reporter_id, target_type, target_id, active_marker)');

CREATE TABLE IF NOT EXISTS community_topic (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    topic_code VARCHAR(64) NOT NULL COMMENT '稳定话题编码',
    topic_name VARCHAR(100) NOT NULL COMMENT '话题名称',
    description VARCHAR(1000) DEFAULT NULL COMMENT '话题简介',
    cover_url VARCHAR(1000) DEFAULT NULL COMMENT '已安全审核的封面 URL',
    cover_audit_status VARCHAR(30) NOT NULL DEFAULT 'pending_machine',
    display_scenes JSON DEFAULT NULL COMMENT '展示场景',
    recommended TINYINT NOT NULL DEFAULT 0,
    sort INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'enabled',
    version INT NOT NULL DEFAULT 0,
    legacy_dict_id BIGINT DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_community_topic_code (topic_code),
    INDEX idx_community_topic_status_sort (status, sort, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家园话题';

INSERT INTO community_topic
    (topic_code, topic_name, description, sort, status, legacy_dict_id, create_time, update_time, deleted)
SELECT d.dict_value, MAX(d.dict_label), MAX(d.remark), MIN(COALESCE(d.dict_sort, 0)),
       CASE WHEN MAX(d.status) = 'ENABLED' THEN 'enabled' ELSE 'disabled' END,
       MIN(d.id), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
  FROM sys_dict_data d
 WHERE d.dict_type = 'community_topic' AND d.deleted = 0
   AND NOT EXISTS (SELECT 1 FROM community_topic t WHERE t.topic_code = d.dict_value)
 GROUP BY d.dict_value;

UPDATE community_post p
JOIN sys_dict_data d ON d.id = p.topic_id AND d.dict_type = 'community_topic'
JOIN community_topic t ON t.topic_code = d.dict_value AND t.deleted = 0
   SET p.topic_id = t.id, p.topic_code = t.topic_code,
       p.topic_name_snapshot = COALESCE(NULLIF(p.topic_name_snapshot, ''), t.topic_name)
 WHERE p.topic_code IS NULL OR p.topic_code = '';

CREATE TABLE IF NOT EXISTS community_comment_like (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comment_id BIGINT NOT NULL, user_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'enabled', active_marker TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_comment_like_pair (comment_id, user_id), INDEX idx_comment_like_user (user_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论点赞关系';

CREATE TABLE IF NOT EXISTS community_post_draft (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL, content_type VARCHAR(30) NOT NULL,
    content VARCHAR(2000) DEFAULT NULL, image_items JSON DEFAULT NULL,
    topic_id BIGINT DEFAULT NULL, topic_code VARCHAR(64) DEFAULT NULL,
    version INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_draft_user_type (user_id, content_type), INDEX idx_draft_user_update (user_id, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区发布草稿';

-- 草稿删除采用物理删除；清理旧实现留下的逻辑删除占位，释放用户+内容类型唯一键。
DELETE FROM community_post_draft WHERE deleted = 1;

CREATE TABLE IF NOT EXISTS community_view_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL, post_id BIGINT NOT NULL, viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_view_user_post (user_id, post_id), INDEX idx_view_user_time (user_id, viewed_at, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区内容浏览历史';

CREATE TABLE IF NOT EXISTS community_content_preference (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL, target_user_id BIGINT NOT NULL,
    action_type VARCHAR(40) NOT NULL DEFAULT 'hide_author_posts', status VARCHAR(30) NOT NULL DEFAULT 'enabled',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_preference_user_target_action (user_id, target_user_id, action_type),
    INDEX idx_preference_feed_filter (user_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区作者级内容偏好';

CREATE TABLE IF NOT EXISTS community_audit_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    biz_type VARCHAR(40) NOT NULL, biz_no VARCHAR(64) DEFAULT NULL, biz_id BIGINT DEFAULT NULL,
    action VARCHAR(50) NOT NULL, result VARCHAR(30) NOT NULL,
    before_snapshot JSON DEFAULT NULL, after_snapshot JSON DEFAULT NULL,
    reason VARCHAR(1000) DEFAULT NULL, provider_code VARCHAR(64) DEFAULT NULL,
    operator_id BIGINT DEFAULT NULL, operator_ip VARCHAR(64) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    INDEX idx_audit_biz (biz_type, biz_no, create_time), INDEX idx_audit_operator (operator_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区审核与敏感操作审计';

CREATE TABLE IF NOT EXISTS community_user_restriction (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL, restriction_type VARCHAR(30) NOT NULL COMMENT 'warn/mute',
    reason VARCHAR(1000) NOT NULL, start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME DEFAULT NULL, status VARCHAR(30) NOT NULL DEFAULT 'active', active_marker TINYINT DEFAULT 1,
    source_report_id BIGINT DEFAULT NULL, version INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    INDEX idx_restriction_user_active (user_id, restriction_type, active_marker, end_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区用户限制';

CREATE TABLE IF NOT EXISTS community_ip_block (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ip_value VARCHAR(64) NOT NULL, ip_range VARCHAR(80) DEFAULT NULL,
    write_scope JSON NOT NULL, reason VARCHAR(1000) NOT NULL,
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, end_time DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active', active_marker TINYINT DEFAULT 1,
    source_report_id BIGINT DEFAULT NULL, version INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    INDEX idx_ip_block_active (ip_value, active_marker, end_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区写操作 IP 封禁';

CREATE TABLE IF NOT EXISTS community_config_version (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    version_no VARCHAR(40) NOT NULL, version INT NOT NULL DEFAULT 0,
    config_snapshot JSON NOT NULL, change_summary VARCHAR(1000) DEFAULT NULL,
    high_risk_confirmed TINYINT NOT NULL DEFAULT 0, operator_id BIGINT DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_community_config_version_no (version_no), INDEX idx_config_version_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区配置版本';

CREATE TABLE IF NOT EXISTS community_export_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_no VARCHAR(40) NOT NULL, export_type VARCHAR(40) NOT NULL, filter_json JSON DEFAULT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', progress INT NOT NULL DEFAULT 0,
    file_url VARCHAR(1000) DEFAULT NULL, error_message VARCHAR(1000) DEFAULT NULL,
    requester_id BIGINT NOT NULL, completed_at DATETIME DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_community_export_task_no (task_no), INDEX idx_export_requester_status (requester_id, status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区异步导出任务';

CREATE TABLE IF NOT EXISTS community_event_outbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_no VARCHAR(40) NOT NULL, event_type VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(40) NOT NULL, aggregate_no VARCHAR(64) NOT NULL, aggregate_version INT NOT NULL DEFAULT 0,
    payload JSON NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'pending', retry_count INT NOT NULL DEFAULT 0,
    next_retry_at DATETIME DEFAULT NULL, sent_at DATETIME DEFAULT NULL, last_error VARCHAR(1000) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_outbox_event_no (event_no),
    UNIQUE KEY uk_outbox_business (event_type, aggregate_no, aggregate_version),
    INDEX idx_outbox_delivery (status, next_retry_at, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区领域事件 Outbox（PRD-03 仅消费）';

CREATE TABLE IF NOT EXISTS community_media_audit_task (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL, post_no VARCHAR(64) NOT NULL, trace_id VARCHAR(128) NOT NULL,
    media_url VARCHAR(1000) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'pending',
    provider_label VARCHAR(100) DEFAULT NULL, callback_payload JSON DEFAULT NULL,
    callback_time DATETIME DEFAULT NULL, version INT NOT NULL DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL, updated_by BIGINT DEFAULT NULL, deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_media_audit_trace (trace_id),
    INDEX idx_media_audit_post_status (post_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信图片异步内容安全审核任务';

-- 正式字典：客户端和管理端通过 meta 获取显示名，不在前端硬编码。
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark)
VALUES
('社区内容类型', 'community_content_type', 50, 'ENABLED', 'PRD-05 内容类型'),
('社区内容状态', 'community_content_status', 51, 'ENABLED', 'PRD-05 内容状态'),
('社区评论状态', 'community_comment_status', 52, 'ENABLED', 'PRD-05 评论状态'),
('社区举报状态', 'community_report_status', 53, 'ENABLED', 'PRD-05 举报状态'),
('社区举报对象', 'community_report_target_type', 54, 'ENABLED', 'PRD-05 举报对象'),
('社区处罚动作', 'community_punish_action', 55, 'ENABLED', 'PRD-05 处罚动作'),
('社区禁言周期', 'community_mute_period', 56, 'ENABLED', 'PRD-05 禁言周期'),
('社区内容来源', 'community_source_scene', 57, 'ENABLED', 'PRD-05 来源场景'),
('社区媒体类型', 'community_media_type', 58, 'ENABLED', 'PRD-05 媒体类型'),
('社区机审结果', 'community_machine_result', 59, 'ENABLED', 'PRD-05 机审结果'),
('社区风险等级', 'community_risk_level', 60, 'ENABLED', 'PRD-05 风险等级'),
('社区内容操作', 'community_post_action', 61, 'ENABLED', 'PRD-05 内容详情操作'),
('社区分发场景', 'community_distribution_scene', 62, 'ENABLED', 'PRD-05 分发场景'),
('社区评论操作', 'community_comment_action', 63, 'ENABLED', 'PRD-05 评论详情操作'),
('社区举报结果', 'community_report_result', 64, 'ENABLED', 'PRD-05 举报处理结果'),
('社区回复状态', 'community_reply_status', 65, 'ENABLED', 'PRD-05 举报人回复状态'),
('社区IP封禁周期', 'community_ip_block_period', 66, 'ENABLED', 'PRD-05 IP封禁周期'),
('社区写权限范围', 'community_write_scope', 67, 'ENABLED', 'PRD-05 IP封禁写范围'),
('社区话题状态', 'community_topic_status', 68, 'ENABLED', 'PRD-05 话题状态'),
('社区话题展示场景', 'community_topic_display_scene', 69, 'ENABLED', 'PRD-05 话题展示场景'),
('社区是否选项', 'community_yes_no', 70, 'ENABLED', 'PRD-05 通用是否选项'),
('社区配置分区', 'community_config_section', 71, 'ENABLED', 'PRD-05 配置页面分区'),
('社区互动准入模式', 'community_interaction_gate_mode', 72, 'ENABLED', 'PRD-05 互动准入模式')
ON DUPLICATE KEY UPDATE dict_name=VALUES(dict_name), dict_sort=VALUES(dict_sort), status='ENABLED', remark=VALUES(remark);

INSERT INTO sys_dict_data (dict_type,parent_id,dict_label,dict_value,dict_sort,status,remark)
SELECT seed.dict_type,0,seed.dict_label,seed.dict_value,seed.dict_sort,'ENABLED','PRD-05 正式字典'
FROM (
 SELECT 'community_content_type' dict_type,'动态' dict_label,'community_post' dict_value,1 dict_sort UNION ALL
 SELECT 'community_content_type','诚意贴','sincere_post',2 UNION ALL
 SELECT 'community_content_status','草稿','draft',1 UNION ALL
 SELECT 'community_content_status','机审中','pending_machine',2 UNION ALL
 SELECT 'community_content_status','待人工复核','pending_manual',3 UNION ALL
 SELECT 'community_content_status','已公开','published',4 UNION ALL
 SELECT 'community_content_status','已驳回','rejected',5 UNION ALL
 SELECT 'community_content_status','用户已删除','deleted',6 UNION ALL
 SELECT 'community_content_status','已下架','blocked',7 UNION ALL
 SELECT 'community_comment_status','机审中','pending_machine',1 UNION ALL
 SELECT 'community_comment_status','已公开','published',2 UNION ALL
 SELECT 'community_comment_status','已驳回','rejected',3 UNION ALL
 SELECT 'community_comment_status','用户已删除','deleted',4 UNION ALL
 SELECT 'community_comment_status','已屏蔽','blocked',5 UNION ALL
 SELECT 'community_report_status','待处理','pending',1 UNION ALL
 SELECT 'community_report_status','处理中','processing',2 UNION ALL
 SELECT 'community_report_status','举报成立','valid',3 UNION ALL
 SELECT 'community_report_status','举报不成立','invalid',4 UNION ALL
 SELECT 'community_report_status','已合并','merged',5 UNION ALL
 SELECT 'community_report_target_type','动态/诚意贴','post',1 UNION ALL
 SELECT 'community_report_target_type','评论','comment',2 UNION ALL
 SELECT 'community_report_target_type','用户资料/账号','user',3 UNION ALL
 SELECT 'community_report_target_type','私信/悄悄话内容','chat',4 UNION ALL
 SELECT 'community_punish_action','不处罚','none',1 UNION ALL
 SELECT 'community_punish_action','下架内容','block_content',2 UNION ALL
 SELECT 'community_punish_action','屏蔽评论','block_comment',3 UNION ALL
 SELECT 'community_punish_action','警告用户','warn_user',4 UNION ALL
 SELECT 'community_punish_action','禁言用户','mute_user',5 UNION ALL
 SELECT 'community_punish_action','IP 封禁','ip_block',6 UNION ALL
 SELECT 'community_punish_action','冻结账号','freeze_user',7 UNION ALL
 SELECT 'community_mute_period','1 天','1d',1 UNION ALL
 SELECT 'community_mute_period','3 天','3d',2 UNION ALL
 SELECT 'community_mute_period','7 天','7d',3 UNION ALL
 SELECT 'community_mute_period','30 天','30d',4 UNION ALL
 SELECT 'community_source_scene','千寻成家动态','qianxun_chengjia',1 UNION ALL
 SELECT 'community_source_scene','千寻知音诚意贴','qianxun_zhiyin_sincere',2 UNION ALL
 SELECT 'community_source_scene','立业帖子','liye_post_reserved',3 UNION ALL
 SELECT 'community_media_type','纯文本','text',1 UNION ALL
 SELECT 'community_media_type','图片','image',2 UNION ALL
 SELECT 'community_media_type','视频','video',3 UNION ALL
 SELECT 'community_machine_result','通过','pass',1 UNION ALL
 SELECT 'community_machine_result','拒绝','reject',2 UNION ALL
 SELECT 'community_machine_result','需复核','review',3 UNION ALL
 SELECT 'community_machine_result','服务异常','error',4 UNION ALL
 SELECT 'community_risk_level','低风险','low',1 UNION ALL
 SELECT 'community_risk_level','中风险','medium',2 UNION ALL
 SELECT 'community_risk_level','高风险','high',3 UNION ALL
 SELECT 'community_post_action','公开/恢复','published',1 UNION ALL
 SELECT 'community_post_action','驳回','rejected',2 UNION ALL
 SELECT 'community_post_action','下架','blocked',3 UNION ALL
 SELECT 'community_post_action','转人工复核','pending_manual',4 UNION ALL
 SELECT 'community_distribution_scene','内容广场','content',1 UNION ALL
 SELECT 'community_distribution_scene','成家动态','moments',2 UNION ALL
 SELECT 'community_distribution_scene','同城','local',3 UNION ALL
 SELECT 'community_distribution_scene','热门','hot',4 UNION ALL
 SELECT 'community_comment_action','公开/恢复','published',1 UNION ALL
 SELECT 'community_comment_action','驳回','rejected',2 UNION ALL
 SELECT 'community_comment_action','屏蔽','blocked',3 UNION ALL
 SELECT 'community_report_result','处理中','processing',1 UNION ALL
 SELECT 'community_report_result','举报成立','valid',2 UNION ALL
 SELECT 'community_report_result','举报不成立','invalid',3 UNION ALL
 SELECT 'community_report_result','合并举报','merged',4 UNION ALL
 SELECT 'community_reply_status','未回复','pending',1 UNION ALL
 SELECT 'community_reply_status','已回复','sent',2 UNION ALL
 SELECT 'community_reply_status','回复失败','failed',3 UNION ALL
 SELECT 'community_ip_block_period','1 小时','1h',1 UNION ALL
 SELECT 'community_ip_block_period','24 小时','24h',2 UNION ALL
 SELECT 'community_ip_block_period','72 小时','72h',3 UNION ALL
 SELECT 'community_ip_block_period','7 天','7d',4 UNION ALL
 SELECT 'community_write_scope','发布动态','publish_post',1 UNION ALL
 SELECT 'community_write_scope','发布诚意贴','publish_sincere',2 UNION ALL
 SELECT 'community_write_scope','发表评论','comment',3 UNION ALL
 SELECT 'community_write_scope','提交举报','report',4 UNION ALL
 SELECT 'community_topic_status','启用','enabled',1 UNION ALL
 SELECT 'community_topic_status','停用','disabled',2 UNION ALL
 SELECT 'community_topic_display_scene','内容管理','content',1 UNION ALL
 SELECT 'community_topic_display_scene','动态管理','moments',2 UNION ALL
 SELECT 'community_topic_display_scene','小程序社区','miniapp',3 UNION ALL
 SELECT 'community_yes_no','是','true',1 UNION ALL
 SELECT 'community_yes_no','否','false',2 UNION ALL
 SELECT 'community_config_section','社区入口','entry',1 UNION ALL
 SELECT 'community_config_section','举报原因','report',2 UNION ALL
 SELECT 'community_config_section','审核规则','audit',3 UNION ALL
 SELECT 'community_config_section','治理策略','governance',4 UNION ALL
 SELECT 'community_interaction_gate_mode','仅登录','LOGIN_ONLY',1 UNION ALL
 SELECT 'community_interaction_gate_mode','需三项认证','FULL_CERT',2
) seed
WHERE NOT EXISTS (
 SELECT 1 FROM sys_dict_data d WHERE d.dict_type=seed.dict_type AND d.dict_value=seed.dict_value AND d.deleted=0
);

-- 保留最早一条字典记录作为显示快照来源，清理历史重复值；停用项仍可用于旧数据展示，但不会进入可选下拉。
UPDATE sys_dict_data duplicate_item
JOIN sys_dict_data keeper
  ON keeper.dict_type=duplicate_item.dict_type
 AND keeper.dict_value=duplicate_item.dict_value
 AND keeper.deleted=0
 AND keeper.id<duplicate_item.id
SET duplicate_item.deleted=1, duplicate_item.update_time=CURRENT_TIMESTAMP
WHERE duplicate_item.deleted=0
  AND duplicate_item.dict_type LIKE 'community\_%';

INSERT INTO app_config (config_key,config_value,config_group,config_type,public_visible,status,remark)
VALUES
('community.interaction_gate_mode','FULL_CERT','COMMUNITY','TEXT',1,'ENABLED','社区互动使用三项认证准入'),
('community.post_max_images','9','COMMUNITY','NUMBER',1,'ENABLED','动态与诚意贴图片上限'),
('community.post_max_text_length','500','COMMUNITY','NUMBER',1,'ENABLED','正文长度上限'),
('community.post_max_mentions','5','COMMUNITY','NUMBER',1,'ENABLED','单条内容提及用户上限'),
('community.sincere_post_min_text_length','20','COMMUNITY','NUMBER',1,'ENABLED','诚意贴正文最小长度'),
('community.contact_info_allowed','false','COMMUNITY','BOOLEAN',1,'ENABLED','是否允许联系方式'),
('community.report_entry_enabled','true','COMMUNITY','BOOLEAN',1,'ENABLED','是否开放社区举报入口'),
('community.machine_audit_enabled','true','COMMUNITY','BOOLEAN',0,'ENABLED','微信内容安全开关'),
('community.manual_sample_rate','10','COMMUNITY','NUMBER',0,'ENABLED','普通动态人工抽检比例'),
('community.mute_period_options','["1d","3d","7d","30d"]','COMMUNITY','JSON',0,'ENABLED','禁言周期字典 code'),
('community.ip_block_enabled','true','COMMUNITY','BOOLEAN',0,'ENABLED','IP 封禁开关'),
('community.ip_block_period_options','["1h","24h","72h","7d"]','COMMUNITY','JSON',0,'ENABLED','IP 封禁周期'),
('community.ip_block_write_scope','["publish_post","publish_sincere","comment","report"]','COMMUNITY','JSON',0,'ENABLED','IP 封禁写范围'),
('community.copy.core_access_tip','完成认证后即可参与互动','COMMUNITY_COPY','TEXT',1,'ENABLED','互动准入提示'),
('community.copy.contact_blocked','内容中包含联系方式，请修改后再提交','COMMUNITY_COPY','TEXT',1,'ENABLED','联系方式拦截提示'),
('community.copy.comment_retry','内容安全校验暂不可用，请稍后重试','COMMUNITY_COPY','TEXT',1,'ENABLED','评论机审异常提示'),
('community.copy.empty_content','暂无社区内容','COMMUNITY_COPY','TEXT',1,'ENABLED','内容空态'),
('community.copy.empty_moment','暂无动态记录','COMMUNITY_COPY','TEXT',1,'ENABLED','动态空态'),
('community.copy.empty_comment','暂无评论记录','COMMUNITY_COPY','TEXT',1,'ENABLED','评论空态'),
('community.copy.empty_report','暂无举报记录','COMMUNITY_COPY','TEXT',1,'ENABLED','举报空态'),
('community.copy.empty_topic','暂无家园话题','COMMUNITY_COPY','TEXT',1,'ENABLED','话题空态'),
('community.copy.stat_post_total','全部内容','COMMUNITY_COPY','TEXT',0,'ENABLED','内容统计文案'),
('community.copy.stat_post_pending','待审核','COMMUNITY_COPY','TEXT',0,'ENABLED','内容统计文案'),
('community.copy.stat_post_published','已公开','COMMUNITY_COPY','TEXT',0,'ENABLED','内容统计文案'),
('community.copy.stat_post_blocked','已下架/驳回','COMMUNITY_COPY','TEXT',0,'ENABLED','内容统计文案'),
('community.copy.stat_comment_total','全部评论','COMMUNITY_COPY','TEXT',0,'ENABLED','评论统计文案'),
('community.copy.stat_comment_pending','待处理','COMMUNITY_COPY','TEXT',0,'ENABLED','评论统计文案'),
('community.copy.stat_comment_published','已公开','COMMUNITY_COPY','TEXT',0,'ENABLED','评论统计文案'),
('community.copy.stat_comment_blocked','已屏蔽/驳回','COMMUNITY_COPY','TEXT',0,'ENABLED','评论统计文案'),
('community.copy.stat_report_total','全部举报','COMMUNITY_COPY','TEXT',0,'ENABLED','举报统计文案'),
('community.copy.stat_report_pending','待处理','COMMUNITY_COPY','TEXT',0,'ENABLED','举报统计文案'),
('community.copy.stat_report_valid','举报成立','COMMUNITY_COPY','TEXT',0,'ENABLED','举报统计文案'),
('community.copy.stat_report_closed','已关闭','COMMUNITY_COPY','TEXT',0,'ENABLED','举报统计文案'),
('community.copy.stat_topic_total','全部话题','COMMUNITY_COPY','TEXT',0,'ENABLED','话题统计文案'),
('community.copy.stat_topic_enabled','启用中','COMMUNITY_COPY','TEXT',0,'ENABLED','话题统计文案'),
('community.copy.stat_topic_recommended','推荐话题','COMMUNITY_COPY','TEXT',0,'ENABLED','话题统计文案'),
('community.copy.stat_topic_disabled','已停用','COMMUNITY_COPY','TEXT',0,'ENABLED','话题统计文案'),
('community.copy.post_action_success','处理结果已保存','COMMUNITY_COPY','TEXT',0,'ENABLED','内容操作成功提示'),
('community.copy.comment_action_success','评论处理已保存','COMMUNITY_COPY','TEXT',0,'ENABLED','评论操作成功提示'),
('community.copy.report_action_success','举报处理结果已保存','COMMUNITY_COPY','TEXT',0,'ENABLED','举报操作成功提示'),
('community.copy.version_conflict','记录已被处理，请刷新','COMMUNITY_COPY','TEXT',0,'ENABLED','并发冲突提示'),
('community.copy.export_created','导出任务已创建','COMMUNITY_COPY','TEXT',0,'ENABLED','导出提示'),
('community.copy.generic_error','操作失败，请稍后重试','COMMUNITY_COPY','TEXT',1,'ENABLED','通用错误提示'),
('community.copy.unsupported_topic_sort','不支持的话题动态排序','COMMUNITY_COPY','TEXT',1,'ENABLED','话题排序错误'),
('community.copy.unsupported_feed_scene','不支持的信息流场景','COMMUNITY_COPY','TEXT',1,'ENABLED','信息流场景错误'),
('community.copy.cannot_like_self','不能对自己表达心动','COMMUNITY_COPY','TEXT',1,'ENABLED','心动错误'),
('community.copy.target_user_unavailable','该用户当前不可互动','COMMUNITY_COPY','TEXT',1,'ENABLED','互动错误'),
('community.copy.anonymous_user','用户','COMMUNITY_COPY','TEXT',1,'ENABLED','匿名用户名称'),
('community.copy.fate_same_major','同专业，超有缘','COMMUNITY_COPY','TEXT',1,'ENABLED','缘分文案'),
('community.copy.fate_same_school','同校，超有缘','COMMUNITY_COPY','TEXT',1,'ENABLED','缘分文案'),
('community.copy.fate_profile_match','资料契合，很有缘','COMMUNITY_COPY','TEXT',1,'ENABLED','缘分文案'),
('community.copy.fate_same_hobby','同爱好，超有缘','COMMUNITY_COPY','TEXT',1,'ENABLED','缘分文案'),
('community.copy.education_doctor','博士','COMMUNITY_COPY','TEXT',1,'ENABLED','学历文案'),
('community.copy.education_master','硕士','COMMUNITY_COPY','TEXT',1,'ENABLED','学历文案'),
('community.copy.education_bachelor','本科','COMMUNITY_COPY','TEXT',1,'ENABLED','学历文案'),
('community.copy.education_college','大专','COMMUNITY_COPY','TEXT',1,'ENABLED','学历文案'),
('community.copy.profile_incomplete','资料待完善','COMMUNITY_COPY','TEXT',1,'ENABLED','资料文案'),
('community.copy.online_unknown','暂无在线记录','COMMUNITY_COPY','TEXT',1,'ENABLED','在线状态'),
('community.copy.online_minutes','%s分钟前在线','COMMUNITY_COPY','TEXT',1,'ENABLED','在线状态模板'),
('community.copy.online_hours','%s小时前在线','COMMUNITY_COPY','TEXT',1,'ENABLED','在线状态模板'),
('community.copy.online_days','%s天前在线','COMMUNITY_COPY','TEXT',1,'ENABLED','在线状态模板'),
('community.copy.login_expired','未登录或登录已过期','COMMUNITY_COPY','TEXT',1,'ENABLED','登录错误'),
('community.copy.content_unavailable','内容不存在或不可见','COMMUNITY_COPY','TEXT',1,'ENABLED','内容错误'),
('community.copy.delete_own_content_only','只能删除自己的内容','COMMUNITY_COPY','TEXT',1,'ENABLED','删除内容错误'),
('community.copy.content_not_commentable','内容当前不可评论','COMMUNITY_COPY','TEXT',1,'ENABLED','评论错误'),
('community.copy.delete_own_comment_only','只能删除自己的评论','COMMUNITY_COPY','TEXT',1,'ENABLED','删除评论错误'),
('community.copy.cannot_follow_self','不能关注自己','COMMUNITY_COPY','TEXT',1,'ENABLED','关注错误'),
('community.copy.unsupported_report_target','不支持的举报目标类型','COMMUNITY_COPY','TEXT',1,'ENABLED','举报错误'),
('community.copy.report_duplicate','你的举报已提交，请等待处理','COMMUNITY_COPY','TEXT',1,'ENABLED','重复举报提示'),
('community.copy.chat_report_unavailable','聊天举报服务暂不可用，请稍后重试','COMMUNITY_COPY','TEXT',1,'ENABLED','聊天举报失败关闭'),
('community.copy.draft_version_conflict','草稿已在其他设备更新，请刷新后重试','COMMUNITY_COPY','TEXT',1,'ENABLED','草稿并发提示'),
('community.copy.unsupported_interaction_type','不支持的互动历史类型','COMMUNITY_COPY','TEXT',1,'ENABLED','互动历史错误'),
('community.copy.unsupported_interactor_type','不支持的互动用户类型','COMMUNITY_COPY','TEXT',1,'ENABLED','互动用户错误'),
('community.copy.account_abnormal','账号状态异常，暂无法参与社区互动','COMMUNITY_COPY','TEXT',1,'ENABLED','账号异常'),
('community.copy.account_abnormal_report','账号状态异常，暂无法举报','COMMUNITY_COPY','TEXT',1,'ENABLED','账号异常举报'),
('community.copy.muted','当前账号处于禁言期，暂无法发布或互动','COMMUNITY_COPY','TEXT',1,'ENABLED','禁言提示'),
('community.copy.ip_blocked','当前网络环境暂无法提交社区内容','COMMUNITY_COPY','TEXT',1,'ENABLED','IP封禁提示'),
('community.copy.image_upload_invalid','图片上传状态无效，请重新上传','COMMUNITY_COPY','TEXT',1,'ENABLED','图片上传错误'),
('community.copy.image_not_owned','图片不属于当前用户上传空间','COMMUNITY_COPY','TEXT',1,'ENABLED','图片归属错误'),
('community.copy.content_not_found','内容不存在','COMMUNITY_COPY','TEXT',1,'ENABLED','内容不存在'),
('community.copy.comment_not_found','评论不存在','COMMUNITY_COPY','TEXT',1,'ENABLED','评论不存在'),
('community.copy.user_not_found','用户不存在','COMMUNITY_COPY','TEXT',1,'ENABLED','用户不存在'),
('community.copy.user_reference_invalid','用户业务编号不存在','COMMUNITY_COPY','TEXT',1,'ENABLED','用户编号错误'),
('community.copy.unsupported_content_type','不支持的内容类型','COMMUNITY_COPY','TEXT',1,'ENABLED','内容类型错误'),
('community.copy.cannot_hide_self','不能隐藏自己的动态','COMMUNITY_COPY','TEXT',1,'ENABLED','隐藏作者错误'),
('community.copy.author_hidden','已减少该用户动态推荐','COMMUNITY_COPY','TEXT',1,'ENABLED','隐藏作者结果'),
('community.copy.author_unhidden','已恢复该用户动态推荐','COMMUNITY_COPY','TEXT',1,'ENABLED','恢复作者结果'),
('community.copy.age_years','%s岁','COMMUNITY_COPY','TEXT',1,'ENABLED','年龄模板'),
('community.copy.topic_default_description','和有共同话题的人交换真实生活与想法','COMMUNITY_COPY','TEXT',1,'ENABLED','话题默认描述'),
('community.copy.core_access_required','完成三重认证后可进行社区互动','COMMUNITY_COPY','TEXT',1,'ENABLED','准入提示'),
('community.copy.image_count_exceeded','图片数量不能超过 %s','COMMUNITY_COPY','TEXT',1,'ENABLED','图片数量提示'),
('community.copy.text_length_exceeded','正文长度不能超过 %s','COMMUNITY_COPY','TEXT',1,'ENABLED','正文长度提示'),
('community.copy.topic_not_found','话题不存在','COMMUNITY_COPY','TEXT',1,'ENABLED','话题错误'),
('community.copy.report_reason_not_found','举报原因不存在','COMMUNITY_COPY','TEXT',1,'ENABLED','举报原因错误'),
('community.copy.report_submitted','举报已提交，请等待处理','COMMUNITY_COPY','TEXT',1,'ENABLED','举报回执'),
('community.copy.publish_published','发布成功','COMMUNITY_COPY','TEXT',1,'ENABLED','发布回执'),
('community.copy.publish_pending_machine','内容审核中','COMMUNITY_COPY','TEXT',1,'ENABLED','发布回执'),
('community.copy.publish_pending_manual','内容等待人工审核','COMMUNITY_COPY','TEXT',1,'ENABLED','发布回执'),
('community.copy.publish_rejected','内容未通过审核','COMMUNITY_COPY','TEXT',1,'ENABLED','发布回执'),
('community.copy.comment_published','评论成功','COMMUNITY_COPY','TEXT',1,'ENABLED','评论回执'),
('community.copy.comment_rejected','评论未通过审核','COMMUNITY_COPY','TEXT',1,'ENABLED','评论回执'),
('community.copy.unsupported_report_result','不支持的举报处理结果','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.version_required','版本号不能为空','COMMUNITY_COPY','TEXT',0,'ENABLED','并发错误'),
('community.copy.topic_cover_too_large','话题封面不能超过10MB','COMMUNITY_COPY','TEXT',0,'ENABLED','话题封面错误'),
('community.copy.topic_cover_type_invalid','仅支持 JPG、PNG、WebP 图片','COMMUNITY_COPY','TEXT',0,'ENABLED','话题封面错误'),
('community.copy.unsupported_export_type','不支持的导出类型','COMMUNITY_COPY','TEXT',0,'ENABLED','导出错误'),
('community.copy.high_risk_confirmation_required','高风险配置需要二次确认','COMMUNITY_COPY','TEXT',0,'ENABLED','配置错误'),
('community.copy.unsupported_audit_status','不支持的审核状态','COMMUNITY_COPY','TEXT',0,'ENABLED','审核错误'),
('community.copy.report_already_handled','该举报单已处理，请勿重复操作','COMMUNITY_COPY','TEXT',0,'ENABLED','举报治理错误'),
('community.copy.unsupported_report_status','不支持的举报状态','COMMUNITY_COPY','TEXT',0,'ENABLED','举报治理错误'),
('community.copy.config_name_interaction_gate','互动准入模式','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_post_max_images','动态图片上限','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_post_max_text','动态文字上限','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_post_max_mentions','@用户人数上限','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_sincere_min_text','诚意贴正文下限','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_contact_allowed','诚意贴联系方式开关','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_report_entry','举报入口开关','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_machine_audit','微信内容安全审核','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_manual_sample_rate','普通动态人工抽检比例','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_mute_period_options','禁言周期选项','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_ip_block_enabled','IP 封禁开关','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_ip_block_period_options','IP 封禁周期选项','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.config_name_ip_block_write_scope','IP 封禁写入范围','COMMUNITY_COPY','TEXT',0,'ENABLED','配置名称'),
('community.copy.unsupported_handle_action','不支持的处理动作','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.report_target_not_post','当前举报目标不是动态，无法执行下架操作','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.report_target_not_comment','当前举报目标不是评论，无法执行屏蔽操作','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.unsupported_action_target','不支持的动作与目标组合','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.handle_action_required','处理动作不能为空','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.merge_report_no_required','合并举报时目标举报编号不能为空','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.merge_report_not_found','合并目标举报单不存在','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.punish_action_required','请选择有效的处罚动作','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.trusted_target_user_required','举报单缺少可信目标用户，无法执行账号处罚','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.risk_ip_required','IP封禁必须提供经审计确认的风险IP','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.punish_period_required','处罚周期不能为空','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.unsupported_punish_period','不支持的处罚周期','COMMUNITY_COPY','TEXT',0,'ENABLED','治理错误'),
('community.copy.topic_cover_url_invalid','话题封面必须是有效的HTTPS地址','COMMUNITY_COPY','TEXT',0,'ENABLED','话题封面错误'),
('community.copy.config_snapshot_invalid','社区配置快照损坏，请联系管理员','COMMUNITY_COPY','TEXT',0,'ENABLED','配置错误'),
('community.copy.runtime_config_missing','社区运行配置缺失，请联系管理员','COMMUNITY_COPY','TEXT',1,'ENABLED','运行配置缺失'),
('community.copy.runtime_config_invalid','社区运行配置格式错误，请联系管理员','COMMUNITY_COPY','TEXT',1,'ENABLED','运行配置错误'),
('community.copy.permission_denied','当前账号无权访问该社区管理页面','COMMUNITY_COPY','TEXT',0,'ENABLED','页面无权限态'),
('community.copy.serialization_failed','数据序列化失败','COMMUNITY_COPY','TEXT',0,'ENABLED','系统错误'),
('community.copy.report_not_found','举报单不存在','COMMUNITY_COPY','TEXT',0,'ENABLED','举报错误'),
('community.copy.action_required','请选择处理结果','COMMUNITY_COPY','TEXT',0,'ENABLED','管理端提示'),
('community.copy.audit_log_empty','暂无操作记录','COMMUNITY_COPY','TEXT',0,'ENABLED','管理端空态'),
('community.copy.cancel_action','取消','COMMUNITY_COPY','TEXT',0,'ENABLED','管理端操作'),
('community.copy.comment_detail_description','查看评论内容、所属动态、机审与治理记录','COMMUNITY_COPY','TEXT',0,'ENABLED','管理端详情'),
('community.copy.comment_empty','暂无评论记录','COMMUNITY_COPY','TEXT',0,'ENABLED','管理端空态'),
('community.copy.comment_high_risk_description','该操作会影响评论可见性，请确认处理依据','COMMUNITY_COPY','TEXT',0,'ENABLED','管理端确认'),
('community.copy.config_change_summary','请填写本次配置变更说明','COMMUNITY_COPY','TEXT',0,'ENABLED','配置提示'),
('community.copy.config_empty','暂无配置项','COMMUNITY_COPY','TEXT',0,'ENABLED','配置空态'),
('community.copy.config_high_risk_description','本次包含高风险配置，保存后立即生效','COMMUNITY_COPY','TEXT',0,'ENABLED','配置确认'),
('community.copy.config_high_risk_title','确认保存高风险配置','COMMUNITY_COPY','TEXT',0,'ENABLED','配置确认'),
('community.copy.config_log_description','记录社区配置版本与操作人','COMMUNITY_COPY','TEXT',0,'ENABLED','配置日志'),
('community.copy.config_log_empty','暂无配置变更记录','COMMUNITY_COPY','TEXT',0,'ENABLED','配置空态'),
('community.copy.config_reset_confirm_action','确认重置','COMMUNITY_COPY','TEXT',0,'ENABLED','配置操作'),
('community.copy.config_reset_description','未保存的配置修改将被丢弃','COMMUNITY_COPY','TEXT',0,'ENABLED','配置确认'),
('community.copy.config_reset_title','确认重置配置','COMMUNITY_COPY','TEXT',0,'ENABLED','配置确认'),
('community.copy.config_save_confirm_action','确认保存','COMMUNITY_COPY','TEXT',0,'ENABLED','配置操作'),
('community.copy.config_save_success','配置版本已保存','COMMUNITY_COPY','TEXT',0,'ENABLED','配置回执'),
('community.copy.config_search_empty','没有匹配的配置项','COMMUNITY_COPY','TEXT',0,'ENABLED','配置空态'),
('community.copy.confirm_action','确认处理','COMMUNITY_COPY','TEXT',0,'ENABLED','管理端操作'),
('community.copy.confirm_punish','确认处罚','COMMUNITY_COPY','TEXT',0,'ENABLED','举报操作'),
('community.copy.high_risk_confirm_description','该操作影响内容或账号状态，请确认处理依据','COMMUNITY_COPY','TEXT',0,'ENABLED','高风险确认'),
('community.copy.high_risk_confirm_title','确认执行高风险操作','COMMUNITY_COPY','TEXT',0,'ENABLED','高风险确认'),
('community.copy.ip_block_fields_required','请完整填写风险IP、封禁周期与写范围','COMMUNITY_COPY','TEXT',0,'ENABLED','IP封禁校验'),
('community.copy.machine_disabled_notice','机审关闭时内容将进入人工复核','COMMUNITY_COPY','TEXT',0,'ENABLED','配置提示'),
('community.copy.merge_report_required','请输入要合并到的举报编号','COMMUNITY_COPY','TEXT',0,'ENABLED','举报校验'),
('community.copy.mute_period_required','请选择禁言周期','COMMUNITY_COPY','TEXT',0,'ENABLED','治理校验'),
('community.copy.post_detail_description','查看内容、媒体、机审结果与治理记录','COMMUNITY_COPY','TEXT',0,'ENABLED','内容详情'),
('community.copy.processing','处理中','COMMUNITY_COPY','TEXT',0,'ENABLED','通用状态'),
('community.copy.punish_required','请选择处罚动作','COMMUNITY_COPY','TEXT',0,'ENABLED','举报校验'),
('community.copy.reason_required','请填写处理说明','COMMUNITY_COPY','TEXT',0,'ENABLED','治理校验'),
('community.copy.report_context_unavailable','举报上下文暂不可查看','COMMUNITY_COPY','TEXT',0,'ENABLED','举报详情'),
('community.copy.report_detail_description','查看可信举报上下文、合并记录与处罚历史','COMMUNITY_COPY','TEXT',0,'ENABLED','举报详情'),
('community.copy.report_empty','暂无举报记录','COMMUNITY_COPY','TEXT',0,'ENABLED','举报空态'),
('community.copy.report_high_risk_description','账号或IP处罚会立即生效，请核对证据','COMMUNITY_COPY','TEXT',0,'ENABLED','举报确认'),
('community.copy.report_high_risk_title','确认执行举报处罚','COMMUNITY_COPY','TEXT',0,'ENABLED','举报确认'),
('community.copy.report_result_required','请选择举报处理结果','COMMUNITY_COPY','TEXT',0,'ENABLED','举报校验'),
('community.copy.topic_cover_required','请上传话题封面','COMMUNITY_COPY','TEXT',0,'ENABLED','话题校验'),
('community.copy.topic_cover_ticket_invalid','封面上传票据无效，请重新选择图片','COMMUNITY_COPY','TEXT',0,'ENABLED','话题上传'),
('community.copy.topic_cover_upload_failed','封面上传失败，请重试','COMMUNITY_COPY','TEXT',0,'ENABLED','话题上传'),
('community.copy.topic_cover_uploaded','封面上传成功','COMMUNITY_COPY','TEXT',0,'ENABLED','话题上传'),
('community.copy.topic_create_description','创建家园话题并配置展示场景','COMMUNITY_COPY','TEXT',0,'ENABLED','话题创建'),
('community.copy.topic_create_notice','封面需通过内容安全审核后展示','COMMUNITY_COPY','TEXT',0,'ENABLED','话题创建'),
('community.copy.topic_created','话题已创建','COMMUNITY_COPY','TEXT',0,'ENABLED','话题回执'),
('community.copy.topic_detail_description','编辑话题资料、展示场景与推荐顺序','COMMUNITY_COPY','TEXT',0,'ENABLED','话题详情'),
('community.copy.topic_empty','暂无家园话题','COMMUNITY_COPY','TEXT',0,'ENABLED','话题空态'),
('community.copy.topic_name_required','请输入话题名称','COMMUNITY_COPY','TEXT',0,'ENABLED','话题校验'),
('community.copy.topic_page_notice','停用话题不会删除历史内容','COMMUNITY_COPY','TEXT',0,'ENABLED','话题提示'),
('community.copy.topic_saved','话题已保存','COMMUNITY_COPY','TEXT',0,'ENABLED','话题回执'),
('community.copy.topic_scene_required','请选择至少一个展示场景','COMMUNITY_COPY','TEXT',0,'ENABLED','话题校验'),
('community.copy.topic_status_confirm_action','确认变更','COMMUNITY_COPY','TEXT',0,'ENABLED','话题操作'),
('community.copy.topic_status_confirm_description','状态变更会影响新内容选择，历史内容仍保留','COMMUNITY_COPY','TEXT',0,'ENABLED','话题确认'),
('community.copy.topic_status_confirm_title','确认变更话题状态','COMMUNITY_COPY','TEXT',0,'ENABLED','话题确认'),
('community.copy.load_failed','加载失败，请稍后重试','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序通用提示'),
('community.copy.loading','加载中','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序通用提示'),
('community.copy.retry','重试','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序通用操作'),
('community.copy.list_end','已经到底啦','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序列表提示'),
('community.copy.empty_following_feed','关注的人还没有发布动态','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_following_users','还没有关注用户','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_city_feed','同城暂时没有新动态','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_feed_description','去其他频道看看更多真实分享吧','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_yuemu','暂时没有悦目推荐','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_yuemu_description','完善资料后会获得更合适的推荐','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_sincere','暂时没有诚意贴','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_sincere_description','发布一篇真诚的自我介绍吧','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_topics','暂时没有可用话题','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_topic_posts','这个话题还没有动态','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.topic_unavailable','话题暂不可用','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序话题'),
('community.copy.topic_default_name','家园话题','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序话题'),
('community.copy.topic_default_user','社区用户','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序话题'),
('community.copy.empty_my_posts','你还没有发布动态','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_user_posts','该用户还没有发布动态','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_commented','还没有评论过动态','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_liked','还没有点赞过动态','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_unlocked','还没有解锁记录','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_interaction_description','参与社区互动后会记录在这里','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_history','还没有浏览记录','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_following_relations','还没有关注的人','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_follower_relations','还没有粉丝','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_post_likes','这条动态还没有人点赞','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.empty_post_comments','这条动态还没有评论','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序空态'),
('community.copy.post_comments_unavailable','评论暂不可查看','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序评论'),
('community.copy.post_comments_empty','快来发表第一条评论吧','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序评论'),
('community.copy.post_unavailable','动态暂不可查看','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序动态'),
('community.copy.profile_unavailable','用户资料暂不可查看','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序资料'),
('community.copy.profile_pending_nickname','资料审核中','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序资料'),
('community.copy.profile_pending_description','资料通过审核后展示','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序资料'),
('community.copy.profile_unknown_user','未知用户','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序资料'),
('community.copy.comment_sending','评论发送中','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序评论'),
('community.copy.report_reason_unavailable','举报原因加载失败','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序举报'),
('community.copy.report_submit_failed','举报提交失败，请重试','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序举报'),
('community.copy.report_number_format','举报编号：{reportNo}','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序举报'),
('community.copy.block_unavailable','暂时无法执行屏蔽操作','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序治理'),
('community.copy.upload_incomplete','还有图片未上传完成','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.upload_retry','重新上传','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.uploading','图片上传中','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.publishing','发布中','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.publish_failed_title','发布失败','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.publish_failed','内容发布失败，请稍后重试','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.publish_rejected_default','内容未通过审核，请修改后重试','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.publish_status_unknown','发布状态未知，请稍后查看','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.compose_content_required','请输入发布内容','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.edit_published_unavailable','已发布内容暂不支持编辑','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.delete_success','删除成功','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序操作'),
('community.copy.video_unavailable','视频功能暂未开放','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.emoji_unavailable','表情功能暂未开放','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序发布'),
('community.copy.career_unavailable','立业内容暂未开放','COMMUNITY_COPY','TEXT',1,'ENABLED','小程序提示'),
('community.copy.upload_empty','文件内容不能为空','COMMUNITY_COPY','TEXT',1,'ENABLED','上传错误'),
('community.copy.upload_too_large','文件大小不能超过%sMB','COMMUNITY_COPY','TEXT',1,'ENABLED','上传大小模板'),
('community.copy.upload_format_unsupported','文件格式不支持，请按页面上传要求重新选择','COMMUNITY_COPY','TEXT',1,'ENABLED','上传格式错误'),
('community.copy.upload_owner_missing','登录状态失效，请重新登录后上传','COMMUNITY_COPY','TEXT',1,'ENABLED','上传归属错误')
ON DUPLICATE KEY UPDATE config_group=VALUES(config_group), config_type=VALUES(config_type),
 public_visible=VALUES(public_visible), status=VALUES(status), remark=VALUES(remark);

-- 旧菜单隐藏但保留路由兼容；正式菜单使用独立稳定 ID，避免与其它模块冲突。
UPDATE sys_menu SET visible=0, status='DISABLED', update_time=CURRENT_TIMESTAMP
 WHERE id BETWEEN 881 AND 888 AND parent_id=880;
INSERT INTO sys_menu (id,parent_id,menu_name,menu_type,path,component,icon,perms,menu_sort,visible,status,remark)
VALUES
(880,0,'内容与动态管理','M',NULL,NULL,'MessageSquare',NULL,88,1,'ENABLED','PRD-05 内容与动态管理'),
(1581,880,'内容管理','C','/community/content','community/CommunityContentPage',NULL,'community:content:list',1,1,'ENABLED','PRD-05'),
(1582,1581,'内容审核与治理','F',NULL,NULL,NULL,'community:content:manage',1,0,'ENABLED','PRD-05'),
(1583,880,'动态管理','C','/community/moments','community/CommunityMomentsPage',NULL,'community:moments:list',2,1,'ENABLED','PRD-05'),
(1584,1583,'动态治理','F',NULL,NULL,NULL,'community:moments:manage',1,0,'ENABLED','PRD-05'),
(1585,880,'评论管理','C','/community/comment-audit','community/CommunityCommentsPage',NULL,'community:comment:list',3,1,'ENABLED','PRD-05'),
(1586,1585,'评论治理','F',NULL,NULL,NULL,'community:comment:manage',1,0,'ENABLED','PRD-05'),
(1587,880,'举报管理','C','/community/reports','community/CommunityReportsPage',NULL,'community:report:list',4,1,'ENABLED','PRD-05'),
(1588,1587,'举报处理','F',NULL,NULL,NULL,'community:report:handle',1,0,'ENABLED','PRD-05'),
(1589,880,'家园话题管理','C','/community/topics','community/CommunityTopicsPage',NULL,'community:topic:list',5,1,'ENABLED','PRD-05'),
(1590,1589,'话题编辑','F',NULL,NULL,NULL,'community:topic:manage',1,0,'ENABLED','PRD-05'),
(1591,880,'审核规则配置','C','/community/config','community/CommunityConfigPage',NULL,'community:config:view',6,1,'ENABLED','PRD-05'),
(1592,1591,'配置编辑','F',NULL,NULL,NULL,'community:config:edit',1,0,'ENABLED','PRD-05'),
(1593,880,'社区数据导出','F',NULL,NULL,NULL,'community:export:create',7,0,'ENABLED','PRD-05'),
(1594,1581,'内容列表数据','F',NULL,NULL,NULL,'community:post:list',2,0,'ENABLED','PRD-05 共享内容查询契约'),
(1595,1581,'内容审核操作','F',NULL,NULL,NULL,'community:post:audit',3,0,'ENABLED','PRD-05 共享内容审核契约'),
(1596,1583,'动态列表数据','F',NULL,NULL,NULL,'community:post:list',2,0,'ENABLED','PRD-05 共享动态查询契约'),
(1597,1583,'动态审核操作','F',NULL,NULL,NULL,'community:post:audit',3,0,'ENABLED','PRD-05 共享动态审核契约')
ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id), menu_name=VALUES(menu_name), menu_type=VALUES(menu_type),
 path=VALUES(path), component=VALUES(component), icon=VALUES(icon), perms=VALUES(perms), menu_sort=VALUES(menu_sort),
 visible=VALUES(visible), status=VALUES(status), remark=VALUES(remark);

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE id=880 OR id BETWEEN 1581 AND 1597;

DROP PROCEDURE IF EXISTS prd05_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd05_add_index_if_missing;
