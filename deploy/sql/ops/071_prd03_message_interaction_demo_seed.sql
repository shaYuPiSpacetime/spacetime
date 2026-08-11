-- PRD-03 App 用户消息互动真实表 Demo 数据，幂等执行。
-- 仅用于开发/测试环境；选择现有正常用户，不创建虚构用户。

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @demo_user_a = (
    SELECT id FROM app_user
     WHERE deleted=0 AND account_status IN ('ACTIVE','NORMAL')
     ORDER BY id LIMIT 1
);
SET @demo_user_b = (
    SELECT id FROM app_user
     WHERE deleted=0 AND account_status IN ('ACTIVE','NORMAL') AND id<>@demo_user_a
     ORDER BY id LIMIT 1
);
SET @demo_user_c = (
    SELECT id FROM app_user
     WHERE deleted=0 AND account_status IN ('ACTIVE','NORMAL')
       AND id NOT IN (@demo_user_a,@demo_user_b)
     ORDER BY id LIMIT 1
);
SET @demo_low = LEAST(@demo_user_a,@demo_user_b);
SET @demo_high = GREATEST(@demo_user_a,@demo_user_b);

INSERT INTO app_message_conversation
(conversation_no,tim_conversation_id,match_id,match_no,user_low_id,user_high_id,status,
 active_marker,config_version,protection_enabled,last_message_time,version,
 create_time,update_time,created_by,updated_by,deleted)
SELECT 'CV-DEMO-PRD03-001', CONCAT('C2C_DEMO_',@demo_low,'_',@demo_high),
       903000000001,'MAT-DEMO-PRD03-001',@demo_low,@demo_high,'active',1,
       'MSG-CFG-INIT-001',0,NOW(),0,NOW(),NOW(),0,0,0
WHERE @demo_user_a IS NOT NULL AND @demo_user_b IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM app_message_conversation
       WHERE user_low_id=@demo_low AND user_high_id=@demo_high
         AND active_marker=1 AND deleted=0
  );

SET @demo_conversation_id = (
    SELECT id FROM app_message_conversation
     WHERE user_low_id=@demo_low AND user_high_id=@demo_high
       AND active_marker=1 AND deleted=0
     ORDER BY id LIMIT 1
);
SET @demo_conversation_no = (
    SELECT conversation_no FROM app_message_conversation WHERE id=@demo_conversation_id
);

INSERT IGNORE INTO app_message_conversation_member
(conversation_id,conversation_no,user_id,peer_user_id,version,
 create_time,update_time,created_by,updated_by,deleted)
VALUES
(@demo_conversation_id,@demo_conversation_no,@demo_user_a,@demo_user_b,0,NOW(),NOW(),0,0,0),
(@demo_conversation_id,@demo_conversation_no,@demo_user_b,@demo_user_a,0,NOW(),NOW(),0,0,0);

INSERT INTO app_message_record
(message_no,client_msg_id,conversation_id,conversation_no,sender_type,sender_user_id,
 receiver_user_id,message_type,content_text,send_status,receiver_read_status,receiver_read_at,
 tim_message_id,tim_msg_key,provider_sent_at,sent_at,source_biz_type,source_biz_no,
 failure_code,failure_reason,version,create_time,update_time,created_by,updated_by,deleted)
