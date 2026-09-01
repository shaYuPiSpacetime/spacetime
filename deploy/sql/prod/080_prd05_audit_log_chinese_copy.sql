-- PRD-05 社区治理操作日志中文文案。
-- 服务端只保存稳定技术码，管理端展示文案统一从 COMMUNITY_COPY 读取。

INSERT INTO app_config (
    config_key, config_value, config_group, config_type,
    public_visible, status, remark, create_time, update_time, deleted
)
VALUES
    ('community.copy.audit_operator_system', '系统', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志操作人', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_operator_wechat', '微信内容安全', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志操作人', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_operator_admin', '管理员', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志操作人', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_machine', '机器审核', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_media_callback', '微信媒体审核回调', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_restore_comment', '恢复评论', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_restore_content', '恢复内容', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_approve', '审核通过', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_reject', '审核驳回', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_block_content', '下架内容', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_block_comment', '屏蔽评论', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_pending_manual', '转人工复核', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_warn_user', '警告用户', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_mute_user', '禁言用户', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_ip_block', '网络地址封禁', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_freeze_user', '冻结账号', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_processing', '标记处理中', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_report_valid', '判定举报成立', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_report_invalid', '判定举报不成立', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_report_merged', '合并举报', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_no_punishment', '不予处罚', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_topic_create', '创建话题', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_export_create', '创建导出任务', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_create', '创建记录', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_update', '更新记录', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_status', '修改状态', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_save', '保存配置', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_action_system', '系统处理', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志动作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_media_pending', '等待微信媒体审核结果', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_machine_disabled', '机器审核未启用，已转人工复核', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_provider_disabled', '内容安全服务未启用，已转人工复核', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_wechat_risky', '微信内容安全审核未通过', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_wechat_review', '微信内容安全结果需人工复核', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_wechat_error', '微信内容安全服务异常，已转人工复核', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_media_callback', '微信媒体审核结果已返回', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_machine_pass', '机器审核通过', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_machine_reject', '机器审核未通过', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_machine_review', '机器审核结果需人工复核', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_machine_complete', '机器审核已完成', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.audit_remark_recorded', '处理说明已记录', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '审计日志说明', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value), config_group = VALUES(config_group),
    config_type = VALUES(config_type), public_visible = VALUES(public_visible),
    status = VALUES(status), remark = VALUES(remark), update_time = CURRENT_TIMESTAMP, deleted = 0;
