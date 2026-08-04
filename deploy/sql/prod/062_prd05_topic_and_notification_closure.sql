-- =============================================================
-- PRD-05 话题规则与治理通知闭环
-- 说明：新增举报回复状态并补充话题管理稳定错误文案；增量幂等。
-- =============================================================

DROP PROCEDURE IF EXISTS prd05_topic_notify_add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE prd05_topic_notify_add_column_if_missing(
    IN p_table_name VARCHAR(64), IN p_column_name VARCHAR(64), IN p_column_ddl TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = p_table_name
           AND column_name = p_column_name
    ) THEN
        SET @prd05_topic_notify_ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_column_ddl);
        PREPARE prd05_topic_notify_stmt FROM @prd05_topic_notify_ddl;
        EXECUTE prd05_topic_notify_stmt;
        DEALLOCATE PREPARE prd05_topic_notify_stmt;
    END IF;
END$$
DELIMITER ;

CALL prd05_topic_notify_add_column_if_missing(
    'community_report', 'reply_status',
    'reply_status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''举报人回复状态：pending/sent/failed'' AFTER status'
);

DROP PROCEDURE IF EXISTS prd05_topic_notify_add_column_if_missing;

UPDATE community_report
   SET reply_status = 'pending'
 WHERE reply_status IS NULL OR reply_status = '';

INSERT INTO sys_dict_data (
    dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
    create_time, update_time, deleted
)
SELECT seed.dict_type, 0, seed.dict_label, seed.dict_value, seed.dict_sort, 'ENABLED', seed.remark,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM (
    SELECT 'community_comment_action' dict_type, '警告用户' dict_label, 'warn_user' dict_value,
           4 dict_sort, '{"reasonRequired":true}' remark
    UNION ALL
    SELECT 'community_comment_action', '禁言用户', 'mute_user',
           5, '{"reasonRequired":true,"muteRequired":true,"highRisk":true}'
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data existing
     WHERE existing.dict_type = seed.dict_type
       AND existing.dict_value = seed.dict_value
       AND existing.deleted = 0
);

-- 058 的早期占位场景为后台页面名，正式话题模型使用小程序真实消费场景。
UPDATE sys_dict_data
   SET status = 'DISABLED', update_time = CURRENT_TIMESTAMP
 WHERE dict_type = 'community_topic_display_scene'
   AND dict_value IN ('content', 'moments', 'miniapp')
   AND deleted = 0;

INSERT INTO sys_dict_data (
    dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
    create_time, update_time, deleted
)
SELECT seed.dict_type, 0, seed.dict_label, seed.dict_value, seed.dict_sort, 'ENABLED', 'PRD-05 话题真实展示场景',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM (
    SELECT 'community_topic_display_scene' dict_type, '热门入口' dict_label, 'hot' dict_value, 1 dict_sort
    UNION ALL
    SELECT 'community_topic_display_scene', '话题列表', 'topic_list', 2
    UNION ALL
    SELECT 'community_topic_display_scene', '发布页选择', 'publish', 3
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data existing
     WHERE existing.dict_type = seed.dict_type
       AND existing.dict_value = seed.dict_value
       AND existing.deleted = 0
);

INSERT INTO sys_menu (
    id, parent_id, menu_name, menu_type, path, component, icon,
    perms, menu_sort, visible, status, remark
)
VALUES
    (1600, 1585, '评论高风险处罚', 'F', NULL, NULL, NULL,
     'community:comment:risk', 2, 0, 'ENABLED', '评论禁言处罚，仅风控或超管')
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id), menu_name = VALUES(menu_name), menu_type = VALUES(menu_type),
    perms = VALUES(perms), menu_sort = VALUES(menu_sort), visible = VALUES(visible),
    status = VALUES(status), remark = VALUES(remark), deleted = 0;

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT id, 1600 FROM sys_role WHERE role_code = 'super_admin' AND deleted = 0;

INSERT INTO app_config (
    config_key, config_value, config_group, config_type,
    public_visible, status, remark, create_time, update_time, deleted
)
VALUES
    ('community.copy.topic_name_duplicate', '已存在同名启用话题，请调整名称或先停用原话题', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '话题重名提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.topic_cover_url_invalid', '封面必须通过后台上传到项目图片空间', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '话题封面来源提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.topic_display_scene_invalid', '至少选择一个有效展示场景', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '话题展示场景提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.high_risk_permission_denied', '当前账号无权执行高风险社区操作', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '高风险操作权限提示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value), config_group = VALUES(config_group),
    config_type = VALUES(config_type), public_visible = VALUES(public_visible),
    status = VALUES(status), remark = VALUES(remark), update_time = CURRENT_TIMESTAMP, deleted = 0;