VALUES
('MSG-DEMO-PRD03-001','DEMO-PRIVATE-001',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_b,@demo_user_a,'text','你好，很高兴认识你。','sent','unread',NULL,'TIM-DEMO-001','TIM-KEY-DEMO-001',DATE_SUB(NOW(),INTERVAL 8 MINUTE),DATE_SUB(NOW(),INTERVAL 8 MINUTE),'match',@demo_conversation_no,NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 8 MINUTE),NOW(),0,0,0),
('MSG-DEMO-PRD03-002','DEMO-PRIVATE-002',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_a,@demo_user_b,'text','你好呀，我们都喜欢校园音乐节。','sent','read',DATE_SUB(NOW(),INTERVAL 6 MINUTE),'TIM-DEMO-002','TIM-KEY-DEMO-002',DATE_SUB(NOW(),INTERVAL 7 MINUTE),DATE_SUB(NOW(),INTERVAL 7 MINUTE),'match',@demo_conversation_no,NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 7 MINUTE),NOW(),0,0,0),
('MSG-DEMO-PRD03-003','DEMO-PRIVATE-003',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_a,@demo_user_b,'text','这条用于展示发送失败。','failed','not_applicable',NULL,NULL,NULL,NULL,NULL,'match',@demo_conversation_no,'TIM_TIMEOUT','腾讯云TIM请求超时，请稍后重试',0,DATE_SUB(NOW(),INTERVAL 6 MINUTE),NOW(),0,0,0),
('MSG-DEMO-PRD03-004','DEMO-PRIVATE-004',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_b,@demo_user_a,'text','这条正在等待投递。','queued','not_applicable',NULL,NULL,NULL,NULL,NULL,'match',@demo_conversation_no,NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 5 MINUTE),NOW(),0,0,0),
('MSG-DEMO-PRD03-005','DEMO-PRIVATE-005',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_b,@demo_user_a,'text','周末一起去图书馆吗？','sent','read',DATE_SUB(NOW(),INTERVAL 3 MINUTE),'TIM-DEMO-005','TIM-KEY-DEMO-005',DATE_SUB(NOW(),INTERVAL 4 MINUTE),DATE_SUB(NOW(),INTERVAL 4 MINUTE),'match',@demo_conversation_no,NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 4 MINUTE),NOW(),0,0,0),
('MSG-DEMO-PRD03-006','DEMO-PRIVATE-006',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_a,@demo_user_b,'text','可以，下午两点怎么样？','sent','unread',NULL,'TIM-DEMO-006','TIM-KEY-DEMO-006',DATE_SUB(NOW(),INTERVAL 3 MINUTE),DATE_SUB(NOW(),INTERVAL 3 MINUTE),'match',@demo_conversation_no,NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 3 MINUTE),NOW(),0,0,0),
('MSG-DEMO-PRD03-007','DEMO-PRIVATE-007',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_b,@demo_user_a,'text','没问题，到时候见。','sent','unread',NULL,'TIM-DEMO-007','TIM-KEY-DEMO-007',DATE_SUB(NOW(),INTERVAL 2 MINUTE),DATE_SUB(NOW(),INTERVAL 2 MINUTE),'match',@demo_conversation_no,NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 2 MINUTE),NOW(),0,0,0)
ON DUPLICATE KEY UPDATE
 content_text=VALUES(content_text),send_status=VALUES(send_status),
 receiver_read_status=VALUES(receiver_read_status),receiver_read_at=VALUES(receiver_read_at),
 failure_code=VALUES(failure_code),failure_reason=VALUES(failure_reason),
 update_time=NOW(),deleted=0;

UPDATE app_message_conversation
   SET last_message_id=(SELECT id FROM app_message_record WHERE message_no='MSG-DEMO-PRD03-007'),
       last_message_time=DATE_SUB(NOW(),INTERVAL 2 MINUTE),update_time=NOW()
 WHERE id=@demo_conversation_id;

INSERT INTO app_message_record
(message_no,client_msg_id,conversation_id,conversation_no,sender_type,sender_user_id,
 receiver_user_id,message_type,content_text,send_status,receiver_read_status,receiver_read_at,
 tim_message_id,tim_msg_key,provider_sent_at,sent_at,source_biz_type,source_biz_no,
 failure_code,failure_reason,version,create_time,update_time,created_by,updated_by,deleted)
