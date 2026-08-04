-- =============================================================
-- PRD-05 管理后台治理闭环
-- 说明：补充分发/阅读字段、高风险操作权限和稳定错误文案；增量幂等。
-- =============================================================

DROP PROCEDURE IF EXISTS prd05_admin_add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE prd05_admin_add_column_if_missing(
    IN p_table_name VARCHAR(64), IN p_column_name VARCHAR(64), IN p_column_ddl TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = p_table_name
           AND column_name = p_column_name
    ) THEN
        SET @prd05_admin_ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_column_ddl);
        PREPARE prd05_admin_stmt FROM @prd05_admin_ddl;
        EXECUTE prd05_admin_stmt;
        DEALLOCATE PREPARE prd05_admin_stmt;
    END IF;
END$$
DELIMITER ;

CALL prd05_admin_add_column_if_missing(
    'community_post', 'distribution_scenes',
    'distribution_scenes JSON DEFAULT NULL COMMENT ''关注/同城/热门分发场景'' AFTER source_scene'
);
CALL prd05_admin_add_column_if_missing(
    'community_post', 'read_count',
    'read_count INT NOT NULL DEFAULT 0 COMMENT ''阅读次数'' AFTER report_count'
);

DROP PROCEDURE IF EXISTS prd05_admin_add_column_if_missing;

UPDATE community_post
   SET distribution_scenes = CASE post_no
           WHEN 'POST-0000000000000001' THEN JSON_ARRAY('follow', 'same_city', 'hot')
           WHEN 'POST-0000000000000002' THEN JSON_ARRAY('same_city', 'hot')
           WHEN 'POST-0000000000000003' THEN JSON_ARRAY('follow', 'hot')
           WHEN 'POST-0000000000000004' THEN JSON_ARRAY('same_city')
           WHEN 'POST-0000000000000005' THEN JSON_ARRAY('hot')
           WHEN 'POST-0000000000000006' THEN JSON_ARRAY('follow', 'same_city')
           ELSE COALESCE(distribution_scenes, JSON_ARRAY())
       END,
       read_count = CASE post_no
           WHEN 'POST-0000000000000001' THEN GREATEST(read_count, 326)
           WHEN 'POST-0000000000000002' THEN GREATEST(read_count, 245)
           WHEN 'POST-0000000000000003' THEN GREATEST(read_count, 198)
           WHEN 'POST-0000000000000004' THEN GREATEST(read_count, 164)
           WHEN 'POST-0000000000000005' THEN GREATEST(read_count, 137)
           WHEN 'POST-0000000000000006' THEN GREATEST(read_count, 112)
           ELSE read_count
       END
 WHERE deleted = 0;

INSERT INTO sys_menu (
    id, parent_id, menu_name, menu_type, path, component, icon,
    perms, menu_sort, visible, status, remark
)
VALUES
    (1598, 1587, '举报高风险处罚', 'F', NULL, NULL, NULL,
     'community:report:risk', 2, 0, 'ENABLED', '禁言、IP 封禁和冻结账号，仅风控或超管'),
    (1599, 1591, '高风险配置编辑', 'F', NULL, NULL, NULL,
     'community:config:risk', 2, 0, 'ENABLED', '高风险社区配置，仅风控或超管')
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id), menu_name = VALUES(menu_name), menu_type = VALUES(menu_type),
    perms = VALUES(perms), menu_sort = VALUES(menu_sort), visible = VALUES(visible),
    status = VALUES(status), remark = VALUES(remark), deleted = 0;

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT id, 1598 FROM sys_role WHERE role_code = 'super_admin' AND deleted = 0;
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT id, 1599 FROM sys_role WHERE role_code = 'super_admin' AND deleted = 0;

INSERT INTO app_config (
    config_key, config_value, config_group, config_type,
    public_visible, status, remark, create_time, update_time, deleted
)
VALUES
    ('community.copy.report_already_handled', '该举报已处理，请刷新列表', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '重复处理举报提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.invalid_status_transition', '当前状态不允许执行该操作，请刷新后重试', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '内容状态机提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.high_risk_confirmation_required', '高风险变更需要二次确认', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '高风险确认提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.duplicate_config_key', '配置项重复，请刷新后重试', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '配置契约提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.unsupported_config_key', '存在不受支持的配置项，请刷新后重试', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '配置契约提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value), config_group = VALUES(config_group),
    config_type = VALUES(config_type), public_visible = VALUES(public_visible),
    status = VALUES(status), remark = VALUES(remark), update_time = CURRENT_TIMESTAMP, deleted = 0;
