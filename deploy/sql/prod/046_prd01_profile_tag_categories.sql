-- ======================================================
-- PRD-01 我的标签分类补充
-- 用途：
-- 1. 小程序“我的标签”按需求 UI 分为 MBTI、性格、爱好、运动、足迹。
-- 2. 业务表 app_user.tags 仍只保存标签 code 数组，不保存分类和中文。
-- 3. 分类通过 sys_dict_data.parent_id 表达：分类是 app_profile_tag 根节点，具体标签是分类子节点。
-- 4. sys_dict_data.remark 仅作为说明文字，不参与标签分类判断。
-- ======================================================

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, 'MBTI', 'MBTI', 10, 'ENABLED', '标签分类', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'MBTI');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '性格', 'PERSONALITY', 20, 'ENABLED', '标签分类', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'PERSONALITY');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '爱好', 'HOBBY', 30, 'ENABLED', '标签分类', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'HOBBY');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '运动', 'SPORT', 40, 'ENABLED', '标签分类', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'SPORT');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '足迹', 'FOOTPRINT', 50, 'ENABLED', '标签分类', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FOOTPRINT');

UPDATE sys_dict_data
SET parent_id = (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'MBTI' LIMIT 1) c)
WHERE dict_type = 'app_profile_tag'
  AND dict_value IN (
      'ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP',
      'ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'
  );
UPDATE sys_dict_data
SET parent_id = (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'HOBBY' LIMIT 1) c)
WHERE dict_type = 'app_profile_tag'
  AND dict_value IN ('IT_GIRL', 'ESPORTS');
UPDATE sys_dict_data
SET parent_id = (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'SPORT' LIMIT 1) c)
WHERE dict_type = 'app_profile_tag'
  AND dict_value = 'OUTDOOR_LOVER';
UPDATE sys_dict_data
SET parent_id = (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FOOTPRINT' LIMIT 1) c)
WHERE dict_type = 'app_profile_tag'
  AND dict_value = 'LOVE_TRAVEL';

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'PERSONALITY' LIMIT 1) c), '外冷内热', 'OUT_COLD_IN_HOT', 31, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'OUT_COLD_IN_HOT');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'PERSONALITY' LIMIT 1) c), '话不多', 'FEW_WORDS', 32, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FEW_WORDS');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'PERSONALITY' LIMIT 1) c), '乐观开朗', 'OPTIMISTIC', 33, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'OPTIMISTIC');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'PERSONALITY' LIMIT 1) c), '细节控', 'DETAIL_CONTROL', 34, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'DETAIL_CONTROL');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'HOBBY' LIMIT 1) c), '电影爱好者', 'MOVIE_LOVER', 41, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'MOVIE_LOVER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'HOBBY' LIMIT 1) c), '美食探索', 'FOODIE', 42, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FOODIE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'HOBBY' LIMIT 1) c), '阅读爱好', 'READING', 43, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'READING');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'HOBBY' LIMIT 1) c), '宠物小伙伴', 'PET_LOVER', 44, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'PET_LOVER');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'SPORT' LIMIT 1) c), '跑步', 'RUNNING', 51, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'RUNNING');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'SPORT' LIMIT 1) c), '健身', 'FITNESS', 52, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FITNESS');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'SPORT' LIMIT 1) c), '徒步', 'HIKING', 53, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'HIKING');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'SPORT' LIMIT 1) c), '骑行', 'CYCLING', 54, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'CYCLING');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FOOTPRINT' LIMIT 1) c), '城市漫游', 'CITY_WALK', 61, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'CITY_WALK');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FOOTPRINT' LIMIT 1) c), '看海计划', 'SEA_LOVER', 62, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'SEA_LOVER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FOOTPRINT' LIMIT 1) c), '山野派', 'MOUNTAIN_LOVER', 63, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'MOUNTAIN_LOVER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', (SELECT id FROM (SELECT id FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'FOOTPRINT' LIMIT 1) c), '旅行收藏', 'TRAVEL_MEMORY', 64, 'ENABLED', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'TRAVEL_MEMORY');
