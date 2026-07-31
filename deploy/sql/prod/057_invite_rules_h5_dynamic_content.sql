-- ======================================================
-- 邀请规则 H5 配置与推广奖励动态联动
-- 1. 预置 invite_rules 公告协议配置，并默认指向同域动态 H5。
-- 2. 清理历史 NATIVE 正文，防止旧正文继续遮蔽后台 H5 URL。
-- 3. 补齐“邀请规则”中文内容类型字典。
-- 可重复执行；本迁移会把邀请规则切换到项目自有动态 H5。
-- ======================================================

DROP PROCEDURE IF EXISTS invite_rules_add_column;
DELIMITER $$
CREATE PROCEDURE invite_rules_add_column(
    IN p_column_name VARCHAR(64),
    IN p_ddl TEXT
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    SELECT COUNT(*)
      INTO v_exists
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'content_article'
       AND column_name = p_column_name;
    IF v_exists = 0 THEN
        SET @invite_rules_ddl = p_ddl;
        PREPARE invite_rules_stmt FROM @invite_rules_ddl;
        EXECUTE invite_rules_stmt;
        DEALLOCATE PREPARE invite_rules_stmt;
    END IF;
END$$
DELIMITER ;

CALL invite_rules_add_column(
    'content_code',
    'ALTER TABLE content_article ADD COLUMN content_code VARCHAR(50) DEFAULT NULL COMMENT ''稳定内容编码'' AFTER id'
);
CALL invite_rules_add_column(
    'version',
    'ALTER TABLE content_article ADD COLUMN version VARCHAR(20) NOT NULL DEFAULT ''v1.0'' COMMENT ''内容版本号'' AFTER content_code'
);
CALL invite_rules_add_column(
    'preinitialized',
    'ALTER TABLE content_article ADD COLUMN preinitialized TINYINT NOT NULL DEFAULT 0 COMMENT ''是否系统预置：0=否，1=是'' AFTER version'
);

DROP PROCEDURE IF EXISTS invite_rules_add_column;

INSERT INTO content_article
    (content_code, version, preinitialized, type, category, title, summary,
     content_type, content_url, content_body, sort, status,
     effective_time, create_time, update_time, deleted)
SELECT 'invite_rules', 'v1.0', 1, 'RULE', 'BUSINESS_RULE', '邀请规则', '邀请好友活动规则',
       'H5', 'https://admin.shikongxiehou.com/h5/invite-rules/index.html', NULL, 100, 'ENABLED',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1
      FROM content_article
     WHERE content_code = 'invite_rules'
       AND deleted = 0
);

UPDATE content_article
   SET preinitialized = 1,
       type = 'RULE',
       category = 'BUSINESS_RULE',
       title = CASE WHEN title IS NULL OR TRIM(title) = '' THEN '邀请规则' ELSE title END,
       summary = CASE WHEN summary IS NULL OR TRIM(summary) = '' THEN '邀请好友活动规则' ELSE summary END,
       content_type = 'H5',
       content_url = 'https://admin.shikongxiehou.com/h5/invite-rules/index.html',
       content_body = NULL,
       effective_time = COALESCE(effective_time, CURRENT_TIMESTAMP),
       update_time = CURRENT_TIMESTAMP
 WHERE content_code = 'invite_rules'
   AND deleted = 0;

UPDATE sys_dict_data
   SET dict_label = '邀请规则',
       dict_sort = 100,
       status = 'ENABLED',
       remark = '推广裂变邀请规则',
       update_time = CURRENT_TIMESTAMP
 WHERE dict_type = 'compliance_content_type'
   AND dict_value = 'invite_rules'
   AND deleted = 0;

INSERT INTO sys_dict_data
    (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
     create_time, update_time, deleted)
SELECT 'compliance_content_type', 0, '邀请规则', 'invite_rules', 100, 'ENABLED',
       '推广裂变邀请规则', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1
      FROM sys_dict_data
     WHERE dict_type = 'compliance_content_type'
       AND dict_value = 'invite_rules'
       AND deleted = 0
);
