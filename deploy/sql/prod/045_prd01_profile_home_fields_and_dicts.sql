-- ======================================================
-- PRD-01 我的主页资料字段与业务字典补充
-- 用途：
-- 1. app_user 仅保存非审核型资料字段：微信号、爱听歌曲。
-- 2. 脱单目标、感情状态、我的标签统一走字典；业务表只保存 code。
-- 3. 头像、相册、背景图、开放文字、语音仍从 app_user_audit_record 派生，不在 app_user 冗余。
-- ======================================================

SET @wechat_id_column_count = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'wechat_id'
);
SET @wechat_id_column_sql = IF(
    @wechat_id_column_count = 0,
    'ALTER TABLE `app_user` ADD COLUMN `wechat_id` VARCHAR(64) DEFAULT NULL COMMENT ''微信号，仅本人资料页可见'' AFTER `tags`',
    'SELECT 1'
);
PREPARE wechat_id_column_stmt FROM @wechat_id_column_sql;
EXECUTE wechat_id_column_stmt;
DEALLOCATE PREPARE wechat_id_column_stmt;

SET @favorite_song_id_column_count = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'favorite_song_id'
);
SET @favorite_song_id_column_sql = IF(
    @favorite_song_id_column_count = 0,
    'ALTER TABLE `app_user` ADD COLUMN `favorite_song_id` VARCHAR(128) DEFAULT NULL COMMENT ''爱听歌曲三方ID'' AFTER `wechat_id`',
    'SELECT 1'
);
PREPARE favorite_song_id_column_stmt FROM @favorite_song_id_column_sql;
EXECUTE favorite_song_id_column_stmt;
DEALLOCATE PREPARE favorite_song_id_column_stmt;

SET @favorite_song_name_column_count = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'favorite_song_name'
);
SET @favorite_song_name_column_sql = IF(
    @favorite_song_name_column_count = 0,
    'ALTER TABLE `app_user` ADD COLUMN `favorite_song_name` VARCHAR(128) DEFAULT NULL COMMENT ''爱听歌曲名称'' AFTER `favorite_song_id`',
    'SELECT 1'
);
PREPARE favorite_song_name_column_stmt FROM @favorite_song_name_column_sql;
EXECUTE favorite_song_name_column_stmt;
DEALLOCATE PREPARE favorite_song_name_column_stmt;

SET @favorite_song_artist_column_count = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'favorite_song_artist'
);
SET @favorite_song_artist_column_sql = IF(
    @favorite_song_artist_column_count = 0,
    'ALTER TABLE `app_user` ADD COLUMN `favorite_song_artist` VARCHAR(128) DEFAULT NULL COMMENT ''爱听歌曲歌手'' AFTER `favorite_song_name`',
    'SELECT 1'
);
PREPARE favorite_song_artist_column_stmt FROM @favorite_song_artist_column_sql;
EXECUTE favorite_song_artist_column_stmt;
DEALLOCATE PREPARE favorite_song_artist_column_stmt;

SET @favorite_song_cover_column_count = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'favorite_song_cover_url'
);
SET @favorite_song_cover_column_sql = IF(
    @favorite_song_cover_column_count = 0,
    'ALTER TABLE `app_user` ADD COLUMN `favorite_song_cover_url` VARCHAR(255) DEFAULT NULL COMMENT ''爱听歌曲封面URL'' AFTER `favorite_song_artist`',
    'SELECT 1'
);
PREPARE favorite_song_cover_column_stmt FROM @favorite_song_cover_column_sql;
EXECUTE favorite_song_cover_column_stmt;
DEALLOCATE PREPARE favorite_song_cover_column_stmt;

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '脱单目标', 'app_dating_goal', 36, 'ENABLED', '用户资料脱单目标', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_dating_goal');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '感情状态', 'app_emotional_status', 37, 'ENABLED', '用户资料感情状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_emotional_status');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '个人标签', 'app_profile_tag', 38, 'ENABLED', '用户个人标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_profile_tag');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_dating_goal', 0, '时机成熟就结婚', 'TIMING_MATURE', 1, 'ENABLED', '脱单目标', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_dating_goal' AND dict_value = 'TIMING_MATURE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_dating_goal', 0, '1-2年内结婚', 'ONE_TO_TWO_YEARS', 2, 'ENABLED', '脱单目标', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_dating_goal' AND dict_value = 'ONE_TO_TWO_YEARS');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_dating_goal', 0, '3-5年内结婚', 'THREE_TO_FIVE_YEARS', 3, 'ENABLED', '脱单目标', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_dating_goal' AND dict_value = 'THREE_TO_FIVE_YEARS');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_dating_goal', 0, '想恋爱但不想结婚', 'DATE_NOT_MARRY', 4, 'ENABLED', '脱单目标', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_dating_goal' AND dict_value = 'DATE_NOT_MARRY');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_emotional_status', 0, '正在寻觅', 'SEARCHING', 1, 'ENABLED', '感情状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_emotional_status' AND dict_value = 'SEARCHING');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_emotional_status', 0, '佛系交友', 'CASUAL', 2, 'ENABLED', '感情状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_emotional_status' AND dict_value = 'CASUAL');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_emotional_status', 0, '暂时不找', 'NOT_LOOKING', 3, 'ENABLED', '感情状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_emotional_status' AND dict_value = 'NOT_LOOKING');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'IT女神', 'IT_GIRL', 1, 'ENABLED', '个人标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'IT_GIRL');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '户外发烧友', 'OUTDOOR_LOVER', 2, 'ENABLED', '个人标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'OUTDOOR_LOVER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '热爱旅行', 'LOVE_TRAVEL', 3, 'ENABLED', '个人标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'LOVE_TRAVEL');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '电子竞技', 'ESPORTS', 4, 'ENABLED', '个人标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ESPORTS');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ISTJ物流师', 'ISTJ', 11, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ISTJ');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ISFJ守卫者', 'ISFJ', 12, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ISFJ');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'INFJ提倡者', 'INFJ', 13, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'INFJ');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'INTJ建筑师', 'INTJ', 14, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'INTJ');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ISTP技术专家', 'ISTP', 15, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ISTP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ISFP艺术家', 'ISFP', 16, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ISFP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'INFP调停者', 'INFP', 17, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'INFP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'INTP逻辑学家', 'INTP', 18, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'INTP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ESTP企业家', 'ESTP', 19, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ESTP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ESFP表演者', 'ESFP', 20, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ESFP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ENFP竞选者', 'ENFP', 21, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ENFP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ENTP辩论家', 'ENTP', 22, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ENTP');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ESTJ总经理', 'ESTJ', 23, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ESTJ');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ESFJ执政官', 'ESFJ', 24, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ESFJ');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ENFJ主人公', 'ENFJ', 25, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ENFJ');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'ENTJ指挥官', 'ENTJ', 26, 'ENABLED', 'MBTI标签', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ENTJ');