VALUES
('MSG-DEMO-WSP-001','DEMO-WSP-MSG-001',NULL,NULL,'user',@demo_user_b,@demo_user_a,'whisper','想认识你，可以聊聊校园生活吗？','sent','unread',NULL,'TIM-WSP-DEMO-001','TIM-WSP-KEY-DEMO-001',DATE_SUB(NOW(),INTERVAL 2 HOUR),DATE_SUB(NOW(),INTERVAL 2 HOUR),'whisper','WSP-DEMO-PRD03-001',NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 2 HOUR),NOW(),0,0,0),
('MSG-DEMO-WSP-002','DEMO-WSP-MSG-002',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_a,@demo_user_b,'whisper','看到你也喜欢摄影，想和你认识一下。','sent','read',DATE_SUB(NOW(),INTERVAL 1 DAY),'TIM-WSP-DEMO-002','TIM-WSP-KEY-DEMO-002',DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY),'whisper','WSP-DEMO-PRD03-002',NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 2 DAY),NOW(),0,0,0),
('MSG-DEMO-WSP-002-R','DEMO-WSP-REPLY-002',@demo_conversation_id,@demo_conversation_no,'user',@demo_user_b,@demo_user_a,'whisper_reply','好呀，很高兴认识你。','sent','unread',NULL,'TIM-WSP-DEMO-002-R','TIM-WSP-KEY-DEMO-002-R',DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_SUB(NOW(),INTERVAL 1 DAY),'whisper_reply','WSP-DEMO-PRD03-002',NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 1 DAY),NOW(),0,0,0),
('MSG-DEMO-WSP-003','DEMO-WSP-MSG-003',NULL,NULL,'user',@demo_user_c,@demo_user_a,'whisper','这是一条已过期的认识申请。','sent','unread',NULL,'TIM-WSP-DEMO-003','TIM-WSP-KEY-DEMO-003',DATE_SUB(NOW(),INTERVAL 12 DAY),DATE_SUB(NOW(),INTERVAL 12 DAY),'whisper','WSP-DEMO-PRD03-003',NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 12 DAY),NOW(),0,0,0),
('MSG-DEMO-WSP-004','DEMO-WSP-MSG-004',NULL,NULL,'user',@demo_user_a,@demo_user_c,'whisper','这是一条关系失效的申请。','sent','read',DATE_SUB(NOW(),INTERVAL 3 DAY),'TIM-WSP-DEMO-004','TIM-WSP-KEY-DEMO-004',DATE_SUB(NOW(),INTERVAL 4 DAY),DATE_SUB(NOW(),INTERVAL 4 DAY),'whisper','WSP-DEMO-PRD03-004',NULL,NULL,0,DATE_SUB(NOW(),INTERVAL 4 DAY),NOW(),0,0,0),
('MSG-DEMO-WSP-005','DEMO-WSP-MSG-005',NULL,NULL,'user',@demo_user_b,@demo_user_a,'whisper','这是一条投递失败的申请。','failed','not_applicable',NULL,NULL,NULL,NULL,NULL,'whisper','WSP-DEMO-PRD03-005','TIM_REJECTED','腾讯云TIM拒绝投递',0,DATE_SUB(NOW(),INTERVAL 5 DAY),NOW(),0,0,0)
ON DUPLICATE KEY UPDATE
 content_text=VALUES(content_text),send_status=VALUES(send_status),
 receiver_read_status=VALUES(receiver_read_status),receiver_read_at=VALUES(receiver_read_at),
 failure_code=VALUES(failure_code),failure_reason=VALUES(failure_reason),update_time=NOW(),deleted=0;

INSERT INTO app_message_whisper
(whisper_no,send_request_id,reply_request_id,sender_user_id,receiver_user_id,user_low_id,user_high_id,
 status,active_marker,version,pay_type,payment_status,coin_amount,benefit_date,quota_snapshot,
 delivery_status,config_version,expire_days_snapshot,cooldown_days_snapshot,expires_at,cooldown_until,
 delivered_at,receiver_read_at,replied_at,invalid_reason,invalid_time,match_id,match_no,
 conversation_id,conversation_no,request_message_id,reply_message_id,
 create_time,update_time,created_by,updated_by,deleted)
SELECT 'WSP-DEMO-PRD03-001','DEMO-WSP-REQ-001',NULL,@demo_user_b,@demo_user_a,
       LEAST(@demo_user_a,@demo_user_b),GREATEST(@demo_user_a,@demo_user_b),
       'pending',1,0,'coin','paid',8,CURRENT_DATE,1,'sent','MSG-CFG-INIT-001',7,7,
       DATE_ADD(NOW(),INTERVAL 7 DAY),DATE_ADD(NOW(),INTERVAL 14 DAY),DATE_SUB(NOW(),INTERVAL 2 HOUR),
       NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
       (SELECT id FROM app_message_record WHERE message_no='MSG-DEMO-WSP-001'),NULL,
       DATE_SUB(NOW(),INTERVAL 2 HOUR),NOW(),0,0,0
