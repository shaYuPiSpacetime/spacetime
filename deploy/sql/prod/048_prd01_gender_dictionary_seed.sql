-- ======================================================
-- PRD01 首登性别字典补齐
-- 前后端统一使用 app_gender 与大写 code，可重复执行
-- ======================================================

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '性别', 'app_gender', 29, 'ENABLED', '用户资料性别类型', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_gender');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_gender', 0, '女', 'FEMALE', 1, 'ENABLED', '性别', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_gender' AND dict_value = 'FEMALE'
);

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_gender', 0, '男', 'MALE', 2, 'ENABLED', '性别', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_gender' AND dict_value = 'MALE'
);
