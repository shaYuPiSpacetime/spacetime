-- =====================================================
-- PRD-02 关系反馈与互动链路数据库基线
-- 所有关系事实永久保留；deleted 仅为项目统一逻辑删除字段，不开放删除入口。
-- =====================================================

CREATE TABLE IF NOT EXISTS `app_relation_like` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `like_no` VARCHAR(64) NOT NULL COMMENT '喜欢业务编号，前缀LIK-',
    `request_id` VARCHAR(64) NOT NULL COMMENT '客户端发起喜欢幂等键',
    `from_user_id` BIGINT NOT NULL COMMENT '发起喜欢的用户ID',
    `to_user_id` BIGINT NOT NULL COMMENT '接收喜欢的用户ID',
    `source_scene` VARCHAR(32) NOT NULL DEFAULT 'profile' COMMENT '喜欢来源：fate-觅缘，featured-精选，ideal-理想型，profile-婚恋主页，likes_me-喜欢我的，recent_viewers-最近访客',
    `like_status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '喜欢状态：active-有效，cancelled-已取消，invalid-已失效',
    `active_marker` TINYINT DEFAULT 1 COMMENT '有效唯一标记：1-有效，NULL-已结束',
    `liked_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '喜欢生效时间',
    `cancelled_time` DATETIME DEFAULT NULL COMMENT '取消喜欢时间',
    `invalid_reason` VARCHAR(32) DEFAULT NULL COMMENT '失效原因：like_cancelled-取消喜欢，blocked-任一方拉黑，account_frozen-账号冻结，account_deleted-账号注销，risk_banned-风控封禁，certification_revoked-认证失效',
    `invalid_time` DATETIME DEFAULT NULL COMMENT '取消或失效的业务事件时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID，移动端事件可写当前用户',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除，本模块不开放删除入口',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_like_no` (`like_no`),
    UNIQUE KEY `uk_like_request` (`from_user_id`, `request_id`),
    UNIQUE KEY `uk_like_active_pair` (`from_user_id`, `to_user_id`, `active_marker`),
    KEY `idx_like_to_status_time` (`to_user_id`, `like_status`, `deleted`, `liked_time`, `id`),
    KEY `idx_like_from_status_time` (`from_user_id`, `like_status`, `deleted`, `liked_time`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户喜欢关系生命周期事实表';

CREATE TABLE IF NOT EXISTS `app_relation_visit` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `visit_no` VARCHAR(64) NOT NULL COMMENT '访客展示记录业务编号，前缀VIS-',
    `visitor_user_id` BIGINT NOT NULL COMMENT '访问者用户ID',
    `target_user_id` BIGINT NOT NULL COMMENT '被访问者用户ID',
    `source_scene` VARCHAR(32) NOT NULL DEFAULT 'profile' COMMENT '本展示记录首次访问来源：fate-觅缘，featured-精选，ideal-理想型，profile-婚恋主页，likes_me-喜欢我的，recent_viewers-最近访客；归并时不覆盖',
    `visit_status` VARCHAR(20) NOT NULL DEFAULT 'visible' COMMENT '访客记录状态：visible-窗口内可见，expired_window-已超展示窗口，invalid-关系已失效',
    `first_visit_time` DATETIME NOT NULL COMMENT '本展示记录首次访问时间',
    `last_visit_time` DATETIME NOT NULL COMMENT '最近一次实际访问时间，滚动30分钟归并依据',
    `pv_count` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '本展示记录包含的实际访问次数',
    `invalid_reason` VARCHAR(32) DEFAULT NULL COMMENT '失效原因：blocked-任一方拉黑，account_frozen-账号冻结，account_deleted-账号注销，risk_banned-风控封禁，certification_revoked-认证失效',
    `invalid_time` DATETIME DEFAULT NULL COMMENT '关系失效业务时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID，移动端事件可写当前用户',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除，本模块不开放删除入口',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_visit_no` (`visit_no`),
    KEY `idx_visit_target_time_user` (`target_user_id`, `visit_status`, `deleted`, `last_visit_time`, `visitor_user_id`),
    KEY `idx_visit_visitor_time` (`visitor_user_id`, `visit_status`, `deleted`, `last_visit_time`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='访客30分钟归并展示记录表';

CREATE TABLE IF NOT EXISTS `app_relation_visit_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `event_no` VARCHAR(64) NOT NULL COMMENT '单次主页进入事件幂等编号',
    `visit_id` BIGINT DEFAULT NULL COMMENT '归并后的访客展示记录ID',
    `visitor_user_id` BIGINT NOT NULL COMMENT '访问者用户ID',
    `target_user_id` BIGINT NOT NULL COMMENT '被访问者用户ID',
    `source_scene` VARCHAR(32) NOT NULL DEFAULT 'profile' COMMENT '本次实际访问来源：fate-觅缘，featured-精选，ideal-理想型，profile-婚恋主页，likes_me-喜欢我的，recent_viewers-最近访客',
    `visit_time` DATETIME NOT NULL COMMENT '经服务端校正后的实际访问时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID，移动端事件可写当前用户',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除，本模块不开放删除入口',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_visit_event_no` (`event_no`),
    KEY `idx_visit_event_pair_time` (`visitor_user_id`, `target_user_id`, `visit_time`),
    KEY `idx_visit_event_target_time_user` (`target_user_id`, `visit_time`, `visitor_user_id`, `visit_id`),
    KEY `idx_visit_event_record` (`visit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每次实际主页访问事件表';

CREATE TABLE IF NOT EXISTS `app_relation_visit_cursor` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `visitor_user_id` BIGINT NOT NULL COMMENT '访问者用户ID',
    `target_user_id` BIGINT NOT NULL COMMENT '被访问者用户ID',
    `current_visit_id` BIGINT DEFAULT NULL COMMENT '当前允许继续归并的访客展示记录ID',
    `last_visit_time` DATETIME DEFAULT NULL COMMENT '最近一次成功计入PV的时间，滚动30分钟归并唯一时间依据',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID，系统初始化可为空',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除，本模块不开放删除入口',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_visit_cursor_pair` (`visitor_user_id`, `target_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='访客滚动30分钟归并游标表';

CREATE TABLE IF NOT EXISTS `app_relation_match` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `match_no` VARCHAR(64) NOT NULL COMMENT '匹配生命周期业务编号，前缀MAT-',
    `user_low_id` BIGINT NOT NULL COMMENT '匹配双方中较小的用户ID',
    `user_high_id` BIGINT NOT NULL COMMENT '匹配双方中较大的用户ID',
    `primary_source` VARCHAR(40) NOT NULL COMMENT '首次触发来源：double_like-双方互送爱心，featured_heart_return_like-精选心动后回爱心，whisper_reply-悄悄话回复',
    `match_status` VARCHAR(20) NOT NULL DEFAULT 'matched' COMMENT '匹配状态：matched-匹配有效，invalid-匹配失效',
    `active_marker` TINYINT DEFAULT 1 COMMENT '有效唯一标记：1-匹配有效，NULL-匹配已失效',
    `matched_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '匹配生命周期建立时间',
    `invalid_reason` VARCHAR(32) DEFAULT NULL COMMENT '失效原因：like_cancelled-最后一个爱心来源撤销，blocked-任一方拉黑，account_frozen-账号冻结，account_deleted-账号注销，risk_banned-风控封禁，certification_revoked-认证失效',
    `invalid_time` DATETIME DEFAULT NULL COMMENT '匹配失效业务时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID，系统关系事件可为空',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除，本模块不开放删除入口',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_match_no` (`match_no`),
    UNIQUE KEY `uk_match_active_pair` (`user_low_id`, `user_high_id`, `active_marker`),
    KEY `idx_match_low_status_time` (`user_low_id`, `match_status`, `deleted`, `matched_time`, `id`),
    KEY `idx_match_high_status_time` (`user_high_id`, `match_status`, `deleted`, `matched_time`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='无序用户对匹配生命周期表';

CREATE TABLE IF NOT EXISTS `app_relation_match_source` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `source_no` VARCHAR(64) NOT NULL COMMENT '匹配来源明细业务编号，前缀MTS-',
    `match_id` BIGINT NOT NULL COMMENT '所属匹配生命周期ID',
    `source_type` VARCHAR(40) NOT NULL COMMENT '匹配来源：double_like-双方互送爱心，featured_heart_return_like-精选心动后回爱心，whisper_reply-悄悄话回复',
    `source_event_no` VARCHAR(128) NOT NULL COMMENT '上游来源事件唯一编号',
    `source_status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '来源状态：active-有效，revoked-来源已撤销，invalid-随关系失效',
    `effective_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '来源生效时间',
    `revoked_time` DATETIME DEFAULT NULL COMMENT '来源撤销时间',
    `invalid_reason` VARCHAR(32) DEFAULT NULL COMMENT '撤销或失效原因：like_cancelled-取消喜欢，blocked-任一方拉黑，account_frozen-账号冻结，account_deleted-账号注销，risk_banned-风控封禁，certification_revoked-认证失效',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID，系统关系事件可为空',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除，本模块不开放删除入口',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_match_source_no` (`source_no`),
    UNIQUE KEY `uk_match_source_event` (`source_type`, `source_event_no`),
    KEY `idx_match_source_status` (`match_id`, `source_status`, `effective_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='匹配生命周期来源明细表';

CREATE TABLE IF NOT EXISTS `app_relation_match_popup` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `match_id` BIGINT NOT NULL COMMENT '所属匹配生命周期ID',
    `match_no` VARCHAR(64) NOT NULL COMMENT '匹配生命周期业务编号，便于幂等与排查',
    `user_id` BIGINT NOT NULL COMMENT '弹窗所属用户ID',
    `popup_status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '弹窗状态：pending-待展示或待回执，read-已读，cancelled-展示前已取消',
    `delivered_time` DATETIME DEFAULT NULL COMMENT '待展示接口成功返回时间，仅用于诊断，不代表已读',
    `read_time` DATETIME DEFAULT NULL COMMENT '用户主动动作回执时间',
    `read_action` VARCHAR(32) DEFAULT NULL COMMENT '已读动作：later-稍后，close-关闭，profile-查看主页，chat-去聊天，system_back-系统返回',
    `cancelled_time` DATETIME DEFAULT NULL COMMENT '匹配在弹窗展示前失效的时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID，系统关系事件可为空',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除，本模块不开放删除入口',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_match_popup_user` (`match_id`, `user_id`),
    KEY `idx_popup_user_status_time` (`user_id`, `popup_status`, `deleted`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='匹配成功弹窗用户独立状态表';