WHERE NOT EXISTS (
    SELECT 1 FROM app_message_whisper
     WHERE user_low_id=LEAST(@demo_user_a,@demo_user_b)
       AND user_high_id=GREATEST(@demo_user_a,@demo_user_b)
       AND active_marker=1 AND deleted=0
);

INSERT INTO app_message_whisper
(whisper_no,send_request_id,reply_request_id,sender_user_id,receiver_user_id,user_low_id,user_high_id,
 status,active_marker,version,pay_type,payment_status,coin_amount,benefit_date,quota_snapshot,
 delivery_status,config_version,expire_days_snapshot,cooldown_days_snapshot,expires_at,cooldown_until,
 delivered_at,receiver_read_at,replied_at,invalid_reason,invalid_time,match_id,match_no,
 conversation_id,conversation_no,request_message_id,reply_message_id,
 create_time,update_time,created_by,updated_by,deleted)
VALUES
('WSP-DEMO-PRD03-002','DEMO-WSP-REQ-002','DEMO-WSP-REPLY-002',@demo_user_a,@demo_user_b,@demo_low,@demo_high,'replied',NULL,1,'vip_free','paid',0,CURRENT_DATE,1,'sent','MSG-CFG-INIT-001',7,7,DATE_ADD(NOW(),INTERVAL 5 DAY),DATE_ADD(NOW(),INTERVAL 12 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_SUB(NOW(),INTERVAL 1 DAY),NULL,NULL,903000000001,'MAT-DEMO-PRD03-001',@demo_conversation_id,@demo_conversation_no,(SELECT id FROM app_message_record WHERE message_no='MSG-DEMO-WSP-002'),(SELECT id FROM app_message_record WHERE message_no='MSG-DEMO-WSP-002-R'),DATE_SUB(NOW(),INTERVAL 2 DAY),NOW(),0,0,0),
('WSP-DEMO-PRD03-003','DEMO-WSP-REQ-003',NULL,@demo_user_c,@demo_user_a,LEAST(@demo_user_c,@demo_user_a),GREATEST(@demo_user_c,@demo_user_a),'expired',NULL,1,'coin','paid',8,NULL,NULL,'sent','MSG-CFG-INIT-001',7,7,DATE_SUB(NOW(),INTERVAL 5 DAY),DATE_ADD(NOW(),INTERVAL 2 DAY),DATE_SUB(NOW(),INTERVAL 12 DAY),NULL,NULL,'expired',DATE_SUB(NOW(),INTERVAL 5 DAY),NULL,NULL,NULL,NULL,(SELECT id FROM app_message_record WHERE message_no='MSG-DEMO-WSP-003'),NULL,DATE_SUB(NOW(),INTERVAL 12 DAY),NOW(),0,0,0),
('WSP-DEMO-PRD03-004','DEMO-WSP-REQ-004',NULL,@demo_user_a,@demo_user_c,LEAST(@demo_user_c,@demo_user_a),GREATEST(@demo_user_c,@demo_user_a),'invalid',NULL,1,'coin','paid',8,NULL,NULL,'sent','MSG-CFG-INIT-001',7,7,DATE_ADD(NOW(),INTERVAL 3 DAY),DATE_ADD(NOW(),INTERVAL 10 DAY),DATE_SUB(NOW(),INTERVAL 4 DAY),DATE_SUB(NOW(),INTERVAL 3 DAY),NULL,'blocked',DATE_SUB(NOW(),INTERVAL 2 DAY),NULL,NULL,NULL,NULL,(SELECT id FROM app_message_record WHERE message_no='MSG-DEMO-WSP-004'),NULL,DATE_SUB(NOW(),INTERVAL 4 DAY),NOW(),0,0,0),
('WSP-DEMO-PRD03-005','DEMO-WSP-REQ-005',NULL,@demo_user_b,@demo_user_a,@demo_low,@demo_high,'invalid',NULL,1,'coin','paid',8,NULL,NULL,'failed','MSG-CFG-INIT-001',7,7,DATE_ADD(NOW(),INTERVAL 2 DAY),DATE_ADD(NOW(),INTERVAL 9 DAY),NULL,NULL,NULL,'delivery_failed',DATE_SUB(NOW(),INTERVAL 5 DAY),NULL,NULL,NULL,NULL,(SELECT id FROM app_message_record WHERE message_no='MSG-DEMO-WSP-005'),NULL,DATE_SUB(NOW(),INTERVAL 5 DAY),NOW(),0,0,0)
ON DUPLICATE KEY UPDATE
 status=VALUES(status),payment_status=VALUES(payment_status),delivery_status=VALUES(delivery_status),receiver_read_at=VALUES(receiver_read_at),
 invalid_reason=VALUES(invalid_reason),update_time=NOW(),deleted=0;

INSERT INTO app_system_message
(notice_no,receiver_user_id,producer_event_id,notification_type,biz_type,biz_no,
 template_code,template_version,jump_type,jump_value,safety_required,read_at,visible_until,
 create_time,update_time,created_by,updated_by,deleted)
VALUES
('NTF-DEMO-PRD03-001',@demo_user_a,'DEMO-SYS-EVT-001','governance','profile_review','AUTH-DEMO-001','content_review_result','v1','auth_center','/pages/auth/index',0,NULL,DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 20 MINUTE),NOW(),0,0,0),
('NTF-DEMO-PRD03-002',@demo_user_a,'DEMO-SYS-EVT-002','asset','asset_result','AST-DEMO-001','asset_result','v1','asset','/pages/asset/index',0,DATE_SUB(NOW(),INTERVAL 10 MINUTE),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 30 MINUTE),NOW(),0,0,0),
('NTF-DEMO-PRD03-003',@demo_user_a,'DEMO-SYS-EVT-003','invite','invite_result','INV-DEMO-001','invite_result','v1','invite_center','/pages/invite/index',0,NULL,DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 40 MINUTE),NOW(),0,0,0),
('NTF-DEMO-PRD03-004',@demo_user_b,'DEMO-SYS-EVT-004','platform','account_security','SEC-DEMO-001','account_security','v1','none',NULL,1,NULL,DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 50 MINUTE),NOW(),0,0,0),
('NTF-DEMO-PRD03-005',@demo_user_b,'DEMO-SYS-EVT-005','community','community_interaction_summary','COM-DEMO-001','community_interaction_summary','v1','community','/pages/community/index',0,DATE_SUB(NOW(),INTERVAL 1 HOUR),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 1 HOUR),NOW(),0,0,0),
('NTF-DEMO-PRD03-006',@demo_user_a,'DEMO-SYS-EVT-006','platform','platform_announcement','ANN-DEMO-001','platform_announcement','v1','none',NULL,1,NULL,DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 70 MINUTE),NOW(),0,0,0)
ON DUPLICATE KEY UPDATE read_at=VALUES(read_at),visible_until=VALUES(visible_until),update_time=NOW(),deleted=0;

