-- ======================================================
-- PRD01 用户资料四类业务字典及存量数据 code 化
-- 业务表只保存 code，中文名称仅保存在 sys_dict_data.dict_label
-- ======================================================

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '用户身份', 'app_identity', 30, 'ENABLED', '用户资料身份类型', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_identity');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '最高学历', 'app_education_level', 31, 'ENABLED', '用户最高学历', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_education_level');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '职业', 'app_occupation', 32, 'ENABLED', '用户职业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_occupation');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '年收入', 'app_annual_income', 33, 'ENABLED', '用户年收入区间', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_annual_income');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_identity', 0, '在校生', 'STUDENT', 1, 'ENABLED', '身份', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_identity' AND dict_value = 'STUDENT');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_identity', 0, '职场人', 'WORKER', 2, 'ENABLED', '身份', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_identity' AND dict_value = 'WORKER');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_level', 0, '博士', 'DOCTOR', 1, 'ENABLED', '学历', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_level' AND dict_value = 'DOCTOR');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_level', 0, '硕士', 'MASTER', 2, 'ENABLED', '学历', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_level' AND dict_value = 'MASTER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_level', 0, '本科', 'BACHELOR', 3, 'ENABLED', '学历', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_level' AND dict_value = 'BACHELOR');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_level', 0, '大专', 'COLLEGE', 4, 'ENABLED', '学历', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_level' AND dict_value = 'COLLEGE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_level', 0, '高中/中专', 'HIGH_SCHOOL', 5, 'ENABLED', '学历', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_level' AND dict_value = 'HIGH_SCHOOL');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_level', 0, '初中及以下', 'JUNIOR_OR_BELOW', 6, 'ENABLED', '学历', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_level' AND dict_value = 'JUNIOR_OR_BELOW');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_level', 0, '其他', 'OTHER', 99, 'ENABLED', '学历兜底', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_level' AND dict_value = 'OTHER');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_occupation', 0, '产品经理', 'PRODUCT_MANAGER', 1, 'ENABLED', '职业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_occupation' AND dict_value = 'PRODUCT_MANAGER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_occupation', 0, '工程师', 'ENGINEER', 2, 'ENABLED', '职业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_occupation' AND dict_value = 'ENGINEER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_occupation', 0, '教师', 'TEACHER', 3, 'ENABLED', '职业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_occupation' AND dict_value = 'TEACHER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_occupation', 0, '设计师', 'DESIGNER', 4, 'ENABLED', '职业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_occupation' AND dict_value = 'DESIGNER');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_occupation', 0, '医生', 'DOCTOR', 5, 'ENABLED', '职业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_occupation' AND dict_value = 'DOCTOR');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_occupation', 0, '金融从业者', 'FINANCE', 6, 'ENABLED', '职业', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_occupation' AND dict_value = 'FINANCE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_occupation', 0, '其他', 'OTHER', 99, 'ENABLED', '职业兜底', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_occupation' AND dict_value = 'OTHER');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_annual_income', 0, '10万以下', 'BELOW_100K', 1, 'ENABLED', '年收入', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_annual_income' AND dict_value = 'BELOW_100K');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_annual_income', 0, '10-15万', 'FROM_100K_TO_150K', 2, 'ENABLED', '年收入', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_annual_income' AND dict_value = 'FROM_100K_TO_150K');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_annual_income', 0, '15-30万', 'FROM_150K_TO_300K', 3, 'ENABLED', '年收入', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_annual_income' AND dict_value = 'FROM_150K_TO_300K');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_annual_income', 0, '30-50万', 'FROM_300K_TO_500K', 4, 'ENABLED', '年收入', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_annual_income' AND dict_value = 'FROM_300K_TO_500K');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_annual_income', 0, '50万以上', 'ABOVE_500K', 5, 'ENABLED', '年收入', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_annual_income' AND dict_value = 'ABOVE_500K');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_annual_income', 0, '其他', 'OTHER', 99, 'ENABLED', '年收入兜底', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_annual_income' AND dict_value = 'OTHER');

-- 存量中文及旧编码统一转换为字典 code。
UPDATE app_user SET identity = CASE
    WHEN identity IN ('STUDENT', 'WORKER') THEN identity
    WHEN identity IN ('在校生', '在校学生', '学生', '继续深造') THEN 'STUDENT'
    WHEN identity IN ('职场人', 'PROFESSIONAL', '创业者', '自由职业') THEN 'WORKER'
    ELSE NULL
END WHERE identity IS NOT NULL;

UPDATE app_user SET education_level = CASE
    WHEN education_level IN ('DOCTOR', 'MASTER', 'BACHELOR', 'COLLEGE', 'HIGH_SCHOOL', 'JUNIOR_OR_BELOW', 'OTHER') THEN education_level
    WHEN education_level = '博士' THEN 'DOCTOR'
    WHEN education_level = '硕士' THEN 'MASTER'
    WHEN education_level = '本科' THEN 'BACHELOR'
    WHEN education_level IN ('大专', '专科') THEN 'COLLEGE'
    WHEN education_level IN ('高中', '中专', '高中/中专') THEN 'HIGH_SCHOOL'
    WHEN education_level IN ('初中', '初中及以下') THEN 'JUNIOR_OR_BELOW'
    ELSE 'OTHER'
END WHERE education_level IS NOT NULL;

UPDATE app_user SET occupation = CASE
    WHEN occupation IN ('PRODUCT_MANAGER', 'ENGINEER', 'TEACHER', 'DESIGNER', 'DOCTOR', 'FINANCE', 'OTHER') THEN occupation
    WHEN occupation = '产品经理' THEN 'PRODUCT_MANAGER'
    WHEN occupation = '工程师' THEN 'ENGINEER'
    WHEN occupation = '教师' THEN 'TEACHER'
    WHEN occupation = '设计师' THEN 'DESIGNER'
    WHEN occupation = '医生' THEN 'DOCTOR'
    WHEN occupation = '金融从业者' THEN 'FINANCE'
    ELSE 'OTHER'
END WHERE occupation IS NOT NULL;

UPDATE app_user SET annual_income = CASE
    WHEN annual_income IN ('BELOW_100K', 'FROM_100K_TO_150K', 'FROM_150K_TO_300K', 'FROM_300K_TO_500K', 'ABOVE_500K', 'OTHER') THEN annual_income
    WHEN annual_income IN ('10W以下', '10万以下') THEN 'BELOW_100K'
    WHEN annual_income IN ('10-15W', '10-15万') THEN 'FROM_100K_TO_150K'
    WHEN annual_income IN ('15-30W', '15-30万') THEN 'FROM_150K_TO_300K'
    WHEN annual_income IN ('30-50W', '30-50万') THEN 'FROM_300K_TO_500K'
    WHEN annual_income IN ('50W以上', '50万以上') THEN 'ABOVE_500K'
    ELSE 'OTHER'
END WHERE annual_income IS NOT NULL;
