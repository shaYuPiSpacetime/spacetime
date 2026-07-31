-- ============================================================
-- PRD-06 认证与安全设置、我的页与搜索：管理端与小程序闭环迁移
-- 日期：2026-07-17
-- 说明：
-- 1. 本脚本为增量、可重复执行脚本，不删除历史业务数据。
-- 2. 旧的搜索热词、反馈箱、移动端入口等超出本期范围的菜单仅隐藏。
-- 3. 合规内容与动态文案写入数据库，客户端不得写死业务文案。
-- ============================================================

DROP PROCEDURE IF EXISTS prd06_add_column;
DELIMITER $$
CREATE PROCEDURE prd06_add_column(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_ddl TEXT
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    SELECT COUNT(*)
      INTO v_exists
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = p_table_name
       AND column_name = p_column_name;
    IF v_exists = 0 THEN
        SET @prd06_ddl = p_ddl;
        PREPARE prd06_stmt FROM @prd06_ddl;
        EXECUTE prd06_stmt;
        DEALLOCATE PREPARE prd06_stmt;
    END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS prd06_add_index;
DELIMITER $$
CREATE PROCEDURE prd06_add_index(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_ddl TEXT
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    SELECT COUNT(*)
      INTO v_exists
      FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = p_table_name
       AND index_name = p_index_name;
    IF v_exists = 0 THEN
        SET @prd06_ddl = p_ddl;
        PREPARE prd06_stmt FROM @prd06_ddl;
        EXECUTE prd06_stmt;
        DEALLOCATE PREPARE prd06_stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 一、公告与协议：稳定编码、版本、预置标记
-- ============================================================
CALL prd06_add_column(
    'content_article',
    'content_code',
    'ALTER TABLE content_article ADD COLUMN content_code VARCHAR(50) DEFAULT NULL COMMENT ''稳定内容编码'' AFTER id'
);
CALL prd06_add_column(
    'content_article',
    'version',
    'ALTER TABLE content_article ADD COLUMN version VARCHAR(20) NOT NULL DEFAULT ''v1.0'' COMMENT ''内容版本号'' AFTER content_code'
);
CALL prd06_add_column(
    'content_article',
    'preinitialized',
    'ALTER TABLE content_article ADD COLUMN preinitialized TINYINT NOT NULL DEFAULT 0 COMMENT ''是否系统预置：0=否，1=是'' AFTER version'
);
CALL prd06_add_column(
    'content_article',
    'active_content_code',
    'ALTER TABLE content_article ADD COLUMN active_content_code VARCHAR(50) GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN content_code ELSE NULL END) STORED COMMENT ''未删除内容稳定编码'''
);
CALL prd06_add_index(
    'content_article',
    'uk_content_article_code',
    'ALTER TABLE content_article ADD UNIQUE KEY uk_content_article_code (active_content_code)'
);

-- ============================================================
-- 二、搜索：来源场景、屏蔽词唯一性、用户搜索摘要
-- ============================================================
CALL prd06_add_column(
    'app_user_search_log',
    'source_scene',
    'ALTER TABLE app_user_search_log ADD COLUMN source_scene VARCHAR(30) NOT NULL DEFAULT ''global'' COMMENT ''来源场景：global/community/recommend'' AFTER search_type'
);
CALL prd06_add_column(
    'search_block_word',
    'active_word_match',
    'ALTER TABLE search_block_word ADD COLUMN active_word_match VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN CONCAT(LOWER(TRIM(word)), ''#'', match_type) ELSE NULL END) STORED COMMENT ''未删除屏蔽词与匹配方式唯一键'''
);
CALL prd06_add_index(
    'search_block_word',
    'uk_search_block_word_match',
    'ALTER TABLE search_block_word ADD UNIQUE KEY uk_search_block_word_match (active_word_match)'
);

CREATE TABLE IF NOT EXISTS app_user_search_summary (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '小程序用户ID',
    recent_30d_count INT NOT NULL DEFAULT 0 COMMENT '最近30天有效搜索次数',
    last_search_time DATETIME DEFAULT NULL COMMENT '最近一次有效搜索时间',
    violation_count INT NOT NULL DEFAULT 0 COMMENT '累计违规命中次数',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    active_user_id BIGINT GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN user_id ELSE NULL END) STORED,
    UNIQUE KEY uk_app_user_search_summary (active_user_id),
    KEY idx_app_user_search_summary_time (last_search_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户搜索摘要';

-- ============================================================
-- 三、账号注销：申请快照、执行记录、追加备注
-- ============================================================
CALL prd06_add_column(
    'app_user_cancel_request',
    'request_no',
    'ALTER TABLE app_user_cancel_request ADD COLUMN request_no VARCHAR(40) DEFAULT NULL COMMENT ''注销申请编号'' AFTER id'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'hard_block_snapshot',
    'ALTER TABLE app_user_cancel_request ADD COLUMN hard_block_snapshot TEXT DEFAULT NULL COMMENT ''硬阻断快照JSON'' AFTER block_reason'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'risk_snapshot',
    'ALTER TABLE app_user_cancel_request ADD COLUMN risk_snapshot TEXT DEFAULT NULL COMMENT ''可确认风险快照JSON'' AFTER hard_block_snapshot'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'vip_snapshot',
    'ALTER TABLE app_user_cancel_request ADD COLUMN vip_snapshot VARCHAR(1000) DEFAULT NULL COMMENT ''会员权益快照JSON'' AFTER risk_snapshot'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'coin_balance',
    'ALTER TABLE app_user_cancel_request ADD COLUMN coin_balance INT NOT NULL DEFAULT 0 COMMENT ''申请时千寻币余额'' AFTER vip_snapshot'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'refund_snapshot',
    'ALTER TABLE app_user_cancel_request ADD COLUMN refund_snapshot VARCHAR(1000) DEFAULT NULL COMMENT ''退款快照JSON'' AFTER coin_balance'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'dispute_snapshot',
    'ALTER TABLE app_user_cancel_request ADD COLUMN dispute_snapshot VARCHAR(1000) DEFAULT NULL COMMENT ''争议快照JSON'' AFTER refund_snapshot'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'penalty_snapshot',
    'ALTER TABLE app_user_cancel_request ADD COLUMN penalty_snapshot VARCHAR(1000) DEFAULT NULL COMMENT ''处罚快照JSON'' AFTER dispute_snapshot'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'execution_log',
    'ALTER TABLE app_user_cancel_request ADD COLUMN execution_log TEXT DEFAULT NULL COMMENT ''注销执行日志JSON'' AFTER penalty_snapshot'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'next_retry_time',
    'ALTER TABLE app_user_cancel_request ADD COLUMN next_retry_time DATETIME DEFAULT NULL COMMENT ''失败后下次重试时间'' AFTER execution_log'
);
CALL prd06_add_column(
    'app_user_cancel_request',
    'active_cooling_user_id',
    'ALTER TABLE app_user_cancel_request ADD COLUMN active_cooling_user_id BIGINT GENERATED ALWAYS AS (CASE WHEN deleted = 0 AND status = ''COOLING_OFF'' THEN user_id ELSE NULL END) STORED COMMENT ''处于后悔期的用户唯一键'''
);
CALL prd06_add_index(
    'app_user_cancel_request',
    'uk_cancel_request_no',
    'ALTER TABLE app_user_cancel_request ADD UNIQUE KEY uk_cancel_request_no (request_no)'
);
CALL prd06_add_index(
    'app_user_cancel_request',
    'uk_cancel_cooling_user',
    'ALTER TABLE app_user_cancel_request ADD UNIQUE KEY uk_cancel_cooling_user (active_cooling_user_id)'
);

CREATE TABLE IF NOT EXISTS app_user_cancel_remark (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    request_id BIGINT NOT NULL COMMENT '注销申请ID',
    user_id BIGINT NOT NULL COMMENT '小程序用户ID',
    operator_id BIGINT NOT NULL COMMENT '后台操作人ID',
    remark VARCHAR(1000) NOT NULL COMMENT '追加备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    KEY idx_cancel_remark_request (request_id, create_time, deleted),
    KEY idx_cancel_remark_user (user_id, create_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='注销申请追加备注明细';

-- ============================================================
-- 四、动态配置与合规内容初始化：只补缺失项，不覆盖现有业务值
-- ============================================================
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'agreement.single_commitment', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '单身承诺函地址'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'agreement.single_commitment' AND deleted = 0
);
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'agreement.account_cancellation', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '账号注销协议地址'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'agreement.account_cancellation' AND deleted = 0
);
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'agreement.invite_rules',
       'https://admin.shikongxiehou.com/h5/invite-rules/index.html',
       'AGREEMENT', 'URL', 1, 'ENABLED', '邀请规则动态 H5 地址'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'agreement.invite_rules' AND deleted = 0
);
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'account_cancel.cooling_days', '30', 'ACCOUNT_CANCEL', 'NUMBER', 1, 'ENABLED', '账号注销后悔期天数'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'account_cancel.cooling_days' AND deleted = 0
);
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'account_cancel.reasons', '["已经找到另一半","暂时不需要使用","隐私或安全原因","体验不符合预期","其他原因"]',
       'ACCOUNT_CANCEL', 'JSON', 1, 'ENABLED', '账号注销原因选项'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'account_cancel.reasons' AND deleted = 0
);
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'account_cancel.description', '提交注销申请后将进入后悔期，后悔期内可撤销申请。到期后账号及相关个人信息将按协议处理。',
       'ACCOUNT_CANCEL', 'TEXT', 1, 'ENABLED', '账号注销说明'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'account_cancel.description' AND deleted = 0
);
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'service.customer_url', '', 'SERVICE', 'URL', 1, 'ENABLED', '在线客服链接'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'service.customer_url' AND deleted = 0
);

INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT seed.config_key, seed.config_value, seed.config_group, 'TEXT', 1, 'ENABLED', seed.remark
  FROM (
        SELECT 'account_cancel.heading_title' config_key, '注销账号须知' config_value, 'ACCOUNT_CANCEL' config_group, '注销页主标题' remark
        UNION ALL SELECT 'account_cancel.heading_subtitle', '账号注销后，资料将被清空且无法恢复', 'ACCOUNT_CANCEL', '注销页副标题'
        UNION ALL SELECT 'account_cancel.reason_title', '选择原因', 'ACCOUNT_CANCEL', '注销原因标题'
        UNION ALL SELECT 'account_cancel.other_placeholder', '好聚好散，把注销原因告诉我们吧', 'ACCOUNT_CANCEL', '其他原因输入提示'
        UNION ALL SELECT 'account_cancel.cancel_button', '取消注销', 'ACCOUNT_CANCEL', '取消注销按钮'
        UNION ALL SELECT 'account_cancel.submit_button', '仍要注销', 'ACCOUNT_CANCEL', '继续注销按钮'
        UNION ALL SELECT 'account_cancel.checking_button', '校验中', 'ACCOUNT_CANCEL', '校验中按钮'
        UNION ALL SELECT 'account_cancel.submitted_button', '已提交', 'ACCOUNT_CANCEL', '已提交按钮'
        UNION ALL SELECT 'account_cancel.revoke_button', '撤销注销', 'ACCOUNT_CANCEL', '撤销注销按钮'
        UNION ALL SELECT 'account_cancel.revoking_button', '撤销中', 'ACCOUNT_CANCEL', '撤销中按钮'
        UNION ALL SELECT 'account_cancel.dialog_title', '注销提醒', 'ACCOUNT_CANCEL', '注销确认弹窗标题'
        UNION ALL SELECT 'account_cancel.dialog_cancel', '取消注销', 'ACCOUNT_CANCEL', '弹窗取消按钮'
        UNION ALL SELECT 'account_cancel.dialog_confirm', '确定注销', 'ACCOUNT_CANCEL', '弹窗确认按钮'
        UNION ALL SELECT 'account_cancel.agreement_prefix', '阅读并同意', 'ACCOUNT_CANCEL', '注销协议勾选前缀'
        UNION ALL SELECT 'account_cancel.agreement_title', '《用户注销协议》', 'ACCOUNT_CANCEL', '注销协议标题'
        UNION ALL SELECT 'account_cancel.success_text', '提交成功', 'ACCOUNT_CANCEL', '提交成功提示'
        UNION ALL SELECT 'account_cancel.agree_required_text', '请先阅读并同意用户注销协议', 'ACCOUNT_CANCEL', '未勾选协议提示'
        UNION ALL SELECT 'account_cancel.revoked_success_text', '已撤销注销申请', 'ACCOUNT_CANCEL', '撤销成功提示'
        UNION ALL SELECT 'account_cancel.blocked_fallback_text', '当前账号暂不可注销', 'ACCOUNT_CANCEL', '阻断兜底提示'
        UNION ALL SELECT 'account_cancel.recheck_required', '注销校验已过期，请重新确认', 'ACCOUNT_CANCEL', '实时校验过期提示'
        UNION ALL SELECT 'account_cancel.reason_required', '请选择注销原因', 'ACCOUNT_CANCEL', '未选择原因提示'
        UNION ALL SELECT 'account_cancel.confirm_required', '请确认注销风险后再提交', 'ACCOUNT_CANCEL', '未确认风险提示'
        UNION ALL SELECT 'account_cancel.risk.account_penalty.title', '账号当前受限', 'ACCOUNT_CANCEL', '处罚阻断标题'
        UNION ALL SELECT 'account_cancel.risk.account_penalty.description', '账号存在未结束的处罚，请先完成相关处理', 'ACCOUNT_CANCEL', '处罚阻断说明'
        UNION ALL SELECT 'account_cancel.risk.refund_processing.title', '存在处理中退款', 'ACCOUNT_CANCEL', '退款阻断标题'
        UNION ALL SELECT 'account_cancel.risk.refund_processing.description', '请等待退款处理完成后再申请注销', 'ACCOUNT_CANCEL', '退款阻断说明'
        UNION ALL SELECT 'account_cancel.risk.manual_block.title', '暂时无法注销', 'ACCOUNT_CANCEL', '人工阻断标题'
        UNION ALL SELECT 'account_cancel.risk.vip_active.title', '仍有会员权益', 'ACCOUNT_CANCEL', '会员风险标题'
        UNION ALL SELECT 'account_cancel.risk.vip_active.description', '会员有效期至 {expireTime}，注销后剩余权益不会退还', 'ACCOUNT_CANCEL', '会员风险说明'
        UNION ALL SELECT 'account_cancel.risk.coin_balance.title', '仍有千寻币余额', 'ACCOUNT_CANCEL', '千寻币风险标题'
        UNION ALL SELECT 'account_cancel.risk.coin_balance.description', '当前余额 {balance}，注销后余额将无法恢复', 'ACCOUNT_CANCEL', '千寻币风险说明'
        UNION ALL SELECT 'account_cancel.risk.dependency_unavailable.description', '风险校验服务暂不可用，请稍后重试', 'ACCOUNT_CANCEL', '依赖服务不可用阻断说明'
        UNION ALL SELECT 'account_cancel.no_active_request', '当前没有可撤销的注销申请', 'ACCOUNT_CANCEL', '无可撤销申请提示'
        UNION ALL SELECT 'account_cancel.cooling_title', '注销申请已提交', 'ACCOUNT_CANCEL', '后悔期卡片标题'
        UNION ALL SELECT 'account_cancel.cooling_end_label', '预计注销时间', 'ACCOUNT_CANCEL', '预计注销时间标签'
        UNION ALL SELECT 'account_cancel.other_reason_value', '其他', 'ACCOUNT_CANCEL', '其他原因选项值'
        UNION ALL SELECT 'account_cancel.risk_title', '注销须知', 'ACCOUNT_CANCEL', '注销风险标题'
        UNION ALL SELECT 'account_cancel.operation_failed_text', '操作失败，请稍后重试', 'ACCOUNT_CANCEL', '注销操作失败提示'
        UNION ALL SELECT 'settings.loading_text', '加载中', 'SETTINGS', '设置页加载提示'
        UNION ALL SELECT 'settings.bound_text', '已绑定', 'SETTINGS', '设置页已绑定文案'
        UNION ALL SELECT 'settings.unbound_text', '未绑定', 'SETTINGS', '设置页未绑定文案'
        UNION ALL SELECT 'settings.logout_dialog_title', '退出登录', 'SETTINGS', '退出登录弹窗标题'
        UNION ALL SELECT 'settings.logout_dialog_copy', '确定退出当前账号吗？', 'SETTINGS', '退出登录弹窗说明'
        UNION ALL SELECT 'settings.logout_cancel', '取消', 'SETTINGS', '退出登录取消按钮'
        UNION ALL SELECT 'settings.logout_confirm', '确定退出', 'SETTINGS', '退出登录确认按钮'
        UNION ALL SELECT 'settings.load_failed_text', '设置加载失败，请稍后重试', 'SETTINGS', '设置加载失败提示'
        UNION ALL SELECT 'about.icp_number', '', 'ABOUT', 'ICP备案号'
        UNION ALL SELECT 'about.load_failed_text', '关于我们加载失败，请稍后重试', 'ABOUT', '关于我们加载失败提示'
        UNION ALL SELECT 'privacy.intro_title', '隐私保护', 'PRIVACY', '隐私页说明标题'
        UNION ALL SELECT 'privacy.intro_copy', '你可以在这里查看平台如何收集、使用和保护个人信息', 'PRIVACY', '隐私页说明文案'
        UNION ALL SELECT 'privacy.cooling_title', '账号注销', 'PRIVACY', '隐私页注销入口标题'
        UNION ALL SELECT 'privacy.cooling_end_label', '预计注销时间', 'PRIVACY', '隐私页预计注销标签'
        UNION ALL SELECT 'privacy.loading_text', '加载中', 'PRIVACY', '隐私页加载提示'
        UNION ALL SELECT 'privacy.load_failed_text', '隐私设置加载失败，请稍后重试', 'PRIVACY', '隐私页加载失败提示'
        UNION ALL SELECT 'help.service_cta', '联系在线客服', 'SERVICE', '帮助页客服按钮'
        UNION ALL SELECT 'help.service_unavailable', '客服暂不可用，请稍后再试', 'SERVICE', '客服不可用提示'
        UNION ALL SELECT 'help.service_loading', '加载中', 'SERVICE', '客服加载提示'
        UNION ALL SELECT 'content.missing_text', '内容暂未配置', 'CONTENT', '内容缺失提示'
        UNION ALL SELECT 'content.loading_text', '内容加载中', 'CONTENT', '内容加载提示'
        UNION ALL SELECT 'content.retry_text', '重新加载', 'CONTENT', '内容重试按钮'
        UNION ALL SELECT 'content.load_failed_text', '内容加载失败，请稍后重试', 'CONTENT', '内容加载失败提示'
        UNION ALL SELECT 'content.effective_time_suffix', '生效', 'CONTENT', '内容生效时间后缀'
        UNION ALL SELECT 'search.placeholder', '搜索用户、动态或话题', 'SEARCH', '搜索输入框提示'
        UNION ALL SELECT 'search.empty_keyword_text', '请输入搜索关键词', 'SEARCH', '空关键词提示'
        UNION ALL SELECT 'search.history_empty_text', '暂无搜索历史', 'SEARCH', '无搜索历史提示'
        UNION ALL SELECT 'search.load_failed_text', '搜索失败，请稍后重试', 'SEARCH', '搜索失败提示'
        UNION ALL SELECT 'search.clear_history_title', '清空搜索历史', 'SEARCH', '清空历史弹窗标题'
        UNION ALL SELECT 'search.clear_history_content', '确定清空全部搜索历史吗？', 'SEARCH', '清空历史弹窗说明'
        UNION ALL SELECT 'search.clear_history_cancel', '取消', 'SEARCH', '清空历史取消按钮'
        UNION ALL SELECT 'search.clear_history_confirm', '清空', 'SEARCH', '清空历史确认按钮'
        UNION ALL SELECT 'search.no_result_suggestion', '换个关键词试试', 'SEARCH', '无搜索结果建议'
        UNION ALL SELECT 'search.topic_unavailable_text', '话题搜索暂不可用', 'SEARCH', '话题能力不可用提示'
        UNION ALL SELECT 'search.loading_text', '搜索中', 'SEARCH', '搜索加载提示'
        UNION ALL SELECT 'search.no_more_text', '没有更多结果了', 'SEARCH', '搜索无更多结果提示'
  ) seed
  LEFT JOIN app_config config
    ON config.config_key = seed.config_key
   AND config.deleted = 0
 WHERE config.id IS NULL;