INSERT INTO app_assistant_message
(assistant_message_no,receiver_user_id,topic_code,content_version,template_code,template_version,
 action_type,action_value,read_at,visible_from,visible_until,
 create_time,update_time,created_by,updated_by,deleted)
VALUES
('AST-DEMO-PRD03-001',@demo_user_a,'getting_started_demo_1','v1','assistant_getting_started','v1','help','/pages/help/message-center',NULL,DATE_SUB(NOW(),INTERVAL 15 MINUTE),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 15 MINUTE),NOW(),0,0,0),
('AST-DEMO-PRD03-002',@demo_user_a,'safety_demo_2','v1','assistant_getting_started','v1','help','/pages/help/safety',DATE_SUB(NOW(),INTERVAL 5 MINUTE),DATE_SUB(NOW(),INTERVAL 25 MINUTE),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 25 MINUTE),NOW(),0,0,0),
('AST-DEMO-PRD03-003',@demo_user_a,'match_demo_3','v1','assistant_getting_started','v1','help','/pages/help/match',NULL,DATE_SUB(NOW(),INTERVAL 35 MINUTE),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 35 MINUTE),NOW(),0,0,0),
('AST-DEMO-PRD03-004',@demo_user_b,'getting_started_demo_4','v1','assistant_getting_started','v1','help','/pages/help/message-center',NULL,DATE_SUB(NOW(),INTERVAL 45 MINUTE),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 45 MINUTE),NOW(),0,0,0),
('AST-DEMO-PRD03-005',@demo_user_b,'privacy_demo_5','v1','assistant_getting_started','v1','help','/pages/help/privacy',DATE_SUB(NOW(),INTERVAL 20 MINUTE),DATE_SUB(NOW(),INTERVAL 55 MINUTE),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 55 MINUTE),NOW(),0,0,0),
('AST-DEMO-PRD03-006',@demo_user_a,'report_demo_6','v1','assistant_getting_started','v1','help','/pages/help/report',NULL,DATE_SUB(NOW(),INTERVAL 65 MINUTE),DATE_ADD(NOW(),INTERVAL 30 DAY),DATE_SUB(NOW(),INTERVAL 65 MINUTE),NOW(),0,0,0)
ON DUPLICATE KEY UPDATE read_at=VALUES(read_at),visible_until=VALUES(visible_until),update_time=NOW(),deleted=0;

