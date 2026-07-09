-- ======================================================
-- 小程序登录、资料认证、商业化支付运行必需字段安全迁移
-- 说明：
-- 1. 兼容已存在旧表但缺少字段的环境。
-- 2. 可重复执行；只补缺失表、缺失字段、缺失索引。
-- 3. 覆盖微信登录 openid/unionid/手机号、资料认证、VIP/千寻币支付链路实体字段。
-- ======================================================

CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    openid VARCHAR(128) DEFAULT NULL COMMENT '小程序 openid',
    unionid VARCHAR(128) DEFAULT NULL COMMENT '微信 unionid',
    phone VARCHAR(30) DEFAULT NULL COMMENT '微信授权手机号',
    phone_hash VARCHAR(64) DEFAULT NULL COMMENT '手机号 SHA-256 哈希',
    register_source VARCHAR(30) DEFAULT 'WECHAT' COMMENT '注册来源',
    register_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    last_login_time DATETIME DEFAULT NULL COMMENT '最近登录时间',
    account_status VARCHAR(20) DEFAULT 'NORMAL' COMMENT '账号状态',
    first_login_completed TINYINT DEFAULT 0 COMMENT '是否完成首登资料初始化',
    avatar VARCHAR(500) DEFAULT NULL COMMENT '主头像 URL',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    gender VARCHAR(10) DEFAULT NULL COMMENT '性别',
    birthday DATE DEFAULT NULL COMMENT '出生日期',
    age INT DEFAULT NULL COMMENT '年龄',
    height INT DEFAULT NULL COMMENT '身高 cm',
    weight INT DEFAULT NULL COMMENT '体重 kg',
    identity VARCHAR(30) DEFAULT NULL COMMENT '身份：职场人/在校生等',
    occupation VARCHAR(100) DEFAULT NULL COMMENT '职业',
    annual_income VARCHAR(50) DEFAULT NULL COMMENT '年收入区间',
    location_province VARCHAR(50) DEFAULT NULL COMMENT '居住省',
    location_city VARCHAR(50) DEFAULT NULL COMMENT '居住市',
    location_district VARCHAR(50) DEFAULT NULL COMMENT '居住区县',
    hometown_province VARCHAR(50) DEFAULT NULL COMMENT '家乡省',
    hometown_city VARCHAR(50) DEFAULT NULL COMMENT '家乡市',
    hometown_district VARCHAR(50) DEFAULT NULL COMMENT '家乡区县',
    dating_goal VARCHAR(30) DEFAULT NULL COMMENT '脱单目标',
    marital_status VARCHAR(30) DEFAULT NULL COMMENT '婚姻状态',
    emotional_status VARCHAR(30) DEFAULT NULL COMMENT '感情状态',
    children_plan VARCHAR(50) DEFAULT NULL COMMENT '生育计划',
    want_child VARCHAR(50) DEFAULT NULL COMMENT '是否想要孩子',
    school VARCHAR(100) DEFAULT NULL COMMENT '学校全称',
    major VARCHAR(100) DEFAULT NULL COMMENT '专业',
    education_level VARCHAR(30) DEFAULT NULL COMMENT '最高学历',
    about_me VARCHAR(500) DEFAULT NULL COMMENT '关于我',
    hope_they_know VARCHAR(500) DEFAULT NULL COMMENT '希望 TA 了解',
    voice_intro_url VARCHAR(500) DEFAULT NULL COMMENT '语音介绍 URL',
    voice_intro_duration INT DEFAULT NULL COMMENT '语音时长秒',
    voice_intro_audit_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED' COMMENT '语音介绍审核状态',
    voice_intro_record_id BIGINT DEFAULT NULL COMMENT '当前有效或最新语音介绍记录 ID',
    voice_intro_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '最新语音介绍驳回原因',
    tags JSON DEFAULT NULL COMMENT '标签列表 JSON',
    photos JSON DEFAULT NULL COMMENT '相册 JSON',
    profile_bg_image VARCHAR(500) DEFAULT NULL COMMENT '资料页背景图',
    mbti_type VARCHAR(10) DEFAULT NULL COMMENT 'MBTI 类型',
    zodiac VARCHAR(10) DEFAULT NULL COMMENT '星座',
    profile_score INT DEFAULT 0 COMMENT '资料完整度分',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    UNIQUE KEY uk_app_user_openid (openid),
    UNIQUE KEY uk_app_user_phone_hash_deleted (phone_hash, deleted),
    INDEX idx_app_user_account_status (account_status),
    INDEX idx_app_user_first_login (first_login_completed),
    INDEX idx_app_user_phone_hash (phone_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户主表';

CREATE TABLE IF NOT EXISTS app_user_verification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    real_name_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '实名认证状态',
    real_name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
    id_card VARCHAR(20) DEFAULT NULL COMMENT '身份证号',
    bound_phone VARCHAR(20) DEFAULT NULL COMMENT '实名认证绑定手机号明文',
    real_name_hash CHAR(64) DEFAULT NULL COMMENT '真实姓名规范化后 SHA-256',
    id_card_hash CHAR(64) DEFAULT NULL COMMENT '身份证号规范化后 SHA-256',
    real_name_submit_time DATETIME DEFAULT NULL COMMENT '实名认证提交时间',
    real_name_result_time DATETIME DEFAULT NULL COMMENT '实名认证结果时间',
    real_name_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '实名驳回原因',
    real_name_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '实名审核来源：MACHINE/MANUAL',
    real_name_provider_task_id BIGINT DEFAULT NULL COMMENT '实名 Provider 任务 ID',
    education_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '学历认证状态',
    education_method VARCHAR(30) DEFAULT NULL COMMENT '认证方式',
    education_submit_time DATETIME DEFAULT NULL COMMENT '学历认证提交时间',
    education_result_time DATETIME DEFAULT NULL COMMENT '学历认证结果时间',
    education_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '学历驳回原因',
    education_audit_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '学历审核来源：MACHINE/MANUAL',
    education_provider_task_id BIGINT DEFAULT NULL COMMENT '学历 Provider 任务 ID',
    avatar_verify_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '头像认证状态',
    avatar_verify_submit_time DATETIME DEFAULT NULL COMMENT '头像认证提交时间',
    avatar_verify_result_time DATETIME DEFAULT NULL COMMENT '头像认证结果时间',
    avatar_verify_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '头像驳回原因',
    avatar_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '头像审核来源：MACHINE/MANUAL',
    avatar_provider_task_id BIGINT DEFAULT NULL COMMENT '头像 Provider 任务 ID',
    profile_photo_audit_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED' COMMENT '资料照片审核状态',
    profile_photo_submit_time DATETIME DEFAULT NULL COMMENT '照片审核提交时间',
    profile_photo_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '照片驳回原因',
    profile_photo_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '资料照片审核来源：MACHINE/MANUAL',
    open_text_audit_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED' COMMENT '文字审核状态',
    open_text_submit_time DATETIME DEFAULT NULL COMMENT '文字审核提交时间',
    open_text_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '文字驳回原因',
    open_text_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '开放性文字审核来源：MACHINE/MANUAL',
    verify_level INT DEFAULT 0 COMMENT '已完成认证数量',
    core_access_status VARCHAR(30) NOT NULL DEFAULT 'CORE_BLOCKED' COMMENT '核心准入状态',
    core_access_reason VARCHAR(200) DEFAULT NULL COMMENT '核心准入阻断原因',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    UNIQUE KEY uk_app_user_verification_user_id (user_id),
    INDEX idx_app_user_verification_id_card_hash (id_card_hash),
    INDEX idx_app_user_verification_core_access (core_access_status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户认证与审核状态表';

CREATE TABLE IF NOT EXISTS app_user_profile_media (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    media_type VARCHAR(30) NOT NULL COMMENT '媒体类型',
    media_url VARCHAR(500) NOT NULL COMMENT '媒体 URL',
    thumb_url VARCHAR(500) DEFAULT NULL COMMENT '缩略图 URL',
    sort_order INT DEFAULT 0 COMMENT '排序',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT '审核状态',
    audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '审核来源：MACHINE/MANUAL',
    provider_task_id BIGINT DEFAULT NULL COMMENT 'Provider 任务 ID',
    machine_signal_json JSON DEFAULT NULL COMMENT '机审信号',
    reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
    current_effective TINYINT NOT NULL DEFAULT 0 COMMENT '是否当前生效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_profile_media_user_type (user_id, media_type, deleted),
    INDEX idx_profile_media_status_source (audit_status, audit_source, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资料媒体审核表';

CREATE TABLE IF NOT EXISTS app_user_open_text_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    field_name VARCHAR(50) NOT NULL COMMENT 'ABOUT_ME/HOPE_THEY_KNOW/PROFILE_QA',
    content_text VARCHAR(1000) NOT NULL COMMENT '开放性文字明文',
    content_hash CHAR(64) DEFAULT NULL COMMENT '内容 SHA-256',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT '审核状态',
    audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '审核来源：MACHINE/MANUAL',
    provider_task_id BIGINT DEFAULT NULL COMMENT 'Provider 任务 ID',
    machine_signal_json JSON DEFAULT NULL COMMENT '机审信号',
    reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
    submit_time DATETIME DEFAULT NULL COMMENT '提交时间',
    audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
    current_effective TINYINT NOT NULL DEFAULT 0 COMMENT '是否当前生效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_open_text_user_field (user_id, field_name, deleted),
    INDEX idx_open_text_status_source (audit_status, audit_source, deleted),
    INDEX idx_open_text_content_hash (content_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户开放性文字审核表';

CREATE TABLE IF NOT EXISTS app_user_voice_intro_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    voice_url VARCHAR(500) NOT NULL COMMENT '语音介绍音频 URL',
    duration INT NOT NULL COMMENT '语音时长秒',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'VOICE_PENDING' COMMENT '语音审核状态',
    provider_task_id BIGINT DEFAULT NULL COMMENT '音频安全 Provider 任务 ID',
    machine_signal_json JSON DEFAULT NULL COMMENT '机审信号',
    reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
    submit_time DATETIME DEFAULT NULL COMMENT '提交时间',
    audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
    current_effective TINYINT NOT NULL DEFAULT 0 COMMENT '是否当前有效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_voice_intro_user_time (user_id, submit_time),
    INDEX idx_voice_intro_status_time (audit_status, submit_time),
    INDEX idx_voice_intro_user_effective (user_id, current_effective, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户语音介绍审核历史表';

CREATE TABLE IF NOT EXISTS external_provider_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider_type VARCHAR(50) NOT NULL COMMENT 'Provider 类型',
    provider_code VARCHAR(50) DEFAULT NULL COMMENT 'Provider 实现编码',
    user_id BIGINT DEFAULT NULL COMMENT '用户 ID',
    request_payload_json JSON DEFAULT NULL COMMENT '请求 JSON',
    response_payload_json JSON DEFAULT NULL COMMENT '响应 JSON',
    task_status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS' COMMENT '任务状态',
    mocked TINYINT NOT NULL DEFAULT 0 COMMENT '是否 mock Provider 返回',
    error_message VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_provider_task_type_status (provider_type, task_status, deleted),
    INDEX idx_provider_task_user (user_id, provider_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='外部 Provider 调用留痕表';

CREATE TABLE IF NOT EXISTS app_vip_benefit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    benefit_code VARCHAR(50) NOT NULL COMMENT '权益编码',
    benefit_name VARCHAR(100) DEFAULT NULL COMMENT '权益名称',
    benefit_type VARCHAR(30) DEFAULT NULL COMMENT '权益类型',
    benefit_desc VARCHAR(500) DEFAULT NULL COMMENT '权益描述',
    mobile_icon VARCHAR(100) DEFAULT NULL COMMENT '移动端图标',
    benefit_value INT DEFAULT NULL COMMENT '权益数值',
    fixed_flag TINYINT DEFAULT 0 COMMENT '是否固定权益: 0=否, 1=是',
    display_order INT DEFAULT 0 COMMENT '展示排序',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_benefit_code (benefit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP权益配置表';

CREATE TABLE IF NOT EXISTS app_vip_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    package_type VARCHAR(30) DEFAULT 'normal' COMMENT '套餐类型: normal/limited',
    subscription_type VARCHAR(30) DEFAULT 'once' COMMENT '订阅类型: once/month/quarter/year',
    price DECIMAL(10,2) DEFAULT 0 COMMENT '售价',
    origin_price DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    duration_days INT DEFAULT 0 COMMENT '有效天数',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
    wechat_product_id VARCHAR(100) DEFAULT NULL COMMENT '微信商品 ID',
    agreement_config VARCHAR(500) DEFAULT NULL COMMENT '协议配置',
    pay_channel_reserve VARCHAR(500) DEFAULT NULL COMMENT '支付渠道预留字段',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP套餐配置表';

CREATE TABLE IF NOT EXISTS app_coin_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    amount DECIMAL(10,2) DEFAULT 0 COMMENT '售价',
    origin_amount DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    discount_amount DECIMAL(10,2) DEFAULT NULL COMMENT '优惠价',
    coin_count INT DEFAULT 0 COMMENT '千寻币数量',
    bonus_coin_count INT DEFAULT 0 COMMENT '赠送千寻币数量',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
    mobile_tag VARCHAR(50) DEFAULT NULL COMMENT '移动端展示标签',
    package_desc VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='千寻币套餐配置表';

CREATE TABLE IF NOT EXISTS app_user_asset (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    vip_status VARCHAR(20) DEFAULT 'inactive' COMMENT 'VIP 状态',
    vip_expire_time DATETIME DEFAULT NULL COMMENT 'VIP 到期时间',
    coin_balance INT DEFAULT 0 COMMENT '千寻币余额',
    today_free_whisper_remain INT DEFAULT 0 COMMENT '今日剩余免费悄悄话次数',
    total_recharge DECIMAL(10,2) DEFAULT 0 COMMENT '累计充值金额',
    last_consume_time DATETIME DEFAULT NULL COMMENT '最后消费时间',
    last_purchase_time DATETIME DEFAULT NULL COMMENT '最后购买时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资产表';

CREATE TABLE IF NOT EXISTS app_trade_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(64) NOT NULL COMMENT '订单编号',
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    order_type VARCHAR(20) DEFAULT NULL COMMENT '订单类型',
    package_id BIGINT DEFAULT NULL COMMENT '套餐 ID',
    package_name VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
    pay_amount DECIMAL(10,2) DEFAULT 0 COMMENT '实付金额',
    pay_channel VARCHAR(30) DEFAULT 'mock' COMMENT '支付渠道',
    channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT '渠道交易单号',
    prepay_id VARCHAR(100) DEFAULT NULL COMMENT '微信预支付交易会话标识',
    notify_summary VARCHAR(1000) DEFAULT NULL COMMENT '支付回调原始摘要',
    order_status VARCHAR(20) DEFAULT 'unpaid' COMMENT '订单状态',
    success_time DATETIME DEFAULT NULL COMMENT '支付成功时间',
    expire_time DATETIME DEFAULT NULL COMMENT '订单过期时间',
    refund_time DATETIME DEFAULT NULL COMMENT '退款时间',
    refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_user_type_status (user_id, order_type, order_status),
    INDEX idx_status_time (order_status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易订单表';

CREATE TABLE IF NOT EXISTS app_user_coin_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flow_no VARCHAR(64) NOT NULL COMMENT '流水号',
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    flow_type VARCHAR(20) DEFAULT NULL COMMENT '流水类型',
    change_amount INT DEFAULT 0 COMMENT '变动数量',
    balance_before INT DEFAULT 0 COMMENT '变动前余额',
    balance_after INT DEFAULT 0 COMMENT '变动后余额',
    biz_scene VARCHAR(50) DEFAULT NULL COMMENT '业务场景',
    biz_desc VARCHAR(200) DEFAULT NULL COMMENT '业务描述',
    ref_id BIGINT DEFAULT NULL COMMENT '关联业务 ID',
    ref_type VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_flow_no (flow_no),
    INDEX idx_user_time (user_id, create_time),
    INDEX idx_ref (ref_id, ref_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='千寻币流水表';

CREATE TABLE IF NOT EXISTS app_payment_notify_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pay_channel VARCHAR(30) DEFAULT NULL COMMENT '支付渠道',
    order_no VARCHAR(64) DEFAULT NULL COMMENT '订单编号',
    channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT '渠道交易单号',
    notify_type VARCHAR(50) DEFAULT NULL COMMENT '回调类型',
    notify_payload TEXT DEFAULT NULL COMMENT '回调原文',
    process_status VARCHAR(30) DEFAULT NULL COMMENT '处理状态',
    process_message VARCHAR(1000) DEFAULT NULL COMMENT '处理结果摘要',
    notify_time DATETIME DEFAULT NULL COMMENT '通知时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_order_channel (order_no, pay_channel),
    INDEX idx_notify_time (notify_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付回调日志预留表';

DROP PROCEDURE IF EXISTS spacetime_add_column_if_missing;
DROP PROCEDURE IF EXISTS spacetime_add_index_if_missing;

DELIMITER //

CREATE PROCEDURE spacetime_add_column_if_missing(
    IN p_table_name VARCHAR(128),
    IN p_column_name VARCHAR(128),
    IN p_column_definition TEXT
)
BEGIN
    IF (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND COLUMN_NAME = p_column_name
    ) = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE ', p_table_name, ' ADD COLUMN ', p_column_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

CREATE PROCEDURE spacetime_add_index_if_missing(
    IN p_table_name VARCHAR(128),
    IN p_index_name VARCHAR(128),
    IN p_index_definition TEXT
)
BEGIN
    IF (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND INDEX_NAME = p_index_name
    ) = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE ', p_table_name, ' ADD ', p_index_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

CALL spacetime_add_column_if_missing('app_user', 'openid', 'openid VARCHAR(128) DEFAULT NULL COMMENT ''小程序 openid''');
CALL spacetime_add_column_if_missing('app_user', 'unionid', 'unionid VARCHAR(128) DEFAULT NULL COMMENT ''微信 unionid''');
CALL spacetime_add_column_if_missing('app_user', 'phone', 'phone VARCHAR(30) DEFAULT NULL COMMENT ''微信授权手机号''');
CALL spacetime_add_column_if_missing('app_user', 'phone_hash', 'phone_hash VARCHAR(64) DEFAULT NULL COMMENT ''手机号 SHA-256 哈希''');
CALL spacetime_add_column_if_missing('app_user', 'register_source', 'register_source VARCHAR(30) DEFAULT ''WECHAT'' COMMENT ''注册来源''');
CALL spacetime_add_column_if_missing('app_user', 'register_time', 'register_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT ''注册时间''');
CALL spacetime_add_column_if_missing('app_user', 'last_login_time', 'last_login_time DATETIME DEFAULT NULL COMMENT ''最近登录时间''');
CALL spacetime_add_column_if_missing('app_user', 'account_status', 'account_status VARCHAR(20) DEFAULT ''NORMAL'' COMMENT ''账号状态''');
CALL spacetime_add_column_if_missing('app_user', 'first_login_completed', 'first_login_completed TINYINT DEFAULT 0 COMMENT ''是否完成首登资料初始化''');
CALL spacetime_add_column_if_missing('app_user', 'avatar', 'avatar VARCHAR(500) DEFAULT NULL COMMENT ''主头像 URL''');
CALL spacetime_add_column_if_missing('app_user', 'nickname', 'nickname VARCHAR(50) DEFAULT NULL COMMENT ''昵称''');
CALL spacetime_add_column_if_missing('app_user', 'gender', 'gender VARCHAR(10) DEFAULT NULL COMMENT ''性别''');
CALL spacetime_add_column_if_missing('app_user', 'birthday', 'birthday DATE DEFAULT NULL COMMENT ''出生日期''');
CALL spacetime_add_column_if_missing('app_user', 'age', 'age INT DEFAULT NULL COMMENT ''年龄''');
CALL spacetime_add_column_if_missing('app_user', 'height', 'height INT DEFAULT NULL COMMENT ''身高 cm''');
CALL spacetime_add_column_if_missing('app_user', 'weight', 'weight INT DEFAULT NULL COMMENT ''体重 kg''');
CALL spacetime_add_column_if_missing('app_user', 'identity', 'identity VARCHAR(30) DEFAULT NULL COMMENT ''身份：职场人/在校生等''');
CALL spacetime_add_column_if_missing('app_user', 'occupation', 'occupation VARCHAR(100) DEFAULT NULL COMMENT ''职业''');
CALL spacetime_add_column_if_missing('app_user', 'annual_income', 'annual_income VARCHAR(50) DEFAULT NULL COMMENT ''年收入区间''');
CALL spacetime_add_column_if_missing('app_user', 'location_province', 'location_province VARCHAR(50) DEFAULT NULL COMMENT ''居住省''');
CALL spacetime_add_column_if_missing('app_user', 'location_city', 'location_city VARCHAR(50) DEFAULT NULL COMMENT ''居住市''');
CALL spacetime_add_column_if_missing('app_user', 'location_district', 'location_district VARCHAR(50) DEFAULT NULL COMMENT ''居住区县''');
CALL spacetime_add_column_if_missing('app_user', 'hometown_province', 'hometown_province VARCHAR(50) DEFAULT NULL COMMENT ''家乡省''');
CALL spacetime_add_column_if_missing('app_user', 'hometown_city', 'hometown_city VARCHAR(50) DEFAULT NULL COMMENT ''家乡市''');
CALL spacetime_add_column_if_missing('app_user', 'hometown_district', 'hometown_district VARCHAR(50) DEFAULT NULL COMMENT ''家乡区县''');
CALL spacetime_add_column_if_missing('app_user', 'dating_goal', 'dating_goal VARCHAR(30) DEFAULT NULL COMMENT ''脱单目标''');
CALL spacetime_add_column_if_missing('app_user', 'marital_status', 'marital_status VARCHAR(30) DEFAULT NULL COMMENT ''婚姻状态''');
CALL spacetime_add_column_if_missing('app_user', 'emotional_status', 'emotional_status VARCHAR(30) DEFAULT NULL COMMENT ''感情状态''');
CALL spacetime_add_column_if_missing('app_user', 'children_plan', 'children_plan VARCHAR(50) DEFAULT NULL COMMENT ''生育计划''');
CALL spacetime_add_column_if_missing('app_user', 'want_child', 'want_child VARCHAR(50) DEFAULT NULL COMMENT ''是否想要孩子''');
CALL spacetime_add_column_if_missing('app_user', 'school', 'school VARCHAR(100) DEFAULT NULL COMMENT ''学校全称''');
CALL spacetime_add_column_if_missing('app_user', 'major', 'major VARCHAR(100) DEFAULT NULL COMMENT ''专业''');
CALL spacetime_add_column_if_missing('app_user', 'education_level', 'education_level VARCHAR(30) DEFAULT NULL COMMENT ''最高学历''');
CALL spacetime_add_column_if_missing('app_user', 'about_me', 'about_me VARCHAR(500) DEFAULT NULL COMMENT ''关于我''');
CALL spacetime_add_column_if_missing('app_user', 'hope_they_know', 'hope_they_know VARCHAR(500) DEFAULT NULL COMMENT ''希望 TA 了解''');
CALL spacetime_add_column_if_missing('app_user', 'voice_intro_url', 'voice_intro_url VARCHAR(500) DEFAULT NULL COMMENT ''语音介绍 URL''');
CALL spacetime_add_column_if_missing('app_user', 'voice_intro_duration', 'voice_intro_duration INT DEFAULT NULL COMMENT ''语音时长秒''');
CALL spacetime_add_column_if_missing('app_user', 'voice_intro_audit_status', 'voice_intro_audit_status VARCHAR(30) NOT NULL DEFAULT ''NOT_SUBMITTED'' COMMENT ''语音介绍审核状态''');
CALL spacetime_add_column_if_missing('app_user', 'voice_intro_record_id', 'voice_intro_record_id BIGINT DEFAULT NULL COMMENT ''当前有效或最新语音介绍记录 ID''');
CALL spacetime_add_column_if_missing('app_user', 'voice_intro_reject_reason', 'voice_intro_reject_reason VARCHAR(200) DEFAULT NULL COMMENT ''最新语音介绍驳回原因''');
CALL spacetime_add_column_if_missing('app_user', 'tags', 'tags JSON DEFAULT NULL COMMENT ''标签列表 JSON''');
CALL spacetime_add_column_if_missing('app_user', 'photos', 'photos JSON DEFAULT NULL COMMENT ''相册 JSON''');
CALL spacetime_add_column_if_missing('app_user', 'profile_bg_image', 'profile_bg_image VARCHAR(500) DEFAULT NULL COMMENT ''资料页背景图''');
CALL spacetime_add_column_if_missing('app_user', 'mbti_type', 'mbti_type VARCHAR(10) DEFAULT NULL COMMENT ''MBTI 类型''');
CALL spacetime_add_column_if_missing('app_user', 'zodiac', 'zodiac VARCHAR(10) DEFAULT NULL COMMENT ''星座''');
CALL spacetime_add_column_if_missing('app_user', 'profile_score', 'profile_score INT DEFAULT 0 COMMENT ''资料完整度分''');
CALL spacetime_add_column_if_missing('app_user', 'create_time', 'create_time DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL spacetime_add_column_if_missing('app_user', 'update_time', 'update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL spacetime_add_column_if_missing('app_user', 'created_by', 'created_by BIGINT DEFAULT NULL');
CALL spacetime_add_column_if_missing('app_user', 'updated_by', 'updated_by BIGINT DEFAULT NULL');
CALL spacetime_add_column_if_missing('app_user', 'deleted', 'deleted TINYINT DEFAULT 0 COMMENT ''逻辑删除：0=正常，1=已删除''');
CALL spacetime_add_index_if_missing('app_user', 'uk_app_user_openid', 'UNIQUE KEY uk_app_user_openid (openid)');
CALL spacetime_add_index_if_missing('app_user', 'uk_app_user_phone_hash_deleted', 'UNIQUE KEY uk_app_user_phone_hash_deleted (phone_hash, deleted)');
CALL spacetime_add_index_if_missing('app_user', 'idx_app_user_phone_hash', 'INDEX idx_app_user_phone_hash (phone_hash)');
CALL spacetime_add_index_if_missing('app_user', 'idx_app_user_account_status', 'INDEX idx_app_user_account_status (account_status)');
CALL spacetime_add_index_if_missing('app_user', 'idx_app_user_first_login', 'INDEX idx_app_user_first_login (first_login_completed)');

CALL spacetime_add_column_if_missing('app_user_verification', 'user_id', 'user_id BIGINT NOT NULL COMMENT ''用户 ID''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name_status', 'real_name_status VARCHAR(20) DEFAULT ''NOT_CERTIFIED'' COMMENT ''实名认证状态''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name', 'real_name VARCHAR(50) DEFAULT NULL COMMENT ''真实姓名''');
CALL spacetime_add_column_if_missing('app_user_verification', 'id_card', 'id_card VARCHAR(20) DEFAULT NULL COMMENT ''身份证号''');
CALL spacetime_add_column_if_missing('app_user_verification', 'bound_phone', 'bound_phone VARCHAR(20) DEFAULT NULL COMMENT ''实名认证绑定手机号明文''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name_hash', 'real_name_hash CHAR(64) DEFAULT NULL COMMENT ''真实姓名规范化后 SHA-256''');
CALL spacetime_add_column_if_missing('app_user_verification', 'id_card_hash', 'id_card_hash CHAR(64) DEFAULT NULL COMMENT ''身份证号规范化后 SHA-256''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name_submit_time', 'real_name_submit_time DATETIME DEFAULT NULL COMMENT ''实名认证提交时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name_result_time', 'real_name_result_time DATETIME DEFAULT NULL COMMENT ''实名认证结果时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name_reject_reason', 'real_name_reject_reason VARCHAR(200) DEFAULT NULL COMMENT ''实名驳回原因''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name_audit_source', 'real_name_audit_source VARCHAR(20) NOT NULL DEFAULT ''MACHINE'' COMMENT ''实名审核来源：MACHINE/MANUAL''');
CALL spacetime_add_column_if_missing('app_user_verification', 'real_name_provider_task_id', 'real_name_provider_task_id BIGINT DEFAULT NULL COMMENT ''实名 Provider 任务 ID''');
CALL spacetime_add_column_if_missing('app_user_verification', 'education_status', 'education_status VARCHAR(20) DEFAULT ''NOT_CERTIFIED'' COMMENT ''学历认证状态''');
CALL spacetime_add_column_if_missing('app_user_verification', 'education_method', 'education_method VARCHAR(30) DEFAULT NULL COMMENT ''认证方式''');
CALL spacetime_add_column_if_missing('app_user_verification', 'education_submit_time', 'education_submit_time DATETIME DEFAULT NULL COMMENT ''学历认证提交时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'education_result_time', 'education_result_time DATETIME DEFAULT NULL COMMENT ''学历认证结果时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'education_reject_reason', 'education_reject_reason VARCHAR(200) DEFAULT NULL COMMENT ''学历驳回原因''');
CALL spacetime_add_column_if_missing('app_user_verification', 'education_audit_source', 'education_audit_source VARCHAR(20) NOT NULL DEFAULT ''MANUAL'' COMMENT ''学历审核来源：MACHINE/MANUAL''');
CALL spacetime_add_column_if_missing('app_user_verification', 'education_provider_task_id', 'education_provider_task_id BIGINT DEFAULT NULL COMMENT ''学历 Provider 任务 ID''');
CALL spacetime_add_column_if_missing('app_user_verification', 'avatar_verify_status', 'avatar_verify_status VARCHAR(20) DEFAULT ''NOT_CERTIFIED'' COMMENT ''头像认证状态''');
CALL spacetime_add_column_if_missing('app_user_verification', 'avatar_verify_submit_time', 'avatar_verify_submit_time DATETIME DEFAULT NULL COMMENT ''头像认证提交时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'avatar_verify_result_time', 'avatar_verify_result_time DATETIME DEFAULT NULL COMMENT ''头像认证结果时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'avatar_verify_reject_reason', 'avatar_verify_reject_reason VARCHAR(200) DEFAULT NULL COMMENT ''头像驳回原因''');
CALL spacetime_add_column_if_missing('app_user_verification', 'avatar_audit_source', 'avatar_audit_source VARCHAR(20) NOT NULL DEFAULT ''MACHINE'' COMMENT ''头像审核来源：MACHINE/MANUAL''');
CALL spacetime_add_column_if_missing('app_user_verification', 'avatar_provider_task_id', 'avatar_provider_task_id BIGINT DEFAULT NULL COMMENT ''头像 Provider 任务 ID''');
CALL spacetime_add_column_if_missing('app_user_verification', 'profile_photo_audit_status', 'profile_photo_audit_status VARCHAR(20) DEFAULT ''NOT_SUBMITTED'' COMMENT ''资料照片审核状态''');
CALL spacetime_add_column_if_missing('app_user_verification', 'profile_photo_submit_time', 'profile_photo_submit_time DATETIME DEFAULT NULL COMMENT ''照片审核提交时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'profile_photo_reject_reason', 'profile_photo_reject_reason VARCHAR(200) DEFAULT NULL COMMENT ''照片驳回原因''');
CALL spacetime_add_column_if_missing('app_user_verification', 'profile_photo_audit_source', 'profile_photo_audit_source VARCHAR(20) NOT NULL DEFAULT ''MACHINE'' COMMENT ''资料照片审核来源：MACHINE/MANUAL''');
CALL spacetime_add_column_if_missing('app_user_verification', 'open_text_audit_status', 'open_text_audit_status VARCHAR(20) DEFAULT ''NOT_SUBMITTED'' COMMENT ''文字审核状态''');
CALL spacetime_add_column_if_missing('app_user_verification', 'open_text_submit_time', 'open_text_submit_time DATETIME DEFAULT NULL COMMENT ''文字审核提交时间''');
CALL spacetime_add_column_if_missing('app_user_verification', 'open_text_reject_reason', 'open_text_reject_reason VARCHAR(200) DEFAULT NULL COMMENT ''文字驳回原因''');
CALL spacetime_add_column_if_missing('app_user_verification', 'open_text_audit_source', 'open_text_audit_source VARCHAR(20) NOT NULL DEFAULT ''MACHINE'' COMMENT ''开放性文字审核来源：MACHINE/MANUAL''');
CALL spacetime_add_column_if_missing('app_user_verification', 'verify_level', 'verify_level INT DEFAULT 0 COMMENT ''已完成认证数量''');
CALL spacetime_add_column_if_missing('app_user_verification', 'core_access_status', 'core_access_status VARCHAR(30) NOT NULL DEFAULT ''CORE_BLOCKED'' COMMENT ''核心准入状态''');
CALL spacetime_add_column_if_missing('app_user_verification', 'core_access_reason', 'core_access_reason VARCHAR(200) DEFAULT NULL COMMENT ''核心准入阻断原因''');
CALL spacetime_add_column_if_missing('app_user_verification', 'create_time', 'create_time DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL spacetime_add_column_if_missing('app_user_verification', 'update_time', 'update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL spacetime_add_column_if_missing('app_user_verification', 'created_by', 'created_by BIGINT DEFAULT NULL');
CALL spacetime_add_column_if_missing('app_user_verification', 'updated_by', 'updated_by BIGINT DEFAULT NULL');
CALL spacetime_add_column_if_missing('app_user_verification', 'deleted', 'deleted TINYINT DEFAULT 0 COMMENT ''逻辑删除：0=正常，1=已删除''');
CALL spacetime_add_index_if_missing('app_user_verification', 'uk_app_user_verification_user_id', 'UNIQUE KEY uk_app_user_verification_user_id (user_id)');
CALL spacetime_add_index_if_missing('app_user_verification', 'idx_app_user_verification_id_card_hash', 'INDEX idx_app_user_verification_id_card_hash (id_card_hash)');
CALL spacetime_add_index_if_missing('app_user_verification', 'idx_app_user_verification_core_access', 'INDEX idx_app_user_verification_core_access (core_access_status, deleted)');

CALL spacetime_add_column_if_missing('app_vip_benefit', 'mobile_icon', 'mobile_icon VARCHAR(100) DEFAULT NULL COMMENT ''移动端图标''');
CALL spacetime_add_column_if_missing('app_vip_benefit', 'benefit_value', 'benefit_value INT DEFAULT NULL COMMENT ''权益数值''');
CALL spacetime_add_column_if_missing('app_vip_benefit', 'fixed_flag', 'fixed_flag TINYINT DEFAULT 0 COMMENT ''是否固定权益: 0=否, 1=是''');
CALL spacetime_add_column_if_missing('app_vip_package', 'subscription_type', 'subscription_type VARCHAR(30) DEFAULT ''once'' COMMENT ''订阅类型: once/month/quarter/year''');
CALL spacetime_add_column_if_missing('app_vip_package', 'wechat_product_id', 'wechat_product_id VARCHAR(100) DEFAULT NULL COMMENT ''微信商品 ID''');
CALL spacetime_add_column_if_missing('app_vip_package', 'agreement_config', 'agreement_config VARCHAR(500) DEFAULT NULL COMMENT ''协议配置''');
CALL spacetime_add_column_if_missing('app_vip_package', 'pay_channel_reserve', 'pay_channel_reserve VARCHAR(500) DEFAULT NULL COMMENT ''支付渠道预留字段''');
CALL spacetime_add_column_if_missing('app_coin_package', 'origin_amount', 'origin_amount DECIMAL(10,2) DEFAULT 0 COMMENT ''原价''');
CALL spacetime_add_column_if_missing('app_coin_package', 'discount_amount', 'discount_amount DECIMAL(10,2) DEFAULT NULL COMMENT ''优惠价''');
CALL spacetime_add_column_if_missing('app_coin_package', 'mobile_tag', 'mobile_tag VARCHAR(50) DEFAULT NULL COMMENT ''移动端展示标签''');
CALL spacetime_add_column_if_missing('app_trade_order', 'pay_channel', 'pay_channel VARCHAR(30) DEFAULT ''mock'' COMMENT ''支付渠道''');
CALL spacetime_add_column_if_missing('app_trade_order', 'channel_trade_no', 'channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT ''渠道交易单号''');
CALL spacetime_add_column_if_missing('app_trade_order', 'prepay_id', 'prepay_id VARCHAR(100) DEFAULT NULL COMMENT ''微信预支付交易会话标识''');
CALL spacetime_add_column_if_missing('app_trade_order', 'notify_summary', 'notify_summary VARCHAR(1000) DEFAULT NULL COMMENT ''支付回调原始摘要''');
CALL spacetime_add_column_if_missing('app_user_coin_log', 'balance_before', 'balance_before INT DEFAULT 0 COMMENT ''变动前余额''');

DROP PROCEDURE IF EXISTS spacetime_add_column_if_missing;
DROP PROCEDURE IF EXISTS spacetime_add_index_if_missing;
