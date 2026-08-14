-- 系统消息与官方助手明文展示演示数据；面向现有前 3 个未删除 App 用户，重复执行不重复插入。

INSERT INTO app_system_message
    (notice_no, receiver_user_id, producer_event_id, notification_type, biz_type, biz_no,
     template_code, template_version, title_text, content_text, content_format,
     jump_type, action_text, jump_value, safety_required, visible_until,
     create_time, update_time, deleted)
SELECT CONCAT('NTF-DEMO-PLAIN-', u.id, '-01'), u.id,
       CONCAT('DEMO-PLAIN-SYSTEM-', u.id, '-01'), 'governance', 'report_result',
       CONCAT('CASE-DEMO-', u.id), 'demo_report_result', 'v1',
       '举报处理结果通知',
       '你提交的举报已完成核查。平台已根据社区规范处理，本消息内容可在后台详情中直接查看。',
       'plain_text', 'none', NULL, NULL, 1, DATE_ADD(NOW(), INTERVAL 2 YEAR),
       NOW(), NOW(), 0
  FROM (SELECT id FROM app_user WHERE deleted=0 ORDER BY id LIMIT 3) u
 WHERE NOT EXISTS (
       SELECT 1 FROM app_system_message m
        WHERE m.notice_no=CONCAT('NTF-DEMO-PLAIN-', u.id, '-01'));

INSERT INTO app_system_message
    (notice_no, receiver_user_id, producer_event_id, notification_type, biz_type, biz_no,
     template_code, template_version, title_text, content_text, content_format,
     jump_type, action_text, jump_value, safety_required, visible_until,
     create_time, update_time, deleted)
SELECT CONCAT('NTF-DEMO-PLAIN-', u.id, '-02'), u.id,
       CONCAT('DEMO-PLAIN-SYSTEM-', u.id, '-02'), 'asset', 'asset_arrival',
       CONCAT('ASSET-DEMO-', u.id), 'demo_asset_arrival', 'v1',
       '权益到账提醒',
       '你的会员权益已经到账，生效时间和有效期请以资产中心展示为准。',
       'plain_text', 'asset', '查看权益', '/pages/assets/index', 0,
       DATE_ADD(NOW(), INTERVAL 2 YEAR), NOW(), NOW(), 0
  FROM (SELECT id FROM app_user WHERE deleted=0 ORDER BY id LIMIT 3) u
 WHERE NOT EXISTS (
       SELECT 1 FROM app_system_message m
        WHERE m.notice_no=CONCAT('NTF-DEMO-PLAIN-', u.id, '-02'));

INSERT INTO app_assistant_message
    (assistant_message_no, receiver_user_id, topic_code, content_version,
     template_code, template_version, title_text, content_text, card_type,
     action_type, action_text, action_value, visible_from, visible_until,
     create_time, update_time, deleted)
SELECT CONCAT('AST-DEMO-PLAIN-', u.id, '-01'), u.id, 'chat_safety_plain_demo', 'v1',
       'demo_chat_safety', 'v1', '聊天安全小助手',
       '请勿向陌生人转账或透露验证码。如遇骚扰，可在聊天页面发起举报并提交证据。',
       'action', 'help', '安全指南', '/pages/help/chat-safety', NOW(), NULL,
       NOW(), NOW(), 0
  FROM (SELECT id FROM app_user WHERE deleted=0 ORDER BY id LIMIT 3) u
 WHERE NOT EXISTS (
       SELECT 1 FROM app_assistant_message m
        WHERE m.assistant_message_no=CONCAT('AST-DEMO-PLAIN-', u.id, '-01'));

INSERT INTO app_assistant_message
    (assistant_message_no, receiver_user_id, topic_code, content_version,
     template_code, template_version, title_text, content_text, card_type,
     action_type, action_text, action_value, visible_from, visible_until,
     create_time, update_time, deleted)
SELECT CONCAT('AST-DEMO-PLAIN-', u.id, '-02'), u.id, 'community_help_plain_demo', 'v1',
       'demo_community_help', 'v1', '社区使用助手',
       '欢迎来到社区。发布内容前请阅读社区规范，友善交流并保护个人隐私。',
       'text', 'none', NULL, NULL, NOW(), NULL, NOW(), NOW(), 0
  FROM (SELECT id FROM app_user WHERE deleted=0 ORDER BY id LIMIT 3) u
 WHERE NOT EXISTS (
       SELECT 1 FROM app_assistant_message m
        WHERE m.assistant_message_no=CONCAT('AST-DEMO-PLAIN-', u.id, '-02'));
