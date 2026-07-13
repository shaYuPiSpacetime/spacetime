-- ======================================================
-- PRD01 基础资料完善接口持久化增量
-- 1. 公司名称进入 app_user 主资料。
-- 2. 婚姻状况与其他资料字典一致，业务表只保存 code。
-- ======================================================

SET @company_column_count = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user'
      AND column_name = 'company'
);
SET @company_column_sql = IF(
    @company_column_count = 0,
    'ALTER TABLE `app_user` ADD COLUMN `company` VARCHAR(100) DEFAULT NULL COMMENT ''公司名称'' AFTER `occupation`',
    'SELECT 1'
);
PREPARE company_column_stmt FROM @company_column_sql;
EXECUTE company_column_stmt;
DEALLOCATE PREPARE company_column_stmt;

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '婚姻状况', 'app_marital_status', 34, 'ENABLED', '用户资料婚姻状况', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_marital_status');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_marital_status', 0, '未婚', 'SINGLE', 1, 'ENABLED', '婚姻状况', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_marital_status' AND dict_value = 'SINGLE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_marital_status', 0, '离异', 'DIVORCED', 2, 'ENABLED', '婚姻状况', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_marital_status' AND dict_value = 'DIVORCED');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_marital_status', 0, '丧偶', 'WIDOWED', 3, 'ENABLED', '婚姻状况', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_marital_status' AND dict_value = 'WIDOWED');

UPDATE app_user SET marital_status = CASE
    WHEN marital_status IN ('SINGLE', 'DIVORCED', 'WIDOWED') THEN marital_status
    WHEN marital_status IN ('未婚', '单身') THEN 'SINGLE'
    WHEN marital_status IN ('离异', '离婚') THEN 'DIVORCED'
    WHEN marital_status = '丧偶' THEN 'WIDOWED'
    ELSE NULL
END WHERE marital_status IS NOT NULL;
