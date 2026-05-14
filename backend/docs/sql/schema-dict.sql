-- ======================================================
-- 字典管理模块 DDL
-- 包含：字典类型表、字典数据表（支持多层级）
-- ======================================================

CREATE TABLE IF NOT EXISTS sys_dict_type (
    id BIGINT AUTO_INCREMENT COMMENT '字典主键',
    dict_name VARCHAR(100) NOT NULL COMMENT '字典名称',
    dict_type VARCHAR(100) NOT NULL COMMENT '字典类型（唯一编码），如 gender, member_level',
    dict_sort INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态：ENABLED=启用 / DISABLED=禁用',
    remark VARCHAR(500) DEFAULT '' COMMENT '备注',
    create_time DATETIME COMMENT '创建时间',
    update_time DATETIME COMMENT '更新时间',
    created_by BIGINT COMMENT '创建人',
    updated_by BIGINT COMMENT '更新人',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    UNIQUE KEY uk_dict_type (dict_type),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典类型表';

CREATE TABLE IF NOT EXISTS sys_dict_data (
    id BIGINT AUTO_INCREMENT COMMENT '字典数据主键',
    dict_type VARCHAR(100) NOT NULL COMMENT '所属字典类型编码',
    parent_id BIGINT DEFAULT 0 COMMENT '父级ID（0=顶级），支持多层级',
    dict_label VARCHAR(100) NOT NULL COMMENT '字典标签（显示文本）',
    dict_value VARCHAR(100) NOT NULL COMMENT '字典键值（存储值）',
    dict_sort INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态：ENABLED=启用 / DISABLED=禁用',
    remark VARCHAR(500) DEFAULT '' COMMENT '备注',
    create_time DATETIME COMMENT '创建时间',
    update_time DATETIME COMMENT '更新时间',
    created_by BIGINT COMMENT '创建人',
    updated_by BIGINT COMMENT '更新人',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_dict_type (dict_type),
    INDEX idx_parent_id (parent_id),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典数据表（支持多层级）';

-- 种子数据：常见字典类型
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark) VALUES
('性别', 'gender', 1, 'ENABLED', '用户性别标签'),
('会员等级', 'member_level', 2, 'ENABLED', '千寻会员等级'),
('跟进状态', 'follow_status', 3, 'ENABLED', '客户跟进状态');

-- 种子数据：字典数据值
-- 性别（两级：顶级为分类标签，子级为具体值）
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status) VALUES
('gender', 0, '男', 'male', 1, 'ENABLED'),
('gender', 0, '女', 'female', 2, 'ENABLED');

-- 会员等级（两级示例：等级下有子分类）
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status) VALUES
('member_level', 0, 'VIP1', 'vip1', 1, 'ENABLED'),
('member_level', 0, 'VIP2', 'vip2', 2, 'ENABLED'),
('member_level', 0, 'VIP3', 'vip3', 3, 'ENABLED'),
('member_level', 0, 'SVIP', 'svip', 4, 'ENABLED');

-- 跟进状态（多级示例）
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status) VALUES
('follow_status', 0, '新线索', 'new_lead', 1, 'ENABLED'),
('follow_status', 0, '跟进中', 'following', 2, 'ENABLED'),
('follow_status', 0, '已成交', 'deal_closed', 3, 'ENABLED'),
('follow_status', 0, '已放弃', 'abandoned', 4, 'ENABLED');