INSERT INTO content_article
    (content_code, version, preinitialized, type, category, title, summary,
     content_type, content_url, content_body, sort, status)
SELECT seed.content_code, 'v1.0', 1, seed.type, seed.category, seed.title, seed.summary,
       seed.content_type,
       (SELECT ac.config_value
          FROM app_config ac
         WHERE ac.config_key = seed.config_key AND ac.deleted = 0
         ORDER BY ac.id DESC LIMIT 1),
       seed.content_body, seed.sort, 'ENABLED'
  FROM (
        SELECT 'user_agreement' content_code, 'AGREEMENT' type, 'PROTOCOL' category,
               '用户协议' title, '平台用户服务协议' summary, 'H5' content_type,
               'agreement.user_agreement' config_key, '请配置用户协议正文或H5地址。' content_body, 10 sort
        UNION ALL
        SELECT 'privacy_policy', 'PRIVACY', 'PROTOCOL', '隐私政策', '平台隐私保护政策',
               'H5', 'agreement.privacy_policy', '请配置隐私政策正文或H5地址。', 20
        UNION ALL
        SELECT 'privacy_summary', 'PRIVACY', 'PROTOCOL', '隐私政策摘要', '隐私政策重点摘要',
               'H5', 'agreement.privacy_summary', '请配置隐私政策摘要正文或H5地址。', 30
        UNION ALL
        SELECT 'single_commitment', 'AGREEMENT', 'PROTOCOL', '单身承诺函', '用户单身状态承诺',
               'H5', 'agreement.single_commitment', '请配置单身承诺函正文或H5地址。', 40
        UNION ALL
        SELECT 'account_cancellation', 'AGREEMENT', 'PROTOCOL', '用户注销协议', '账号注销规则与个人信息处理说明',
               'H5', 'agreement.account_cancellation', '请配置用户注销协议正文或H5地址。', 45
        UNION ALL
        SELECT 'third_party_list', 'LIST', 'PRIVACY', '第三方信息共享清单', '第三方SDK及共享信息说明',
               'H5', 'agreement.third_party_list', '请配置第三方信息共享清单。', 50
        UNION ALL
        SELECT 'personal_info_list', 'LIST', 'PRIVACY', '个人信息收集清单', '个人信息收集与使用说明',
               'H5', 'agreement.personal_info_list', '请配置个人信息收集清单。', 60
        UNION ALL
        SELECT 'platform_rule', 'RULE', 'PROTOCOL', '平台信息管理规范', '平台内容与信息管理规则',
               'H5', 'agreement.platform_rules', '请配置平台信息管理规范。', 70
        UNION ALL
        SELECT 'announcement', 'ANNOUNCEMENT', 'OPERATION', '平台公告', '平台公告内容',
               'H5', NULL, '暂无公告', 80
        UNION ALL
        SELECT 'help_service', 'HELP_DOC', 'SERVICE', '帮助与客服', '常见问题与客服指引',
               'H5', NULL, '如需帮助，请联系在线客服。', 90
        UNION ALL
        SELECT 'invite_rules', 'RULE', 'BUSINESS_RULE', '邀请规则', '邀请好友活动规则',
               'H5', 'agreement.invite_rules', NULL, 100
  ) seed
 LEFT JOIN content_article article
    ON article.content_code = seed.content_code
   AND article.deleted = 0
 WHERE article.id IS NULL;