INSERT INTO community_report
(report_no,client_report_id,reporter_id,target_type,source_type,target_id,target_biz_no,
 target_user_id,reported_user_id,source_scene,snapshot_status,reason_code,extra_text,status,
 reply_status,active_marker,create_time,update_time,created_by,updated_by,deleted)
VALUES
('RPT-DEMO-PRD03-001','DEMO-RPT-001',@demo_user_a,'message','private_chat',@demo_user_b,'MSG-DEMO-PRD03-001',@demo_user_b,@demo_user_b,'chat','complete','harassment','私信内容不友善','pending','pending',1,DATE_SUB(NOW(),INTERVAL 1 HOUR),NOW(),0,0,0),
('RPT-DEMO-PRD03-002','DEMO-RPT-002',@demo_user_b,'message','private_chat',@demo_user_a,'MSG-DEMO-PRD03-002',@demo_user_a,@demo_user_a,'chat','complete','fraud','疑似诱导交易','processing','pending',1,DATE_SUB(NOW(),INTERVAL 2 HOUR),NOW(),0,0,0),
('RPT-DEMO-PRD03-003','DEMO-RPT-003',@demo_user_a,'whisper','whisper',@demo_user_b,'WSP-DEMO-PRD03-001',@demo_user_b,@demo_user_b,'whisper','complete','spam','重复发送认识申请','valid','sent',NULL,DATE_SUB(NOW(),INTERVAL 3 HOUR),NOW(),0,0,0),
('RPT-DEMO-PRD03-004','DEMO-RPT-004',@demo_user_b,'conversation','private_chat',@demo_user_a,@demo_conversation_no,@demo_user_a,@demo_user_a,'chat','partial','other','会话上下文待补证','invalid','sent',NULL,DATE_SUB(NOW(),INTERVAL 4 HOUR),NOW(),0,0,0),
('RPT-DEMO-PRD03-005','DEMO-RPT-005',@demo_user_a,'message','private_chat',@demo_user_b,'MSG-DEMO-PRD03-005',@demo_user_b,@demo_user_b,'chat','complete','abuse','言语不当','merged','sent',NULL,DATE_SUB(NOW(),INTERVAL 5 HOUR),NOW(),0,0,0),
('RPT-DEMO-PRD03-006','DEMO-RPT-006',@demo_user_b,'whisper','whisper',@demo_user_a,'WSP-DEMO-PRD03-004',@demo_user_a,@demo_user_a,'whisper','complete','harassment','悄悄话举报','valid','sent',NULL,DATE_SUB(NOW(),INTERVAL 6 HOUR),NOW(),0,0,0)
ON DUPLICATE KEY UPDATE status=VALUES(status),snapshot_status=VALUES(snapshot_status),
 active_marker=VALUES(active_marker),update_time=NOW(),deleted=0;
