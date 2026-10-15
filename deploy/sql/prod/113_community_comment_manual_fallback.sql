-- 评论机审异常转人工：仅补缺失的状态字典和回执文案，不覆盖运营已有配置。
-- 可重复执行；不修改评论、用户、审核历史或公开计数。

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark)
SELECT 'community_comment_status', 0, '待人工审核', 'pending', 1, 'ENABLED', '评论机审异常人工审核队列'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data
    WHERE dict_type = 'community_comment_status' AND dict_value = 'pending' AND deleted = 0
);

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'community.copy.comment_pending', '评论已提交，等待人工审核', 'COMMUNITY_COPY', 'TEXT', 0,
       'ENABLED', '评论进入人工审核队列的提交回执'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'community.copy.comment_pending'
);