UPDATE content_article
   SET preinitialized = 0,
       status = 'DISABLED'
 WHERE content_code = 'help'
   AND deleted = 0;
UPDATE content_article
   SET content_type = 'H5'
 WHERE content_code IN ('announcement', 'help_service', 'account_cancellation', 'invite_rules')
   AND deleted = 0;
UPDATE content_article
   SET content_body = NULL
 WHERE content_code = 'invite_rules'
   AND deleted = 0;

-- ============================================================
-- 五、枚举字典：页面展示值全部由字典接口读取
-- ============================================================
INSERT INTO sys_dict_type
    (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
VALUES
    ('搜索屏蔽类型', 'search_block_type', 60, 'ENABLED', '搜索屏蔽生效范围', NOW(), NOW()),
    ('搜索屏蔽词匹配方式', 'search_block_match_type', 61, 'ENABLED', '搜索屏蔽词匹配方式', NOW(), NOW()),
    ('搜索屏蔽原因', 'search_block_reason', 62, 'ENABLED', '搜索屏蔽原因', NOW(), NOW()),
    ('注销申请状态', 'account_cancel_status', 63, 'ENABLED', '注销申请状态', NOW(), NOW()),
    ('通用启停状态', 'common_status', 64, 'ENABLED', '后台通用启停状态', NOW(), NOW()),
    ('公告与协议内容类型', 'compliance_content_type', 65, 'ENABLED', '公告与协议预置内容类型', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    dict_name = VALUES(dict_name),
    status = 'ENABLED',
    remark = VALUES(remark),
    update_time = NOW();

INSERT INTO sys_dict_data
    (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT seed.dict_type, 0, seed.dict_label, seed.dict_value, seed.dict_sort, 'ENABLED', seed.remark, NOW(), NOW()
  FROM (
        SELECT 'search_block_type' dict_type, '搜索词违规' dict_label, 'SEARCH_VIOLATION' dict_value, 10 dict_sort, '命中后阻断整次搜索' remark
        UNION ALL SELECT 'search_block_type', '搜索结果屏蔽', 'RESULT_BLOCK', 20, '命中后过滤单条结果'
        UNION ALL SELECT 'search_block_match_type', '包含匹配', 'FUZZY', 10, '搜索内容包含关键词时命中'
        UNION ALL SELECT 'search_block_match_type', '精确匹配', 'EXACT', 20, '关键词完全一致时命中'
        UNION ALL SELECT 'search_block_reason', '违规词', 'illegal_word', 10, '命中运营配置的搜索屏蔽词'
        UNION ALL SELECT 'search_block_reason', '内容下架', 'content_offline', 20, '内容被删除、下架或审核未通过'
        UNION ALL SELECT 'search_block_reason', '账号不可见', 'account_unavailable', 30, '用户冻结、注销中、已注销或不可展示'
        UNION ALL SELECT 'search_block_reason', '隐私限制', 'privacy_limited', 40, '资料因隐私或关系限制降级展示'
        UNION ALL SELECT 'account_cancel_status', '未申请', 'NONE', 5, '尚未申请注销'
        UNION ALL SELECT 'account_cancel_status', '已申请', 'REQUESTED', 8, '已提交注销申请'
        UNION ALL SELECT 'account_cancel_status', '后悔期中', 'COOLING_OFF', 10, '注销申请处于后悔期'
        UNION ALL SELECT 'account_cancel_status', '已撤销', 'RESTORED', 20, '用户已撤销注销申请'
        UNION ALL SELECT 'account_cancel_status', '已注销', 'CANCELLED', 30, '账号已完成注销'
        UNION ALL SELECT 'account_cancel_status', '执行受阻', 'BLOCKED', 40, '注销执行被风险项阻断'
        UNION ALL SELECT 'common_status', '启用', 'ENABLED', 10, '启用状态'
        UNION ALL SELECT 'common_status', '停用', 'DISABLED', 20, '停用状态'
        UNION ALL SELECT 'compliance_content_type', '协议', 'user_agreement', 10, '用户协议'
        UNION ALL SELECT 'compliance_content_type', '隐私', 'privacy_policy', 20, '隐私政策'
        UNION ALL SELECT 'compliance_content_type', '隐私', 'privacy_summary', 30, '隐私政策摘要'
        UNION ALL SELECT 'compliance_content_type', '承诺函', 'single_commitment', 40, '单身承诺函'
        UNION ALL SELECT 'compliance_content_type', '协议', 'account_cancellation', 45, '用户注销协议'
        UNION ALL SELECT 'compliance_content_type', '清单', 'third_party_list', 50, '第三方信息共享清单'
        UNION ALL SELECT 'compliance_content_type', '清单', 'personal_info_list', 60, '个人信息收集清单'
        UNION ALL SELECT 'compliance_content_type', '规范', 'platform_rule', 70, '平台信息管理规范'
        UNION ALL SELECT 'compliance_content_type', '公告', 'announcement', 80, '平台公告'
        UNION ALL SELECT 'compliance_content_type', '帮助', 'help_service', 90, '帮助与客服'
        UNION ALL SELECT 'compliance_content_type', '邀请规则', 'invite_rules', 100, '推广裂变邀请规则'
  ) seed
 WHERE NOT EXISTS (
       SELECT 1
         FROM sys_dict_data data
        WHERE data.dict_type = seed.dict_type
          AND data.dict_value = seed.dict_value
          AND data.deleted = 0
 );

UPDATE sys_dict_data
   SET status = 'DISABLED',
       update_time = NOW(),
       remark = 'PRD-06 正式口径已停用'
 WHERE dict_type = 'search_block_reason'
   AND dict_value IN ('ILLEGAL', 'PORNOGRAPHIC', 'ABUSE', 'ADVERTISING', 'OTHER')
   AND deleted = 0;
UPDATE sys_dict_data
   SET dict_sort = CASE dict_value WHEN 'FUZZY' THEN 10 WHEN 'EXACT' THEN 20 ELSE dict_sort END,
       update_time = NOW()
 WHERE dict_type = 'search_block_match_type'
   AND dict_value IN ('FUZZY', 'EXACT')
   AND deleted = 0;

-- 历史撤销状态归一为正式 RESTORED；NONE 仅是即时状态，不出现在后台申请筛选中。
UPDATE app_user_cancel_request
   SET status = 'RESTORED',
       update_time = NOW()
 WHERE status = 'REVOKED'
   AND deleted = 0;
UPDATE sys_dict_data
   SET status = 'DISABLED',
       update_time = NOW()
 WHERE dict_type = 'account_cancel_status'
   AND dict_value = 'NONE'
   AND deleted = 0;

-- ============================================================
-- 六、菜单收敛：新增菜单名称和层级与静态 Demo 保持一致
-- ============================================================
UPDATE sys_menu
   SET menu_name = '内容管理配置',
       icon = 'FileCog',
       menu_sort = 89,
       visible = 1,
       status = 'ENABLED',
       deleted = 0
 WHERE id = 890;

INSERT INTO sys_menu
    (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status, remark)
VALUES
    (891, 890, '公告与协议', 'C', '/mobile-config/compliance', 'content/ComplianceContentPage',
     'FileText', 'content:compliance:list', 10, 1, 'ENABLED', '预置公告与合规协议配置'),
    (892, 891, '编辑公告与协议', 'F', NULL, NULL,
     NULL, 'content:compliance:edit', 10, 0, 'ENABLED', '仅允许编辑预置内容'),
    (893, 891, '启停公告与协议', 'F', NULL, NULL,
     NULL, 'content:compliance:status', 20, 0, 'ENABLED', '启用或停用预置内容'),
    (900, 0, '用户安全设置', 'M', NULL, NULL,
     'ShieldCheck', NULL, 90, 1, 'ENABLED', '用户安全设置'),
    (901, 900, '注销申请', 'C', '/user-safety/cancellations', 'user-security/CancelRequestPage',
     'UserRoundX', 'userSecurity:cancel:list', 10, 1, 'ENABLED', '注销申请只读查询'),
    (902, 901, '查看注销详情', 'F', NULL, NULL,
     NULL, 'userSecurity:cancel:view', 10, 0, 'ENABLED', '查看注销申请详情'),
    (903, 901, '追加注销备注', 'F', NULL, NULL,
     NULL, 'userSecurity:cancel:remark', 20, 0, 'ENABLED', '只追加备注，不改变状态')
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id),
    menu_name = VALUES(menu_name),
    menu_type = VALUES(menu_type),
    path = VALUES(path),
    component = VALUES(component),
    icon = VALUES(icon),
    perms = VALUES(perms),
    menu_sort = VALUES(menu_sort),
    visible = VALUES(visible),
    status = VALUES(status),
    remark = VALUES(remark),
    deleted = 0;

UPDATE sys_menu
   SET parent_id = 890,
       menu_name = '搜索屏蔽词',
       path = '/operation/search-block-words',
       component = 'content/SearchBlockWordPage',
       perms = 'content:blockWord:list',
       menu_sort = 20,
       visible = 1,
       status = 'ENABLED',
       deleted = 0
 WHERE id = 850;
UPDATE sys_menu
   SET menu_name = '新增屏蔽词', perms = 'content:blockWord:add', visible = 0, status = 'ENABLED'
 WHERE id = 851;
UPDATE sys_menu
   SET menu_name = '编辑屏蔽词', perms = 'content:blockWord:edit', visible = 0, status = 'ENABLED'
 WHERE id = 852;
UPDATE sys_menu
   SET menu_name = '启停屏蔽词', perms = 'content:blockWord:status', visible = 0, status = 'ENABLED'
 WHERE id = 853;

-- 搜索热词、反馈箱、应用配置、移动端入口、操作日志均不属于本期 Demo 可见菜单。
UPDATE sys_menu
   SET visible = 0
 WHERE menu_name IN ('搜索热词', '反馈箱', '应用配置', '移动端入口', '操作日志')
   AND deleted = 0;
UPDATE sys_menu
   SET visible = 0
 WHERE parent_id IN (820, 830, 840, 860)
   AND menu_type <> 'C'
   AND deleted = 0;

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id
  FROM sys_menu
 WHERE id IN (850, 851, 852, 853, 890, 891, 892, 893, 900, 901, 902, 903);

DROP PROCEDURE IF EXISTS prd06_add_column;
DROP PROCEDURE IF EXISTS prd06_add_index;
