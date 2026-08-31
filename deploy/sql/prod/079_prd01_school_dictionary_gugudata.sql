-- PRD-01：中国大陆高校本地字典及用户学校稳定编码。
CREATE TABLE IF NOT EXISTS `school_dictionary` (
    `id` BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    `provider_uuid` VARCHAR(64) NOT NULL COMMENT '第三方唯一标识',
    `school_code` VARCHAR(64) NULL COMMENT '业务稳定编码',
    `school_name` VARCHAR(128) NOT NULL COMMENT '学校全称',
    `short_name` VARCHAR(128) NULL COMMENT '简称',
    `old_name` VARCHAR(255) NULL COMMENT '历史名称/别名',
    `province` VARCHAR(64) NULL COMMENT '所在省份',
    `city` VARCHAR(64) NULL COMMENT '所在城市',
    `district` VARCHAR(64) NULL COMMENT '所在区县',
    `college_type` VARCHAR(64) NULL COMMENT '院校类型',
    `category` VARCHAR(64) NULL COMMENT '院校类别',
    `education_level` VARCHAR(64) NULL COMMENT '办学层次',
    `school_property` VARCHAR(64) NULL COMMENT '院校性质',
    `is_985` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否985院校：0否，1是',
    `is_211` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否211院校：0否，1是',
    `is_dual_class` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否双一流院校：0否，1是',
    `source` VARCHAR(32) NOT NULL DEFAULT 'GUGUDATA' COMMENT '数据来源',
    `provider_updated_time` DATETIME NULL COMMENT '第三方数据更新时间',
    `status` VARCHAR(16) NOT NULL DEFAULT 'ENABLED' COMMENT '状态：ENABLED启用，DISABLED停用',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID',
    `updated_by` BIGINT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标识：0未删除，1已删除',
    UNIQUE KEY `uk_school_provider_uuid` (`provider_uuid`),
    KEY `idx_school_name` (`school_name`),
    KEY `idx_school_short_name` (`short_name`),
    KEY `idx_school_area` (`province`, `city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='中国大陆高校本地字典';

-- CREATE TABLE IF NOT EXISTS 不会更新存量字段注释，显式 MODIFY 确保存量表也被修复。
ALTER TABLE `school_dictionary`
    MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    MODIFY COLUMN `provider_uuid` VARCHAR(64) NOT NULL COMMENT '第三方唯一标识',
    MODIFY COLUMN `school_code` VARCHAR(64) NULL COMMENT '业务稳定编码',
    MODIFY COLUMN `school_name` VARCHAR(128) NOT NULL COMMENT '学校全称',
    MODIFY COLUMN `short_name` VARCHAR(128) NULL COMMENT '学校简称',
    MODIFY COLUMN `old_name` VARCHAR(255) NULL COMMENT '历史名称/别名',
    MODIFY COLUMN `province` VARCHAR(64) NULL COMMENT '所在省份',
    MODIFY COLUMN `city` VARCHAR(64) NULL COMMENT '所在城市',
    MODIFY COLUMN `district` VARCHAR(64) NULL COMMENT '所在区县',
    MODIFY COLUMN `college_type` VARCHAR(64) NULL COMMENT '院校类型',
    MODIFY COLUMN `category` VARCHAR(64) NULL COMMENT '院校类别',
    MODIFY COLUMN `education_level` VARCHAR(64) NULL COMMENT '办学层次',
    MODIFY COLUMN `school_property` VARCHAR(64) NULL COMMENT '院校性质',
    MODIFY COLUMN `is_985` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否985院校：0否，1是',
    MODIFY COLUMN `is_211` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否211院校：0否，1是',
    MODIFY COLUMN `is_dual_class` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否双一流院校：0否，1是',
    MODIFY COLUMN `source` VARCHAR(32) NOT NULL DEFAULT 'GUGUDATA' COMMENT '数据来源',
    MODIFY COLUMN `provider_updated_time` DATETIME NULL COMMENT '第三方数据更新时间',
    MODIFY COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'ENABLED' COMMENT '状态：ENABLED启用，DISABLED停用',
    MODIFY COLUMN `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    MODIFY COLUMN `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    MODIFY COLUMN `created_by` BIGINT NULL COMMENT '创建人ID',
    MODIFY COLUMN `updated_by` BIGINT NULL COMMENT '更新人ID',
    MODIFY COLUMN `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标识：0未删除，1已删除';

DROP PROCEDURE IF EXISTS prd01_add_school_dictionary_codes;
DELIMITER $$
CREATE PROCEDURE prd01_add_school_dictionary_codes()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user' AND COLUMN_NAME = 'school_code'
    ) THEN
        ALTER TABLE `app_user` ADD COLUMN `school_code` VARCHAR(64) NULL
            COMMENT '学校字典稳定编码' AFTER `school`;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user_audit_record' AND COLUMN_NAME = 'school_code'
    ) THEN
        ALTER TABLE `app_user_audit_record` ADD COLUMN `school_code` VARCHAR(64) NULL
            COMMENT '学校字典稳定编码快照' AFTER `school_name`;
    END IF;
END $$
DELIMITER ;
CALL prd01_add_school_dictionary_codes();
DROP PROCEDURE IF EXISTS prd01_add_school_dictionary_codes;
