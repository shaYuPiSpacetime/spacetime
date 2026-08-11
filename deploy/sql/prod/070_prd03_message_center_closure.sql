-- =============================================================
-- PRD-03 消息、私信与通知中心完整数据模型
-- 规则：保留十四张独立业务表，不为减少表数合并不同事实职责。
-- 规则：正文到期仅清空content_text并保留消息元数据，不物理删除消息事实。
-- 规则：TIM消息映射只保存在app_message_record，悄悄话通过消息主键关联。
-- 规则：Inbox载荷仅为有界临时密文，不得包含聊天正文，成功、死信或到期后清空。
-- =============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_message_conversation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `conversation_no` VARCHAR(64) NOT NULL COMMENT '私信会话业务编号',
    `tim_conversation_id` VARCHAR(128) NOT NULL COMMENT '腾讯云TIM单聊会话标识',
    `match_id` BIGINT NOT NULL COMMENT '关系匹配生命周期主键ID',
    `match_no` VARCHAR(64) NOT NULL COMMENT '关系匹配生命周期业务编号',
    `user_low_id` BIGINT NOT NULL COMMENT '双方用户中较小的用户ID',
    `user_high_id` BIGINT NOT NULL COMMENT '双方用户中较大的用户ID',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '会话状态：active-可用，blocked-已拉黑，invalid-已失效',
    `active_marker` TINYINT NULL DEFAULT 1 COMMENT '活跃唯一标记：1-有效，NULL-终态已释放',
    `config_version` VARCHAR(32) NOT NULL COMMENT '创建会话时采用的消息规则版本',
    `protection_enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '女性保护快照：0-关闭，1-开启',
    `female_user_id` BIGINT NULL COMMENT '可识别女方时记录的用户ID',
    `male_user_id` BIGINT NULL COMMENT '可识别男方时记录的用户ID',
    `protection_until` DATETIME NULL COMMENT '女性保护结束时间',
    `female_first_message_at` DATETIME NULL COMMENT '女方首条真实用户消息发送时间',
    `last_message_id` BIGINT NULL COMMENT '最后一条已发送消息主键ID',
    `last_message_time` DATETIME NULL COMMENT '最后一条已发送消息时间',
    `blocked_by_user_id` BIGINT NULL COMMENT '触发会话拉黑的用户ID',
    `invalid_reason` VARCHAR(40) NULL COMMENT '会话失效原因编码',
    `invalid_time` DATETIME NULL COMMENT '会话进入终态的业务时间',
    `isolated_at` DATETIME NULL COMMENT '会话退出普通业务查询的隔离时间',
    `purge_after` DATETIME NULL COMMENT '会话关联普通正文允许清理的时间',
    `version` INT NOT NULL DEFAULT 0 COMMENT '会话状态手工CAS版本号',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_conversation_no` (`conversation_no`),
    UNIQUE KEY `uk_message_conversation_tim` (`tim_conversation_id`),
    UNIQUE KEY `uk_message_conversation_match` (`match_id`),
    UNIQUE KEY `uk_message_conversation_active_pair` (`user_low_id`, `user_high_id`, `active_marker`),
    KEY `idx_message_conversation_low` (`user_low_id`, `status`, `last_message_time`),
    KEY `idx_message_conversation_high` (`user_high_id`, `status`, `last_message_time`),
    KEY `idx_message_conversation_purge` (`purge_after`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私信会话生命周期与TIM会话映射表';

CREATE TABLE IF NOT EXISTS `app_message_conversation_member` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `conversation_id` BIGINT NOT NULL COMMENT '私信会话主键ID',
    `conversation_no` VARCHAR(64) NOT NULL COMMENT '私信会话业务编号',
    `user_id` BIGINT NOT NULL COMMENT '当前会话成员用户ID',
    `peer_user_id` BIGINT NOT NULL COMMENT '会话对方用户ID',
    `version` INT NOT NULL DEFAULT 0 COMMENT '成员业务状态手工CAS版本号',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_member_conversation_user` (`conversation_id`, `user_id`),
    KEY `idx_message_member_user` (`user_id`, `update_time`),
    KEY `idx_message_member_peer` (`user_id`, `peer_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私信会话参与者与对方映射表';

CREATE TABLE IF NOT EXISTS `app_message_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `message_no` VARCHAR(64) NOT NULL COMMENT '消息业务编号',
    `client_msg_id` VARCHAR(64) NULL COMMENT 'TIM客户端随机号或后端稳定幂等号',
    `conversation_id` BIGINT NULL COMMENT '所属会话主键ID，匹配前悄悄话可为空',
    `conversation_no` VARCHAR(64) NULL COMMENT '所属会话业务编号，匹配前悄悄话可为空',
    `sender_type` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '发送方类型：user-用户，system-系统',
    `sender_user_id` BIGINT NULL COMMENT '发送用户ID，系统提示可为空',
    `receiver_user_id` BIGINT NULL COMMENT '接收用户ID，系统提示可为空',
    `message_type` VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT '消息类型：text-普通文本，whisper-原悄悄话，whisper_reply-悄悄话回复，system_tip-系统提示',
    `content_text` TEXT NULL COMMENT '消息明文正文，业务写入时必填，合规到期后置空，禁止普通查询导出和日志输出',
    `send_status` VARCHAR(20) NOT NULL DEFAULT 'queued' COMMENT 'TIM投递状态：queued-待投递，sent-已发送，failed-发送失败',
    `receiver_read_status` VARCHAR(20) NOT NULL DEFAULT 'not_applicable' COMMENT '接收方已读状态：not_applicable-未送达或不适用，unread-未读，read-已读',
    `receiver_read_at` DATETIME NULL COMMENT '接收方确认已读时间',
    `tim_message_id` VARCHAR(128) NULL COMMENT '腾讯云TIM消息ID，消息映射唯一事实源',
    `tim_msg_key` VARCHAR(128) NULL COMMENT '腾讯云TIM消息唯一键或回调幂等键',
    `provider_sent_at` DATETIME NULL COMMENT '腾讯云TIM确认发送时间',
    `sent_at` DATETIME NULL COMMENT '本地确认进入已发送状态的时间',
    `reply_to_message_id` BIGINT NULL COMMENT '被回复消息主键ID，首版预留',
    `source_biz_type` VARCHAR(32) NULL COMMENT '来源业务类型：match-匹配，whisper-悄悄话，whisper_reply-悄悄话回复',
    `source_biz_no` VARCHAR(64) NULL COMMENT '来源业务编号',
    `failure_code` VARCHAR(40) NULL COMMENT '发送失败错误编码',
    `failure_reason` VARCHAR(200) NULL COMMENT '发送失败脱敏原因摘要',
    `isolated_at` DATETIME NULL COMMENT '消息退出普通业务查询的隔离时间',
    `purge_after` DATETIME NULL COMMENT '正文允许清空的时间，不用于删除消息元数据',
    `content_cleared_at` DATETIME NULL COMMENT '正文实际清空时间，为空表示仍在留存期内',
    `version` INT NOT NULL DEFAULT 0 COMMENT '发送状态手工CAS版本号',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_record_no` (`message_no`),
    UNIQUE KEY `uk_message_record_client` (`sender_user_id`, `client_msg_id`),
    UNIQUE KEY `uk_message_record_tim_key` (`tim_msg_key`),
    KEY `idx_message_record_conversation` (`conversation_id`, `create_time`),
    KEY `idx_message_record_receiver_unread` (`receiver_user_id`, `receiver_read_status`, `send_status`, `conversation_id`, `deleted`),
    KEY `idx_message_record_source` (`source_biz_type`, `source_biz_no`),
    KEY `idx_message_record_purge` (`purge_after`, `content_cleared_at`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日常私信和悄悄话消息明文归档及TIM唯一映射表';

CREATE TABLE IF NOT EXISTS `app_message_whisper` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `whisper_no` VARCHAR(64) NOT NULL COMMENT '悄悄话申请业务编号',
    `send_request_id` VARCHAR(64) NOT NULL COMMENT '发送悄悄话幂等请求编号',
    `reply_request_id` VARCHAR(64) NULL COMMENT '回复并匹配幂等请求编号',
    `sender_user_id` BIGINT NOT NULL COMMENT '悄悄话申请发送方用户ID',
    `receiver_user_id` BIGINT NOT NULL COMMENT '悄悄话申请接收方用户ID',
    `user_low_id` BIGINT NOT NULL COMMENT '双方用户中较小的用户ID',
    `user_high_id` BIGINT NOT NULL COMMENT '双方用户中较大的用户ID',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '悄悄话状态：pending-待回复，replied-已回复并匹配，expired-已过期，invalid-已失效',
    `active_marker` TINYINT NULL DEFAULT 1 COMMENT '待回复唯一标记：1-待回复，NULL-终态已释放',
    `version` INT NOT NULL DEFAULT 0 COMMENT '悄悄话状态手工CAS版本号',
    `pay_type` VARCHAR(20) NOT NULL COMMENT '申请支付方式：vip_free-会员免费，coin-千寻币',
    `payment_status` VARCHAR(20) NOT NULL DEFAULT 'paying' COMMENT '支付状态：paying-处理中，paid-已支付，refunding-退款中，refunded-已退款',
    `coin_amount` INT NOT NULL DEFAULT 0 COMMENT '本次实际消耗的千寻币数量',
    `benefit_date` DATE NULL COMMENT '免费权益归属日期，采用Asia/Shanghai时区',
    `quota_snapshot` INT NULL COMMENT '发送时每日免费次数配置快照',
    `asset_consume_flow_no` VARCHAR(64) NULL COMMENT '千寻币消费流水编号',
    `asset_refund_flow_no` VARCHAR(64) NULL COMMENT '千寻币补偿退款流水编号',
    `delivery_status` VARCHAR(20) NOT NULL DEFAULT 'queued' COMMENT '投递状态：queued-待投递，sent-已送达，failed-投递失败',
    `config_version` VARCHAR(32) NOT NULL COMMENT '发送时采用的消息规则版本',
    `expire_days_snapshot` INT NOT NULL DEFAULT 7 COMMENT '发送时有效天数配置快照',
    `cooldown_days_snapshot` INT NOT NULL DEFAULT 7 COMMENT '发送时再次申请冷却天数配置快照',
    `expires_at` DATETIME NOT NULL COMMENT '待回复状态到期时间',
    `cooldown_until` DATETIME NOT NULL COMMENT '到期后原发送方再次申请的冷却结束时间',
    `delivered_at` DATETIME NULL COMMENT '悄悄话确认有效送达时间',
    `receiver_read_at` DATETIME NULL COMMENT '接收方首次确认查看时间，不返回发送方',
    `replied_at` DATETIME NULL COMMENT '回复、匹配和会话原子完成时间',
    `invalid_reason` VARCHAR(40) NULL COMMENT '悄悄话失效原因编码',
    `invalid_time` DATETIME NULL COMMENT '悄悄话进入终态的业务时间',
    `match_id` BIGINT NULL COMMENT '回复生成或复用的匹配主键ID',
    `match_no` VARCHAR(64) NULL COMMENT '回复生成或复用的匹配业务编号',
    `conversation_id` BIGINT NULL COMMENT '回复生成或复用的私信会话主键ID',
    `conversation_no` VARCHAR(64) NULL COMMENT '回复生成或复用的私信会话业务编号',
    `request_message_id` BIGINT NULL COMMENT '原悄悄话对应消息主表主键ID，TIM映射由该消息读取',
    `reply_message_id` BIGINT NULL COMMENT '回复对应消息主表主键ID，TIM映射由该消息读取',
    `isolated_at` DATETIME NULL COMMENT '悄悄话退出普通业务查询的隔离时间',
    `purge_after` DATETIME NULL COMMENT '关联正文允许清空的时间',
    `anonymized_at` DATETIME NULL COMMENT '用户标识完成匿名化的时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_whisper_no` (`whisper_no`),
    UNIQUE KEY `uk_message_whisper_send_request` (`sender_user_id`, `send_request_id`),
    UNIQUE KEY `uk_message_whisper_reply_request` (`receiver_user_id`, `reply_request_id`),
    UNIQUE KEY `uk_message_whisper_active_pair` (`user_low_id`, `user_high_id`, `active_marker`),
    KEY `idx_message_whisper_receiver` (`receiver_user_id`, `status`, `create_time`),
    KEY `idx_message_whisper_sender` (`sender_user_id`, `status`, `create_time`),
    KEY `idx_message_whisper_expire` (`status`, `delivery_status`, `expires_at`),
    KEY `idx_message_whisper_free_quota` (`sender_user_id`, `benefit_date`, `pay_type`, `payment_status`),
    KEY `idx_message_whisper_purge` (`purge_after`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='悄悄话申请支付投递回复与状态迁移表';

CREATE TABLE IF NOT EXISTS `app_system_message` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `notice_no` VARCHAR(64) NOT NULL COMMENT '系统消息业务编号',
    `receiver_user_id` BIGINT NOT NULL COMMENT '接收用户ID',
    `producer_event_id` VARCHAR(128) NOT NULL COMMENT '上游稳定事件编号',
    `notification_type` VARCHAR(20) NOT NULL COMMENT '通知分类：governance-治理，asset-资产，invite-邀请，community-社区，platform-平台',
    `biz_type` VARCHAR(64) NOT NULL COMMENT '系统消息业务类型编码',
    `biz_no` VARCHAR(64) NULL COMMENT '上游关联业务编号',
    `template_code` VARCHAR(64) NOT NULL COMMENT '消息模板编码',
    `template_version` VARCHAR(32) NOT NULL COMMENT '消息模板版本号',
    `title_ciphertext` BLOB NULL COMMENT '标题AES-256-GCM密文',
    `title_iv` VARBINARY(12) NULL COMMENT '标题AES-GCM随机初始向量',
    `title_key_version` VARCHAR(32) NULL COMMENT '标题数据密钥版本',
    `title_hmac` CHAR(64) NULL COMMENT '标题HMAC-SHA256摘要',
    `content_ciphertext` MEDIUMBLOB NULL COMMENT '正文AES-256-GCM密文',
    `content_iv` VARBINARY(12) NULL COMMENT '正文AES-GCM随机初始向量',
    `content_key_version` VARCHAR(32) NULL COMMENT '正文数据密钥版本',
    `content_hmac` CHAR(64) NULL COMMENT '正文HMAC-SHA256摘要',
    `jump_type` VARCHAR(32) NOT NULL DEFAULT 'none' COMMENT '跳转类型：none-无跳转，miniapp-小程序页面，h5-H5页面，service-客服，chat-私信，profile-用户主页，community-社区，auth_center-认证中心，asset-资产，invite_center-邀请中心，appeal-申诉',
    `jump_value` VARCHAR(500) NULL COMMENT '经过白名单校验的跳转目标',
    `safety_required` TINYINT NOT NULL DEFAULT 0 COMMENT '受限账号必须可见标记：0-否，1-是',
    `read_at` DATETIME NULL COMMENT '用户批次曝光确认时间',
    `visible_until` DATETIME NOT NULL COMMENT '用户侧可见截止时间',
    `anonymized_at` DATETIME NULL COMMENT '注销后普通内容匿名化时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_system_message_no` (`notice_no`),
    UNIQUE KEY `uk_system_message_event` (`producer_event_id`, `receiver_user_id`, `biz_type`),
    KEY `idx_system_message_user_read` (`receiver_user_id`, `read_at`, `create_time`),
    KEY `idx_system_message_user_visible` (`receiver_user_id`, `visible_until`),
    KEY `idx_system_message_biz` (`biz_type`, `biz_no`),
    KEY `idx_system_message_cleanup` (`visible_until`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户系统站内消息表';

CREATE TABLE IF NOT EXISTS `app_assistant_message` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `assistant_message_no` VARCHAR(64) NOT NULL COMMENT '官方助手消息业务编号',
    `receiver_user_id` BIGINT NOT NULL COMMENT '接收用户ID',
    `topic_code` VARCHAR(64) NOT NULL COMMENT '助手主题编码，如首次介绍、安全或帮助',
    `content_version` VARCHAR(32) NOT NULL COMMENT '用户侧内容去重版本',
    `template_code` VARCHAR(64) NOT NULL COMMENT '助手模板编码',
    `template_version` VARCHAR(32) NOT NULL COMMENT '助手模板版本号',
    `title_ciphertext` BLOB NULL COMMENT '标题AES-256-GCM密文',
    `title_iv` VARBINARY(12) NULL COMMENT '标题AES-GCM随机初始向量',
    `title_key_version` VARCHAR(32) NULL COMMENT '标题数据密钥版本',
    `title_hmac` CHAR(64) NULL COMMENT '标题HMAC-SHA256摘要',
    `content_ciphertext` MEDIUMBLOB NULL COMMENT '内容AES-256-GCM密文',
    `content_iv` VARBINARY(12) NULL COMMENT '内容AES-GCM随机初始向量',
    `content_key_version` VARCHAR(32) NULL COMMENT '内容数据密钥版本',
    `content_hmac` CHAR(64) NULL COMMENT '内容HMAC-SHA256摘要',
    `action_type` VARCHAR(32) NOT NULL DEFAULT 'none' COMMENT '操作类型：none-无，h5-H5页面，wechat_service-微信客服，help-帮助',
    `action_value` VARCHAR(500) NULL COMMENT '经过白名单校验的操作目标',
    `read_at` DATETIME NULL COMMENT '用户批次曝光确认时间',
    `visible_from` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '消息生效时间',
    `visible_until` DATETIME NULL COMMENT '消息可选下线时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_assistant_message_no` (`assistant_message_no`),
    UNIQUE KEY `uk_assistant_message_user_topic` (`receiver_user_id`, `topic_code`, `content_version`),
    KEY `idx_assistant_message_user_read` (`receiver_user_id`, `read_at`, `create_time`),
    KEY `idx_assistant_message_visible` (`visible_from`, `visible_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官方助手低频消息与已读状态表';

CREATE TABLE IF NOT EXISTS `app_message_event_inbox` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `event_key` VARCHAR(160) NOT NULL COMMENT '可靠消费全局幂等键',
    `source_module` VARCHAR(32) NOT NULL COMMENT '来源模块：prd01-准入、prd02-关系、prd04-资产、prd05-社区治理、prd07-推广、community-社区运营、content-内容运营、tencent_im-腾讯IM',
    `event_type` VARCHAR(64) NOT NULL COMMENT '上游事件类型编码',
    `producer_event_id` VARCHAR(128) NOT NULL COMMENT '上游稳定事件编号',
    `biz_no` VARCHAR(64) NULL COMMENT '上游关联业务编号',
    `receiver_user_id` BIGINT NULL COMMENT '单用户事件接收用户ID',
    `payload_ciphertext` MEDIUMBLOB NULL COMMENT '处理前临时变量或回调载荷密文，不得包含聊天正文，处理结束后清空',
    `payload_iv` VARBINARY(12) NULL COMMENT '临时载荷AES-GCM随机初始向量',
    `payload_key_version` VARCHAR(32) NULL COMMENT '临时载荷数据密钥版本',
    `payload_hmac` CHAR(64) NULL COMMENT '临时载荷HMAC-SHA256摘要',
    `payload_expires_at` DATETIME NULL COMMENT '临时载荷最晚保留时间，为空表示无需临时载荷',
    `payload_cleared_at` DATETIME NULL COMMENT '临时载荷实际清空时间',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '处理状态：pending-待处理，processing-处理中，success-成功，failed-失败待重试，dead-死信',
    `retry_count` INT NOT NULL DEFAULT 0 COMMENT '已执行重试次数',
    `next_retry_time` DATETIME NULL COMMENT '下次允许重试时间',
    `processing_started_at` DATETIME NULL COMMENT '任务最近一次认领时间',
    `last_error_code` VARCHAR(40) NULL COMMENT '最后一次处理错误编码',
    `last_error_summary` VARCHAR(500) NULL COMMENT '最后一次处理脱敏错误摘要',
    `processed_at` DATETIME NULL COMMENT '处理成功时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_event_inbox_key` (`event_key`),
    KEY `idx_message_event_inbox_claim` (`status`, `next_retry_time`, `create_time`),
    KEY `idx_message_event_inbox_source` (`source_module`, `event_type`, `biz_no`),
    KEY `idx_message_event_inbox_timeout` (`status`, `processing_started_at`),
    KEY `idx_message_event_inbox_payload_cleanup` (`payload_expires_at`, `payload_cleared_at`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息中心上游事件与腾讯回调可靠收件箱';

CREATE TABLE IF NOT EXISTS `app_message_delivery_outbox` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `outbox_no` VARCHAR(64) NOT NULL COMMENT '可靠投递业务编号',
    `event_key` VARCHAR(160) NOT NULL COMMENT '聚合对象与动作稳定幂等键',
    `aggregate_type` VARCHAR(32) NOT NULL COMMENT '聚合类型：message-消息，whisper-悄悄话，system_message-系统消息，assistant-助手',
    `aggregate_id` BIGINT NOT NULL COMMENT '本地聚合对象主键ID',
    `aggregate_no` VARCHAR(64) NOT NULL COMMENT '本地聚合对象业务编号',
    `sender_user_id` BIGINT NULL COMMENT '发送用户ID，平台消息可为空',
    `receiver_user_id` BIGINT NOT NULL COMMENT '接收用户ID',
    `channel` VARCHAR(32) NOT NULL COMMENT '投递渠道：tencent_im-腾讯云TIM，wechat_subscribe-微信订阅消息',
    `event_type` VARCHAR(64) NOT NULL COMMENT '渠道事件类型，如文本、自定义卡片或刷新提示',
    `payload_json` JSON NULL COMMENT '仅保存协议版本和控制参数等非正文投递元数据',
    `protocol_version` INT NOT NULL DEFAULT 1 COMMENT '客户端自定义消息协议版本',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '投递状态：pending-待处理，processing-处理中，sent-已发送，failed-失败待重试，dead-死信',
    `retry_count` INT NOT NULL DEFAULT 0 COMMENT '已执行重试次数',
    `next_retry_time` DATETIME NULL COMMENT '下次允许重试时间',
    `processing_started_at` DATETIME NULL COMMENT '任务最近一次认领时间',
    `provider_msg_key` VARCHAR(128) NULL COMMENT '投递渠道返回的消息唯一标识',
    `last_error_code` VARCHAR(40) NULL COMMENT '最后一次投递错误编码',
    `last_error_summary` VARCHAR(500) NULL COMMENT '最后一次投递脱敏错误摘要',
    `sent_at` DATETIME NULL COMMENT '渠道确认发送成功时间',
    `callback_confirmed_at` DATETIME NULL COMMENT '腾讯云TIM后回调确认时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_delivery_outbox_no` (`outbox_no`),
    UNIQUE KEY `uk_message_delivery_event_channel` (`event_key`, `channel`),
    UNIQUE KEY `uk_message_delivery_provider` (`provider_msg_key`),
    KEY `idx_message_delivery_claim` (`status`, `next_retry_time`, `create_time`),
    KEY `idx_message_delivery_aggregate` (`aggregate_type`, `aggregate_id`),
    KEY `idx_message_delivery_timeout` (`status`, `processing_started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='腾讯云TIM与微信订阅消息可靠投递箱';

CREATE TABLE IF NOT EXISTS `app_user_im_account` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '本项目用户ID',
    `im_user_id` VARCHAR(64) NOT NULL COMMENT '不含手机号昵称的稳定腾讯云TIM用户账号',
    `sync_status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '同步状态：pending-待同步，synced-已同步，disabled-已禁用，failed-同步失败',
    `synced_at` DATETIME NULL COMMENT '最近一次同步成功时间',
    `disabled_at` DATETIME NULL COMMENT '腾讯云TIM账号禁用时间',
    `last_error_code` VARCHAR(40) NULL COMMENT '最近一次同步错误编码',
    `last_error_summary` VARCHAR(200) NULL COMMENT '最近一次同步脱敏错误摘要',
    `version` INT NOT NULL DEFAULT 0 COMMENT '账号同步状态手工CAS版本号',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_im_account_user` (`user_id`),
    UNIQUE KEY `uk_user_im_account_im_user` (`im_user_id`),
    KEY `idx_user_im_account_status` (`sync_status`, `update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台用户与腾讯云TIM账号稳定映射表';

CREATE TABLE IF NOT EXISTS `app_message_rule_version` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `version_no` VARCHAR(32) NOT NULL COMMENT '不可变消息规则版本号',
    `scope_code` VARCHAR(32) NOT NULL DEFAULT 'global' COMMENT '规则作用域编码，首版固定global',
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '版本状态：draft-草稿，published-已发布，retired-已退役',
    `active_marker` TINYINT NULL COMMENT '当前发布版本唯一标记：1-当前版本，NULL-非当前版本',
    `female_protection_enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '女性保护开关：0-关闭，1-开启',
    `female_protection_days` INT NOT NULL DEFAULT 3 COMMENT '女性保护期天数，允许1至30天',
    `whisper_expire_days` INT NOT NULL DEFAULT 7 COMMENT '悄悄话待回复有效天数，允许1至30天',
    `whisper_cooldown_days` INT NOT NULL DEFAULT 7 COMMENT '悄悄话到期后再次申请冷却天数，允许1至30天',
    `ordinary_message_retain_days` INT NOT NULL DEFAULT 180 COMMENT '普通消息终态隔离后正文保留天数',
    `system_message_visible_days` INT NOT NULL DEFAULT 730 COMMENT '系统消息用户侧可见天数',
    `report_evidence_retain_days` INT NOT NULL DEFAULT 1095 COMMENT '普通举报冻结证据保留天数',
    `severe_evidence_retain_days` INT NOT NULL DEFAULT 1825 COMMENT '严重违规冻结证据保留天数',
    `sensitive_audit_retain_days` INT NOT NULL DEFAULT 1095 COMMENT '敏感正文访问审计保留天数',
    `remark` VARCHAR(500) NOT NULL COMMENT '规则发布或退役原因',
    `published_by` BIGINT NULL COMMENT '发布管理员ID',
    `published_at` DATETIME NULL COMMENT '规则发布时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_rule_version_no` (`version_no`),
    UNIQUE KEY `uk_message_rule_active_scope` (`scope_code`, `active_marker`),
    KEY `idx_message_rule_status` (`scope_code`, `status`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='不可变消息业务规则版本表';

CREATE TABLE IF NOT EXISTS `app_message_runtime_control` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `control_key` VARCHAR(64) NOT NULL COMMENT '运行时控制项编码，首版固定global_send_enabled',
    `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '控制项状态：0-关闭，1-开启',
    `version` INT NOT NULL DEFAULT 0 COMMENT '多管理员修改手工CAS版本号',
    `reason` VARCHAR(500) NOT NULL COMMENT '本次变更原因，要求5至100字',
    `changed_by` BIGINT NOT NULL COMMENT '执行变更的管理员ID',
    `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '控制项生效时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_runtime_control_key` (`control_key`),
    KEY `idx_message_runtime_changed` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息发送即时安全总开关表';

CREATE TABLE IF NOT EXISTS `app_message_template_version` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `template_code` VARCHAR(64) NOT NULL COMMENT '稳定消息模板编码',
    `biz_type` VARCHAR(64) NOT NULL COMMENT '系统消息业务类型或助手主题编码',
    `notification_type` VARCHAR(20) NOT NULL COMMENT '通知分类：governance-治理，asset-资产，invite-邀请，community-社区，platform-平台，assistant-助手',
    `version_no` VARCHAR(32) NOT NULL COMMENT '不可变模板版本号',
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '模板状态：draft-草稿，published-已发布，retired-已退役',
    `active_marker` TINYINT NULL COMMENT '当前发布版本唯一标记：1-当前版本，NULL-非当前版本',
    `title_template` VARCHAR(256) NOT NULL COMMENT '标题结构化文本模板',
    `content_template` TEXT NOT NULL COMMENT '正文结构化文本模板',
    `allowed_variables_json` JSON NOT NULL COMMENT '允许变量名称类型必填性和脱敏级别JSON',
    `jump_type` VARCHAR(32) NOT NULL DEFAULT 'none' COMMENT '跳转或操作类型：系统消息支持none/miniapp/h5/service/chat/profile/community/auth_center/asset/invite_center/appeal；官方助手支持none/h5/wechat_service/help',
    `jump_value_template` VARCHAR(500) NULL COMMENT '经过白名单约束的跳转目标模板',
    `safety_required` TINYINT NOT NULL DEFAULT 0 COMMENT '受限账号必须可见标记：0-否，1-是',
    `published_by` BIGINT NULL COMMENT '发布管理员ID',
    `published_at` DATETIME NULL COMMENT '模板发布时间',
    `remark` VARCHAR(500) NOT NULL COMMENT '模板发布或退役原因',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_template_version` (`template_code`, `version_no`),
    UNIQUE KEY `uk_message_template_active` (`template_code`, `active_marker`),
    KEY `idx_message_template_biz` (`biz_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统消息与官方助手不可变模板版本表';

CREATE TABLE IF NOT EXISTS `app_message_sensitive_access_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `access_no` VARCHAR(64) NOT NULL COMMENT '敏感正文访问审计业务编号',
    `operator_id` BIGINT NOT NULL COMMENT '操作管理员ID',
    `operator_role_codes` VARCHAR(500) NOT NULL COMMENT '访问时管理员角色编码快照',
    `context_type` VARCHAR(20) NOT NULL COMMENT '案件上下文类型：report-举报案件，risk_case-风控案件',
    `context_no` VARCHAR(64) NOT NULL COMMENT '案件业务编号',
    `target_type` VARCHAR(20) NOT NULL COMMENT '访问目标类型：message-消息，whisper-悄悄话',
    `target_biz_no` VARCHAR(64) NOT NULL COMMENT '访问目标消息或悄悄话业务编号',
    `view_reason` VARCHAR(200) NOT NULL COMMENT '本次查看正文原因，要求5至100字',
    `result` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '访问结果：pending-校验中，allowed-允许，denied-拒绝，error-异常',
    `deny_reason_code` VARCHAR(40) NULL COMMENT '拒绝或失败原因编码',
    `request_id` VARCHAR(64) NOT NULL COMMENT '请求追踪编号',
    `client_ip` VARCHAR(64) NOT NULL COMMENT '访问端IPv4或IPv6地址',
    `user_agent_hash` CHAR(64) NULL COMMENT '访问端User-Agent的HMAC摘要',
    `accessed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '敏感访问尝试时间',
    `retain_until` DATETIME NOT NULL COMMENT '访问审计保留截止时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_message_sensitive_access_no` (`access_no`),
    KEY `idx_message_sensitive_operator` (`operator_id`, `accessed_at`),
    KEY `idx_message_sensitive_context` (`context_type`, `context_no`, `accessed_at`),
    KEY `idx_message_sensitive_target` (`target_type`, `target_biz_no`, `accessed_at`),
    KEY `idx_message_sensitive_retain` (`retain_until`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='案件上下文敏感正文访问追加审计表';

CREATE TABLE IF NOT EXISTS `community_report_evidence` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `evidence_no` VARCHAR(64) NOT NULL COMMENT '举报冻结证据业务编号',
    `report_id` BIGINT NOT NULL COMMENT '社区举报案件主键ID',
    `report_no` VARCHAR(64) NOT NULL COMMENT '社区举报案件业务编号',
    `evidence_type` VARCHAR(20) NOT NULL COMMENT '证据类型：target-被举报目标，context-必要上下文',
    `target_type` VARCHAR(20) NOT NULL COMMENT '证据目标类型：message-消息，whisper-悄悄话',
    `source_biz_no` VARCHAR(64) NOT NULL COMMENT '原消息或悄悄话业务编号',
    `conversation_no` VARCHAR(64) NULL COMMENT '证据所属私信会话业务编号',
    `sender_user_id` BIGINT NULL COMMENT '原消息发送用户ID',
    `receiver_user_id` BIGINT NULL COMMENT '原消息接收用户ID',
    `message_type` VARCHAR(20) NOT NULL COMMENT '原消息类型编码',
    `content_ciphertext` MEDIUMBLOB NOT NULL COMMENT '冻结时独立AES-256-GCM加密的正文',
    `content_iv` VARBINARY(12) NOT NULL COMMENT '冻结证据AES-GCM随机初始向量',
    `content_key_version` VARCHAR(32) NOT NULL COMMENT '冻结证据数据密钥版本',
    `content_hmac` CHAR(64) NOT NULL COMMENT '冻结证据正文HMAC-SHA256摘要',
    `event_time` DATETIME NOT NULL COMMENT '原消息业务发生时间',
    `context_order` SMALLINT NOT NULL DEFAULT 0 COMMENT '同一案件内证据上下文顺序',
    `severity` VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '证据严重等级：normal-普通，severe-严重',
    `snapshot_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '证据冻结时间',
    `retain_until` DATETIME NOT NULL COMMENT '证据保留截止时间，普通三年或严重五年',
    `anonymized_at` DATETIME NULL COMMENT '到期后证据身份匿名化时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID，系统任务可为空',
    `updated_by` BIGINT NULL COMMENT '更新人ID，系统任务可为空',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_community_report_evidence_no` (`evidence_no`),
    UNIQUE KEY `uk_community_report_evidence_source` (`report_id`, `source_biz_no`, `evidence_type`),
    KEY `idx_community_report_evidence_case` (`report_id`, `context_order`),
    KEY `idx_community_report_evidence_source` (`target_type`, `source_biz_no`),
    KEY `idx_community_report_evidence_retain` (`retain_until`, `severity`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天举报案件不可变加密证据表';

-- 已存在的PRD-05举报表只做兼容增量，不改变既有target_id字符串契约。
DROP PROCEDURE IF EXISTS prd03_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd03_add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE prd03_add_column_if_missing(
    IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
    ) THEN
        SET @prd03_sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
        PREPARE prd03_stmt FROM @prd03_sql;
        EXECUTE prd03_stmt;
        DEALLOCATE PREPARE prd03_stmt;
    END IF;
END $$
CREATE PROCEDURE prd03_add_index_if_missing(
    IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_definition TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
    ) THEN
        SET @prd03_sql = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_definition);
        PREPARE prd03_stmt FROM @prd03_sql;
        EXECUTE prd03_stmt;
        DEALLOCATE PREPARE prd03_stmt;
    END IF;
END $$
DELIMITER ;

CALL prd03_add_column_if_missing('app_message_record', 'receiver_read_status',
    'VARCHAR(20) NOT NULL DEFAULT ''not_applicable'' COMMENT ''接收方已读状态：not_applicable-未送达或不适用，unread-未读，read-已读'' AFTER `send_status`');
CALL prd03_add_column_if_missing('app_message_record', 'receiver_read_at',
    'DATETIME NULL COMMENT ''接收方确认已读时间'' AFTER `receiver_read_status`');
CALL prd03_add_index_if_missing('app_message_record', 'idx_message_record_receiver_unread',
    'INDEX `idx_message_record_receiver_unread` (`receiver_user_id`, `receiver_read_status`, `send_status`, `conversation_id`, `deleted`)');

-- 旧数据仅将已确认发送、尚无已读事实的消息迁移为未读；失败和待投递继续保持不适用。
UPDATE `app_message_record`
   SET `receiver_read_status` = 'unread'
 WHERE `send_status` = 'sent'
   AND `receiver_user_id` IS NOT NULL
   AND `receiver_read_status` = 'not_applicable'
   AND `receiver_read_at` IS NULL
   AND `deleted` = 0;

CALL prd03_add_column_if_missing('community_report', 'client_report_id',
    'VARCHAR(64) NULL COMMENT ''客户端举报幂等编号，新客户端必填''');
CALL prd03_add_column_if_missing('community_report', 'reported_user_id',
    'BIGINT NULL COMMENT ''服务端解析的被举报用户ID''');
CALL prd03_add_column_if_missing('community_report', 'target_biz_no',
    'VARCHAR(64) NULL COMMENT ''私信会话消息或悄悄话业务编号''');
CALL prd03_add_column_if_missing('community_report', 'source_scene',
    'VARCHAR(32) NOT NULL DEFAULT ''community'' COMMENT ''举报来源：community-社区，chat-私信，whisper-悄悄话''');
CALL prd03_add_column_if_missing('community_report', 'snapshot_status',
    'VARCHAR(20) NOT NULL DEFAULT ''not_required'' COMMENT ''证据快照状态：not_required-无需，complete-完整，partial-待补证''');
CALL prd03_add_index_if_missing('community_report', 'uk_community_report_client',
    'UNIQUE INDEX `uk_community_report_client` (`reporter_id`, `client_report_id`)');
CALL prd03_add_index_if_missing('community_report', 'idx_community_report_target_biz',
    'INDEX `idx_community_report_target_biz` (`target_type`, `target_biz_no`, `deleted`)');
CALL prd03_add_index_if_missing('community_report', 'idx_community_report_reported',
    'INDEX `idx_community_report_reported` (`reported_user_id`, `status`, `update_time`)');

DROP PROCEDURE IF EXISTS prd03_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd03_add_index_if_missing;

INSERT INTO `app_message_runtime_control`
(`control_key`, `enabled`, `version`, `reason`, `changed_by`, `changed_at`,
 `create_time`, `update_time`, `created_by`, `updated_by`, `deleted`)
SELECT 'global_send_enabled', 1, 0, '初始化消息发送总开关', 0, CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0
WHERE NOT EXISTS (
    SELECT 1 FROM `app_message_runtime_control`
     WHERE `control_key` = 'global_send_enabled' AND `deleted` = 0
);

-- 首版普通规则。后续只能通过管理接口发布新版本，不原地修改历史版本。
INSERT IGNORE INTO `app_message_rule_version`
(`version_no`, `scope_code`, `status`, `active_marker`,
 `female_protection_enabled`, `female_protection_days`,
 `whisper_expire_days`, `whisper_cooldown_days`,
 `ordinary_message_retain_days`, `system_message_visible_days`,
 `report_evidence_retain_days`, `severe_evidence_retain_days`,
 `sensitive_audit_retain_days`, `remark`, `published_by`, `published_at`,
 `create_time`, `update_time`, `created_by`, `updated_by`, `deleted`)
VALUES
('MSG-CFG-INIT-001', 'global', 'published', 1,
 1, 3, 7, 7, 180, 730, 1095, 1825, 1095,
 'PRD-03首版默认规则：女性保护3天、悄悄话有效及冷却各7天',
 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0);

-- 迁移前已经存在的有效匹配幂等补齐私信会话。普通匹配应用女性保护，悄悄话回复不重复保护。
INSERT IGNORE INTO `app_message_conversation`
(`conversation_no`, `tim_conversation_id`, `match_id`, `match_no`,
 `user_low_id`, `user_high_id`, `status`, `active_marker`, `config_version`,
 `protection_enabled`, `female_user_id`, `male_user_id`, `protection_until`,
 `last_message_time`, `version`, `create_time`, `update_time`,
 `created_by`, `updated_by`, `deleted`)
SELECT CONCAT('CV-MIG-', m.id), CONCAT('C2C_PAIR_', m.user_low_id, '_', m.user_high_id),
       m.id, m.match_no, m.user_low_id, m.user_high_id, 'active', 1,
       COALESCE(rule.version_no, 'MSG-CFG-INIT-001'),
       CASE WHEN m.primary_source <> 'whisper_reply'
                  AND COALESCE(rule.female_protection_enabled, 1) = 1
                  AND ((low_user.gender = 'FEMALE' AND high_user.gender = 'MALE')
                    OR (low_user.gender = 'MALE' AND high_user.gender = 'FEMALE'))
            THEN 1 ELSE 0 END,
       CASE WHEN low_user.gender = 'FEMALE' THEN m.user_low_id
            WHEN high_user.gender = 'FEMALE' THEN m.user_high_id ELSE NULL END,
       CASE WHEN low_user.gender = 'MALE' THEN m.user_low_id
            WHEN high_user.gender = 'MALE' THEN m.user_high_id ELSE NULL END,
       CASE WHEN m.primary_source <> 'whisper_reply'
                  AND COALESCE(rule.female_protection_enabled, 1) = 1
                  AND ((low_user.gender = 'FEMALE' AND high_user.gender = 'MALE')
                    OR (low_user.gender = 'MALE' AND high_user.gender = 'FEMALE'))
            THEN DATE_ADD(COALESCE(m.matched_time, m.create_time),
                          INTERVAL COALESCE(rule.female_protection_days, 3) DAY)
            ELSE NULL END,
       COALESCE(m.matched_time, m.create_time), 0,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0
FROM `app_relation_match` m
LEFT JOIN `app_user` low_user ON low_user.id = m.user_low_id AND low_user.deleted = 0
LEFT JOIN `app_user` high_user ON high_user.id = m.user_high_id AND high_user.deleted = 0
LEFT JOIN (
    SELECT version_no, female_protection_enabled, female_protection_days
      FROM `app_message_rule_version`
     WHERE scope_code = 'global' AND active_marker = 1 AND deleted = 0
     ORDER BY id DESC LIMIT 1
) rule ON 1 = 1
LEFT JOIN `app_message_conversation` existing
       ON existing.match_id = m.id AND existing.deleted = 0
WHERE m.match_status = 'matched' AND m.active_marker = 1 AND m.deleted = 0
  AND existing.id IS NULL;

-- 每个有效会话固定补齐双方成员；唯一键保证脚本重复执行不会产生重复成员。
INSERT IGNORE INTO `app_message_conversation_member`
(`conversation_id`, `conversation_no`, `user_id`, `peer_user_id`, `version`,
 `create_time`, `update_time`, `created_by`, `updated_by`, `deleted`)
SELECT c.id, c.conversation_no, c.user_low_id, c.user_high_id, 0,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0
  FROM `app_message_conversation` c
 WHERE c.status = 'active' AND c.active_marker = 1 AND c.deleted = 0
UNION ALL
SELECT c.id, c.conversation_no, c.user_high_id, c.user_low_id, 0,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0
  FROM `app_message_conversation` c
 WHERE c.status = 'active' AND c.active_marker = 1 AND c.deleted = 0;

-- 五类系统消息与官方助手首版模板。仅种模板，不预生成任何用户消息。
INSERT IGNORE INTO `app_message_template_version`
(`template_code`, `biz_type`, `notification_type`, `version_no`, `status`, `active_marker`,
 `title_template`, `content_template`, `allowed_variables_json`,
 `jump_type`, `jump_value_template`, `safety_required`,
 `published_by`, `published_at`, `remark`,
 `create_time`, `update_time`, `created_by`, `updated_by`, `deleted`)
VALUES
('report_result', 'report_result', 'governance', 'v1', 'published', 1,
 '举报处理结果', '你的举报处理进度：{{result}}。', '{"result":{"required":true}}',
 'none', NULL, 1, 0, CURRENT_TIMESTAMP, 'PRD-03治理类默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('violation_result', 'violation_result', 'governance', 'v1', 'published', 1,
 '账号治理结果', '{{result}}。', '{"result":{"required":true}}',
 'none', NULL, 1, 0, CURRENT_TIMESTAMP, 'PRD-03处罚类默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('content_review_result', 'content_review_result', 'governance', 'v1', 'published', 1,
 '内容审核结果', '你的{{contentType}}审核结果：{{result}}。',
 '{"contentType":{"required":true},"result":{"required":true}}',
 'community', '/pages/community/index', 0, 0, CURRENT_TIMESTAMP, 'PRD-03内容治理默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('asset_result', 'asset_result', 'asset', 'v1', 'published', 1,
 '资产变动通知', '{{result}}', '{"result":{"required":true}}',
 'asset', '/pages/asset/index', 1, 0, CURRENT_TIMESTAMP, 'PRD-03资产类默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('invite_result', 'invite_result', 'invite', 'v1', 'published', 1,
 '邀请结果通知', '{{result}}', '{"result":{"required":true}}',
 'invite_center', '/pages/invite/index', 0, 0, CURRENT_TIMESTAMP, 'PRD-03邀请类默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('community_interaction_summary', 'community_interaction_summary', 'community', 'v1', 'published', 1,
 '社区互动提醒', '{{summary}}', '{"summary":{"required":true}}',
 'community', '/pages/community/index', 0, 0, CURRENT_TIMESTAMP, 'PRD-03社区类默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('community_hot_topic', 'community_hot_topic', 'community', 'v1', 'published', 1,
 '今日社区热点', '{{summary}}', '{"summary":{"required":true}}',
 'community', '/pages/community/index', 0, 0, CURRENT_TIMESTAMP, 'PRD-03社区热点默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('featured_content', 'featured_content', 'community', 'v1', 'published', 1,
 '精选内容', '{{summary}}', '{"summary":{"required":true}}',
 'community', '/pages/community/index', 0, 0, CURRENT_TIMESTAMP, 'PRD-03社区精选默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('community_activity', 'community_activity', 'community', 'v1', 'published', 1,
 '社区活动', '{{summary}}', '{"summary":{"required":true}}',
 'community', '/pages/community/index', 0, 0, CURRENT_TIMESTAMP, 'PRD-03社区活动默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('community_recall', 'community_recall', 'community', 'v1', 'published', 1,
 '社区动态提醒', '{{summary}}', '{"summary":{"required":true}}',
 'community', '/pages/community/index', 0, 0, CURRENT_TIMESTAMP, 'PRD-03社区召回默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('platform_announcement', 'platform_announcement', 'platform', 'v1', 'published', 1,
 '{{announcementTitle}}', '{{announcementText}}',
 '{"announcementTitle":{"required":true},"announcementText":{"required":true}}',
 'none', NULL, 1, 0, CURRENT_TIMESTAMP, 'PRD-03平台类默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('account_security', 'account_security', 'platform', 'v1', 'published', 1,
 '账号安全提醒', '{{result}}', '{"result":{"required":true}}',
 'none', NULL, 1, 0, CURRENT_TIMESTAMP, 'PRD-03账号安全默认模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0),
('assistant_getting_started', 'getting_started', 'assistant', 'v1', 'published', 1,
 '欢迎使用消息中心', '匹配成功后可以发送私信；悄悄话回复成功后会自动转为私信会话。', '[]',
 'help', '/pages/help/message-center', 1, 0, CURRENT_TIMESTAMP, 'PRD-03官方助手默认引导模板',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0);

-- 后端功能权限统一挂到现有 App 用户菜单，均为隐藏按钮权限，不新增前端页面。
INSERT INTO `sys_menu`
(`parent_id`, `menu_name`, `menu_type`, `perms`, `menu_sort`, `visible`, `status`, `remark`,
 `create_time`, `update_time`)
SELECT parent.id, seed.menu_name, 'F', seed.perms, seed.menu_sort, 0, 'ENABLED', seed.remark,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `sys_menu` parent
JOIN (
    SELECT '查看用户消息摘要' menu_name, 'message:summary:view' perms, 20 menu_sort,
           '查看App用户消息互动摘要' remark
    UNION ALL SELECT '查看用户私信消息', 'message:conversation:list', 21, '脱敏查看App用户私信消息发送与已读元数据'
    UNION ALL SELECT '查看用户悄悄话', 'message:whisper:list', 22, '脱敏查看App用户悄悄话元数据'
    UNION ALL SELECT '查看用户系统/助手消息', 'message:system:list', 23, '查看App用户系统和官方助手消息元数据'
    UNION ALL SELECT '查询消息记录', 'message:record:list', 24, '查询消息、悄悄话、助手和系统消息元数据'
    UNION ALL SELECT '导出消息记录', 'message:record:export', 25, '仅导出固定白名单消息元数据字段'
    UNION ALL SELECT '查看消息配置', 'message:config:view', 26, '查看消息规则版本和运行时开关'
    UNION ALL SELECT '编辑消息配置', 'message:config:edit', 27, '发布消息规则版本和修改安全总开关'
    UNION ALL SELECT '查看消息模板', 'message:template:view', 28, '查看系统消息和官方助手模板版本'
    UNION ALL SELECT '编辑消息模板', 'message:template:edit', 29, '发布系统消息和官方助手模板版本'
) seed
WHERE parent.perms = 'user:app:list'
  AND parent.menu_type = 'C'
  AND parent.status = 'ENABLED'
  AND parent.deleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM `sys_menu` existing
       WHERE existing.perms = seed.perms AND existing.menu_type = 'F' AND existing.deleted = 0
  );

INSERT INTO `sys_menu`
(`parent_id`, `menu_name`, `menu_type`, `perms`, `menu_sort`, `visible`, `status`, `remark`,
 `create_time`, `update_time`)
SELECT parent.id, '查看用户高敏消息正文', 'F', 'message:sensitive-content:view', 30, 0, 'ENABLED',
       '在App用户消息互动中二次确认、填写原因后按条查看正文并记录审计',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `sys_menu` parent
WHERE parent.perms = 'user:app:list'
  AND parent.menu_type = 'C'
  AND parent.status = 'ENABLED'
  AND parent.deleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM `sys_menu`
       WHERE perms = 'message:sensitive-content:view' AND menu_type = 'F' AND deleted = 0
  )
LIMIT 1;

-- 举报正文查看权限挂到举报处理页；风险案件权限仅预留且默认禁用。
INSERT INTO `sys_menu`
(`parent_id`, `menu_name`, `menu_type`, `perms`, `menu_sort`, `visible`, `status`, `remark`,
 `create_time`, `update_time`)
SELECT parent.id, '查看举报聊天证据正文', 'F', 'message:report-context:view', 30, 0, 'ENABLED',
       '仅在有效举报案件上下文内按条查看并记录审计', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `sys_menu` parent
WHERE parent.perms = 'community:report:list'
  AND parent.menu_type = 'C'
  AND parent.status = 'ENABLED'
  AND parent.deleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM `sys_menu`
       WHERE perms = 'message:report-context:view' AND menu_type = 'F' AND deleted = 0
  )
LIMIT 1;

INSERT INTO `sys_menu`
(`parent_id`, `menu_name`, `menu_type`, `perms`, `menu_sort`, `visible`, `status`, `remark`,
 `create_time`, `update_time`)
SELECT parent.id, '查看风控案件聊天正文', 'F', 'message:risk-context:view', 31, 0, 'DISABLED',
       '首版仅预留，缺少正式风控案件事实源时禁止启用', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `sys_menu` parent
WHERE parent.perms = 'community:report:list'
  AND parent.menu_type = 'C'
  AND parent.deleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM `sys_menu`
       WHERE perms = 'message:risk-context:view' AND menu_type = 'F' AND deleted = 0
  )
LIMIT 1;

-- 当前基础脚本只定义超级管理员；其他业务角色按正式角色矩阵由部署清单显式授权。
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT role.id, menu.id
FROM `sys_role` role
JOIN `sys_menu` menu ON menu.perms IN (
    'message:summary:view', 'message:conversation:list', 'message:whisper:list',
    'message:system:list', 'message:record:list', 'message:record:export',
    'message:config:view', 'message:config:edit', 'message:template:view',
    'message:template:edit', 'message:report-context:view', 'message:sensitive-content:view'
) AND menu.status = 'ENABLED' AND menu.deleted = 0
WHERE role.role_code = 'super_admin' AND role.status = 'ENABLED' AND role.deleted = 0;
