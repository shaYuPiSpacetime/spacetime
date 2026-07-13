-- ======================================================
-- PRD01 基础资料行业字段与行业字典
-- 业务表只保存 app_industry 的 code，中文名称由字典解析。
-- ======================================================

SET @industry_column_count = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'industry'
);
SET @industry_column_sql = IF(
    @industry_column_count = 0,
    'ALTER TABLE `app_user` ADD COLUMN `industry` VARCHAR(50) DEFAULT NULL COMMENT ''行业字典code：app_industry'' AFTER `identity`',
    'SELECT 1'
);
PREPARE industry_column_stmt FROM @industry_column_sql;
EXECUTE industry_column_stmt;
DEALLOCATE PREPARE industry_column_stmt;

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '行业', 'app_industry', 35, 'ENABLED', '用户所在行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_industry');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, 'IT/互联网', 'IT_INTERNET', 1, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'IT_INTERNET');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '金融', 'FINANCE', 2, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'FINANCE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '教育/科研', 'EDUCATION_RESEARCH', 3, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'EDUCATION_RESEARCH');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '医疗/健康', 'HEALTHCARE', 4, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'HEALTHCARE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '制造业', 'MANUFACTURING', 5, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'MANUFACTURING');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '房地产/建筑', 'REAL_ESTATE_CONSTRUCTION', 6, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'REAL_ESTATE_CONSTRUCTION');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '政府/事业单位', 'GOVERNMENT_PUBLIC', 7, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'GOVERNMENT_PUBLIC');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '文化/传媒', 'CULTURE_MEDIA', 8, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'CULTURE_MEDIA');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '零售/服务业', 'RETAIL_SERVICE', 9, 'ENABLED', '行业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'RETAIL_SERVICE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_industry', 0, '其他', 'OTHER', 99, 'ENABLED', '行业兜底', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_industry' AND dict_value = 'OTHER');
