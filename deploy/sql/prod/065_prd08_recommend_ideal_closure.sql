-- =============================================================
-- PRD-08 推荐与理想型条件筛选闭环
-- 说明：新增偏好、快照、快照候选、浏览记录，并补充解锁来源和批量折扣。
-- 特性：可重复执行；不删除既有业务数据。
-- =============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `ct_recommend_preference` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `target_city_codes` JSON NOT NULL COMMENT '目标城市稳定编码列表',
    `allow_neighbor_city` TINYINT NOT NULL DEFAULT 0 COMMENT '是否允许推荐周边城市：0-否，1-是',
    `min_age` INT NOT NULL COMMENT '最小年龄',
    `max_age` INT NOT NULL COMMENT '最大年龄',
    `min_height` INT NULL COMMENT '最小身高，单位厘米',
    `max_height` INT NULL COMMENT '最大身高，单位厘米',
    `min_weight` INT NULL COMMENT '最小体重，单位千克',
    `max_weight` INT NULL COMMENT '最大体重，单位千克',
    `education_codes` JSON NULL COMMENT '学历稳定编码列表',
    `hometowns` JSON NULL COMMENT '家乡省市稳定编码列表',
    `school_codes` JSON NULL COMMENT '学校稳定编码列表',
    `major_names` JSON NULL COMMENT '标准化专业全称列表',
    `version` INT NOT NULL DEFAULT 1 COMMENT '偏好乐观锁版本',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID',
    `updated_by` BIGINT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_recommend_preference_user` (`user_id`, `deleted`),
    KEY `idx_recommend_preference_update` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐与理想型共享筛选偏好';

CREATE TABLE IF NOT EXISTS `ct_ideal_filter_snapshot` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `snapshot_no` VARCHAR(40) NOT NULL COMMENT '理想型筛选快照业务编号',
    `user_id` BIGINT NOT NULL COMMENT '快照所属用户ID',
    `request_id` VARCHAR(64) NOT NULL COMMENT '客户端筛选幂等键',
    `condition_digest` CHAR(64) NOT NULL COMMENT '规范化条件摘要哈希',
    `preference_version` INT NOT NULL COMMENT '发起筛选时偏好版本',
    `target_city_codes` JSON NOT NULL COMMENT '目标城市稳定编码快照',
    `min_age` INT NOT NULL COMMENT '最小年龄快照',
    `max_age` INT NOT NULL COMMENT '最大年龄快照',
    `condition_codes` JSON NULL COMMENT '理想型固定条件编码列表',
    `condition_payload` JSON NULL COMMENT '条件中文和依赖摘要，不含候选敏感原值',
    `result_count` INT NOT NULL DEFAULT 0 COMMENT '快照创建时命中人数',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '快照状态：active-可查看，expired-已过期',
    `expires_at` DATETIME NOT NULL COMMENT '快照到期时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID',
    `updated_by` BIGINT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ideal_snapshot_no` (`snapshot_no`),
    UNIQUE KEY `uk_ideal_snapshot_user_request` (`user_id`, `request_id`, `deleted`),
    KEY `idx_ideal_snapshot_user_created` (`user_id`, `create_time`, `snapshot_no`),
    KEY `idx_ideal_snapshot_expire` (`status`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='理想型筛选不可变快照';

CREATE TABLE IF NOT EXISTS `ct_ideal_snapshot_candidate` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `snapshot_id` BIGINT NOT NULL COMMENT '理想型筛选快照主键ID',
    `item_no` VARCHAR(40) NOT NULL COMMENT '快照内结果项业务编号',
    `candidate_user_id` BIGINT NOT NULL COMMENT '候选用户ID，仅服务端使用',
    `sort_time` DATETIME NOT NULL COMMENT '候选稳定排序时间',
    `sort_tie_breaker` VARCHAR(40) NOT NULL COMMENT '候选稳定排序次级值',
    `matched_condition_codes` JSON NULL COMMENT '实际命中的已选条件编码列表',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID',
    `updated_by` BIGINT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ideal_candidate_item_no` (`item_no`),
    UNIQUE KEY `uk_ideal_candidate_snapshot_user` (`snapshot_id`, `candidate_user_id`, `deleted`),
    KEY `idx_ideal_candidate_cursor` (`snapshot_id`, `sort_time`, `sort_tie_breaker`),
    CONSTRAINT `fk_ideal_candidate_snapshot` FOREIGN KEY (`snapshot_id`) REFERENCES `ct_ideal_filter_snapshot` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='理想型筛选快照候选';

CREATE TABLE IF NOT EXISTS `ct_recommend_view_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `event_no` VARCHAR(40) NOT NULL COMMENT '推荐浏览事件业务编号',
    `request_id` VARCHAR(64) NOT NULL COMMENT '客户端动作幂等键',
    `user_id` BIGINT NOT NULL COMMENT '当前用户ID',
    `candidate_user_id` BIGINT NOT NULL COMMENT '候选用户ID',
    `scene` VARCHAR(20) NOT NULL COMMENT '来源场景：recommend-推荐，replay-回看，ideal-理想型',
    `filter_version` INT NULL COMMENT '推荐偏好版本',
    `snapshot_no` VARCHAR(40) NULL COMMENT '理想型筛选快照业务编号',
    `action` VARCHAR(20) NOT NULL COMMENT '动作：view-曝光，detail-详情，skip-跳过，like-喜欢，never-不再推荐',
    `position` INT NULL COMMENT '候选在当前结果中的位置',
    `viewed_at` DATETIME NOT NULL COMMENT '动作发生时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID',
    `updated_by` BIGINT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_recommend_view_event_no` (`event_no`),
    UNIQUE KEY `uk_recommend_view_request_action` (`user_id`, `request_id`, `action`, `deleted`),
    KEY `idx_recommend_replay` (`user_id`, `viewed_at`, `candidate_user_id`),
    KEY `idx_recommend_candidate` (`candidate_user_id`, `viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐浏览与回看事件记录';

-- 既有解锁记录补充理想型快照来源；使用 information_schema 保证重复执行安全。
SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'app_user_unlock_record' AND column_name = 'snapshot_no'),
    'SELECT 1',
    'ALTER TABLE app_user_unlock_record ADD COLUMN snapshot_no VARCHAR(40) NULL COMMENT ''理想型筛选快照业务编号'' AFTER target_biz_no'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'app_user_unlock_record' AND column_name = 'snapshot_item_no'),
    'SELECT 1',
    'ALTER TABLE app_user_unlock_record ADD COLUMN snapshot_item_no VARCHAR(40) NULL COMMENT ''理想型筛选结果项业务编号'' AFTER snapshot_no'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 理想型权益属于被解锁用户，不属于某次筛选快照；先收敛历史重复权益，再重建目标级唯一索引。
SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema = DATABASE() AND table_name = 'app_user_unlock_record' AND index_name = 'uk_unlock_active_target'),
    'ALTER TABLE app_user_unlock_record DROP INDEX uk_unlock_active_target',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE app_user_unlock_record older
JOIN app_user_unlock_record newer
  ON newer.user_id = older.user_id
 AND newer.target_user_id = older.target_user_id
 AND newer.target_biz_type = older.target_biz_type
 AND newer.id > older.id
 AND newer.status = 'active'
 AND newer.active_marker = 1
 AND newer.deleted = 0
 AND newer.unlock_scene='ideal_user_unlock'
SET older.status = 'expired',
    older.active_marker=NULL,
    older.expire_time = COALESCE(older.expire_time, CURRENT_TIMESTAMP),
    older.update_time = CURRENT_TIMESTAMP
WHERE older.status = 'active'
  AND older.active_marker = 1
  AND older.deleted = 0
  AND older.target_user_id IS NOT NULL
  AND older.unlock_scene='ideal_user_unlock';

UPDATE app_user_unlock_record
SET target_biz_no=CAST(target_user_id AS CHAR),
    update_time = CURRENT_TIMESTAMP
WHERE target_biz_type = 'ideal'
  AND target_user_id IS NOT NULL
  AND unlock_scene='ideal_user_unlock'
  AND deleted = 0;

SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema = DATABASE() AND table_name = 'app_user_unlock_record' AND index_name = 'uk_unlock_active_target'),
    'SELECT 1',
    'ALTER TABLE app_user_unlock_record ADD UNIQUE INDEX uk_unlock_active_target (user_id, unlock_scene, target_biz_type, target_biz_no, active_marker)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema = DATABASE() AND table_name = 'app_user_unlock_record' AND index_name = 'idx_unlock_user_snapshot_status'),
    'SELECT 1',
    'ALTER TABLE app_user_unlock_record ADD INDEX idx_unlock_user_snapshot_status (user_id, snapshot_no, status)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 批量确认会使用同一个 request_id 写入多个目标；保留目标级幂等，移除旧的请求级单条限制。
SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema = DATABASE() AND table_name = 'app_user_unlock_record' AND index_name = 'uk_unlock_user_request'),
    'ALTER TABLE app_user_unlock_record DROP INDEX uk_unlock_user_request',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema = DATABASE() AND table_name = 'app_user_unlock_record' AND index_name = 'uk_user_request_target'),
    'SELECT 1',
    'ALTER TABLE app_user_unlock_record ADD UNIQUE INDEX uk_user_request_target (user_id, request_id, target_user_id)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 见面偏好是 PRD-01 主资料字典字段，不再以开放文本问答替代。
SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'app_user' AND column_name = 'meeting_preference'),
    'SELECT 1',
    'ALTER TABLE app_user ADD COLUMN meeting_preference VARCHAR(64) NULL COMMENT ''见面偏好字典编码'' AFTER emotional_status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'app_user' AND column_name = 'preferred_activities'),
    'SELECT 1',
    'ALTER TABLE app_user ADD COLUMN preferred_activities JSON NULL COMMENT ''喜欢的见面活动字典编码列表'' AFTER meeting_preference'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO sys_dict_data
    (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time, deleted)
SELECT seed.dict_type, 0, seed.dict_label, seed.dict_value, seed.dict_sort,
       'ENABLED', 'PRD-08 见面偏好动态字典', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
  FROM (
        SELECT 'meeting_preference' dict_type, '轻松自然' dict_label, 'NATURAL' dict_value, 10 dict_sort
        UNION ALL SELECT 'meeting_preference', '提前计划', 'PLANNED', 20
        UNION ALL SELECT 'meeting_preference', '随性出发', 'SPONTANEOUS', 30
        UNION ALL SELECT 'meeting_preference', '慢慢了解', 'SLOW_PACED', 40
        UNION ALL SELECT 'preferred_activity', '喝咖啡', 'COFFEE', 10
        UNION ALL SELECT 'preferred_activity', '散步', 'WALK', 20
        UNION ALL SELECT 'preferred_activity', '品尝美食', 'FOOD', 30
        UNION ALL SELECT 'preferred_activity', '看电影', 'MOVIE', 40
        UNION ALL SELECT 'preferred_activity', '看展', 'EXHIBITION', 50
        UNION ALL SELECT 'preferred_activity', '运动', 'SPORTS', 60
        UNION ALL SELECT 'preferred_activity', '短途旅行', 'TRAVEL', 70
        UNION ALL SELECT 'preferred_activity', '桌游', 'BOARD_GAME', 80
  ) seed
 WHERE NOT EXISTS (
       SELECT 1 FROM sys_dict_data target
        WHERE target.dict_type = seed.dict_type
          AND target.dict_value = seed.dict_value
          AND target.deleted = 0
 );

INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark, deleted)
VALUES
    ('commercial.ideal.batch.discount.percent', '10', 'COMMERCIAL', 'NUMBER', 0, 'ENABLED', '理想型批量解锁优惠比例', 0)
ON DUPLICATE KEY UPDATE
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    deleted = 0;

INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark, deleted)
VALUES
    ('prd01.profile.preferredActivities.maxCount', '6', 'PRD01_PROFILE', 'NUMBER', 0, 'ENABLED', '喜欢的见面活动最多选择数量', 0)
ON DUPLICATE KEY UPDATE
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    deleted = 0;

-- 周边城市必须由运营维护真实邻接关系；空对象表示能力降级关闭，禁止按同省或定位距离猜测。
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark, deleted)
VALUES
    ('prd08.recommend.neighbor-city-map', '{}', 'PRD08_RECOMMEND', 'JSON', 0, 'ENABLED', '周边城市邻接关系（城市编码到相邻城市编码列表）', 0)
ON DUPLICATE KEY UPDATE
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    deleted = 0;

-- 理想型帮助中心正文由后台配置驱动，价格、折扣、上限和保留期仍读取各自结构化配置。
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark, deleted)
VALUES
    ('content.ideal.help.intro', '选择至少一个理想条件，我们会基于你的推荐偏好生成一份不可变筛选结果。',
     'CONTENT', 'TEXT', 0, 'ENABLED', '理想型帮助中心介绍', 0),
    ('content.ideal.help.result', '解锁前只展示脱敏年龄段、城市和命中条件，保护每位用户的真实资料。',
     'CONTENT', 'TEXT', 0, 'ENABLED', '理想型帮助中心结果说明', 0),
    ('content.ideal.help.unlock', '解锁后可在有效期内查看公开主页并发起私信；解锁全部按后台优惠比例统一计价。',
     'CONTENT', 'TEXT', 0, 'ENABLED', '理想型帮助中心解锁说明', 0)
ON DUPLICATE KEY UPDATE
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    deleted = 0;

-- 修复历史迁移中消费场景中文名称错位；单人价格是批量折扣的唯一单价来源。
UPDATE app_coin_scene_config
   SET mobile_name = '解锁访客',
       scene_desc = '解锁访客资料',
       update_time = CURRENT_TIMESTAMP
 WHERE scene_code = 'viewers_unlock_one'
   AND deleted = 0;

UPDATE app_coin_scene_config
   SET mobile_name = '解锁理想型',
       scene_desc = '单个解锁理想型用户',
       update_time = CURRENT_TIMESTAMP
 WHERE scene_code = 'ideal_user_unlock'
   AND deleted = 0;

UPDATE app_coin_scene_config
   SET mobile_name = '批量解锁理想型',
       scene_desc = '批量解锁理想型用户，单价取单个解锁场景后应用批量折扣',
       update_time = CURRENT_TIMESTAMP
 WHERE scene_code = 'ideal_batch_unlock'
   AND deleted = 0;

-- 运维校验：四张事实表、关键索引、解锁追溯字段和折扣配置均应存在。
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = DATABASE()
   AND table_name IN ('ct_recommend_preference', 'ct_ideal_filter_snapshot',
                      'ct_ideal_snapshot_candidate', 'ct_recommend_view_log')
 ORDER BY table_name;

SELECT table_name, index_name
  FROM information_schema.statistics
 WHERE table_schema = DATABASE()
   AND index_name IN ('uk_recommend_preference_user', 'uk_ideal_snapshot_no',
                      'uk_ideal_snapshot_user_request', 'uk_ideal_candidate_snapshot_user',
                      'uk_ideal_candidate_item_no', 'idx_ideal_candidate_cursor',
                      'uk_recommend_view_request_action', 'idx_recommend_replay',
                      'idx_unlock_user_snapshot_status', 'uk_unlock_active_target')
 ORDER BY table_name, index_name;

SELECT config_key, config_value, status, remark
  FROM app_config
 WHERE config_key IN ('commercial.ideal.batch.discount.percent',
                      'prd01.profile.preferredActivities.maxCount',
                      'prd08.recommend.neighbor-city-map',
                      'content.ideal.help.intro',
                      'content.ideal.help.result',
                      'content.ideal.help.unlock')
   AND deleted = 0;
