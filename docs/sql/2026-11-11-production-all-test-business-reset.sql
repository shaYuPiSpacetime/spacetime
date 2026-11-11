-- 生产小程序全部测试业务清理（2026-11-11 用户明确确认现有数据全部为测试）。
-- 不清空后台权限、配置、协议、字典及独立官网数据；不重置自增 ID。
-- PREVIEW 默认只输出范围；REHEARSAL 只允许隔离库，实际执行后回滚。
-- 正式执行前必须停止后端/API 写入，完成全库备份、异机复制、完整归档及逐表校验。
-- 归档库应包含源库全部表和 _full_reset_manifest，结构及操作步骤见同日执行报告。
-- 同一会话设置 @reset_mode='APPLY'、@reset_expected_users=停写时总账号数、
-- @reset_archive='spacetime_archive_20261111_full'、@reset_writes_paused=1、
-- @reset_confirmation='现有小程序数据全部为测试，清空业务并保留配置' 后执行。
-- 这里只清数据库；必须另行备份并撤销 miniapp:* 登录态/状态缓存。
-- 正式环境禁止在恢复访问后用全库备份覆盖新增数据。备份、OSS 和 TIM 云端对象不由本 SQL 删除。
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @reset_mode=COALESCE(@reset_mode,'PREVIEW');
SET @reset_clear_tables='["ct_ideal_snapshot_candidate","app_assistant_message","app_message_conversation","app_message_conversation_member","app_message_delivery_outbox","app_message_event_inbox","app_message_record","app_message_sensitive_access_log","app_message_whisper","app_payment_notify_log","app_refund_record","app_relation_like","app_relation_like_inbox_state","app_relation_match","app_relation_match_popup","app_relation_match_source","app_relation_visit","app_relation_visit_cursor","app_relation_visit_event","app_relation_visit_inbox_state","app_system_message","app_trade_order","app_user_asset","app_user_asset_grant","app_user_audit_history","app_user_audit_record","app_user_cancel_remark","app_user_cancel_request","app_user_coin_log","app_user_export_task","app_user_feedback","app_user_im_account","app_user_import_batch","app_user_import_row","app_user_keyword_block","app_user_notification_setting","app_user_privacy_setting","app_user_relation_block","app_user_search_log","app_user_search_summary","app_user_security_audit_log","app_user_unlock_record","app_user_zodiac_backup_20261009","app_whisper","community_audit_record","community_comment","community_comment_like","community_content_preference","community_event_outbox","community_export_task","community_follow","community_ip_block","community_like","community_media_audit_task","community_post","community_post_draft","community_report","community_report_evidence","community_user_restriction","community_view_history","ct_ideal_filter_snapshot","ct_recommend_preference","ct_recommend_view_log","external_provider_task","ops_bak_20261009_conversation","ops_bak_20261009_conversation_member","ops_bak_20261009_delivery_outbox","ops_bak_20261009_event_inbox","ops_bak_20261009_legacy_whisper","ops_bak_20261009_match_popup","ops_bak_20261009_match_source","ops_bak_20261009_message_record","ops_bak_20261009_message_whisper","ops_bak_20261009_relation_like","ops_bak_20261009_relation_match","ops_bak_20261009_user_asset","ops_bak_20261010_cancel_likes","ops_bak_20261010_cancel_visits","ops_bak_20261010_recommend_views","ops_bak_20261010_user_asset","promo_agent_stat","promo_agent_stat_legacy_20260727","promotion_agent","promotion_agent_bonus_log","promotion_agent_bonus_log_legacy_20260727","promotion_agent_code","promotion_agent_event_legacy_20260727","promotion_agent_legacy_20260727","promotion_agent_qr_code","promotion_agent_qr_code_legacy_20260727","promotion_agent_settlement","promotion_agent_settlement_legacy_20260727","promotion_audit_log","promotion_audit_log_legacy_20260727","promotion_event_inbox","promotion_export_task","promotion_invite_counter","promotion_invite_relation","promotion_invite_relation_legacy_20260727","promotion_reward_log","promotion_reward_log_legacy_20260727","promotion_source_trace","promotion_source_trace_legacy_20260727","user","app_user"]';
SET @reset_keep_tables='["app_coin_package","app_coin_scene_config","app_commercial_config_log","app_config","app_message_rule_version","app_message_runtime_control","app_message_template_version","app_vip_benefit","app_vip_package","app_virtual_price_change","community_config_version","community_topic","content_article","content_operation_log","content_sensitive_word","content_sensitive_word_revision","mobile_entry_config","ops_data_reset_log","ops_recommend_reset_log","ops_relation_restore_log","ops_user_membership_change_log","promotion_rule","promotion_rule_current","promotion_rule_event","promotion_rule_legacy_20260727","promotion_rule_tier","promotion_rule_tier_legacy_20260727","school_dictionary","search_block_word","search_hot_word","sys_dict_data","sys_dict_type","sys_menu","sys_role","sys_role_menu","sys_user","sys_user_role","website_activity","website_agreement_acceptance","website_audit_log","website_conversation","website_legal_document","website_media","website_message","website_registration","website_report","website_user"]';
DROP PROCEDURE IF EXISTS spacetime_reset_all_test_business;
DELIMITER $$
CREATE PROCEDURE spacetime_reset_all_test_business()
main: BEGIN
 DECLARE v_mode VARCHAR(16);
 DECLARE v_archive VARCHAR(64);
 DECLARE v_table VARCHAR(64);
 DECLARE v_count BIGINT;
 DECLARE v_idx INT DEFAULT 0;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 SET v_mode=UPPER(@reset_mode); SET v_archive=@reset_archive;
 IF DATABASE()<>'shikongxiehou_prod' AND DATABASE() NOT REGEXP '^spacetime_full_reset_rehearsal_[0-9]+$' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='数据库不在允许范围';
 END IF;
 SELECT COUNT(*) INTO v_count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE';
 IF v_count<>JSON_LENGTH(@reset_clear_tables)+JSON_LENGTH(@reset_keep_tables) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='表结构范围发生变化，需重新核对';
 END IF;
 IF v_mode='PREVIEW' THEN
  SELECT COUNT(*) AS 当前账号总数,SUM(deleted=0) AS 当前有效账号数 FROM app_user;
  WHILE v_idx<JSON_LENGTH(@reset_clear_tables) DO
   SET v_table=JSON_UNQUOTE(JSON_EXTRACT(@reset_clear_tables,CONCAT('$[',v_idx,']')));
   SET @reset_sql=CONCAT('SELECT ''',v_table,''' AS 清理表,COUNT(*) AS 行数 FROM `',v_table,'`');
   PREPARE reset_stmt FROM @reset_sql; EXECUTE reset_stmt; DEALLOCATE PREPARE reset_stmt;
   SET v_idx=v_idx+1;
  END WHILE;
  LEAVE main;
 END IF;
 IF v_mode NOT IN('APPLY','REHEARSAL') OR COALESCE(@reset_confirmation,'')<>'现有小程序数据全部为测试，清空业务并保留配置' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='执行模式或授权确认错误';
 END IF;
 IF COALESCE(@reset_writes_paused,0)<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='必须实际停写后才能执行'; END IF;
 IF DATABASE()='shikongxiehou_prod' AND (v_mode<>'APPLY' OR @@server_uuid<>'16de2a02-d8e0-11f1-b00c-0242ac130006') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='生产实例或模式错误';
 END IF;
 IF v_archive IS NULL OR v_archive NOT REGEXP '^spacetime_archive_[0-9]{8}_[a-zA-Z0-9_]{1,20}$' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='归档库名错误';
 END IF;
 SET @reset_manifest_state=NULL;
 SET @reset_sql=CONCAT('SELECT state,user_count,user_hash,source_uuid,source_schema,clear_tables INTO @reset_manifest_state,@reset_manifest_users,@reset_manifest_hash,@reset_manifest_uuid,@reset_manifest_schema,@reset_manifest_tables FROM `',v_archive,'`._full_reset_manifest WHERE batch_no=''all_test_business_20261111''');
 PREPARE reset_stmt FROM @reset_sql; EXECUTE reset_stmt; DEALLOCATE PREPARE reset_stmt;
 IF @reset_manifest_state='APPLIED' THEN SELECT '同一归档批次已执行，不重复清理' AS 结果; LEAVE main; END IF;
 IF COALESCE(@reset_manifest_state,'')<>'COMPLETE' OR @reset_manifest_uuid<>@@server_uuid OR @reset_manifest_schema<>DATABASE() OR CAST(@reset_manifest_tables AS JSON)<>CAST(@reset_clear_tables AS JSON) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='未找到此实例、数据库及范围的完整归档';
 END IF;
 SELECT COUNT(*) INTO v_count FROM app_user;
 IF @reset_expected_users IS NULL OR v_count<>@reset_expected_users OR v_count<>@reset_manifest_users THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='账号数量发生变化或未明确设置预期数';
 END IF;
 SET SESSION group_concat_max_len=1048576;
 SELECT SHA2(COALESCE(GROUP_CONCAT(id ORDER BY id SEPARATOR ','),''),256) INTO @reset_user_hash FROM app_user;
 IF @reset_user_hash<>@reset_manifest_hash THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='账号范围与归档不一致'; END IF;
 START TRANSACTION;
 SET v_idx=0;
 WHILE v_idx<JSON_LENGTH(@reset_clear_tables) DO
  SET v_table=JSON_UNQUOTE(JSON_EXTRACT(@reset_clear_tables,CONCAT('$[',v_idx,']')));
  SET @reset_sql=CONCAT('DELETE FROM `',v_table,'`');
  PREPARE reset_stmt FROM @reset_sql; EXECUTE reset_stmt; SET @reset_affected=ROW_COUNT(); DEALLOCATE PREPARE reset_stmt;
  SELECT v_table AS 已清理表,@reset_affected AS 影响行数;
  SET v_idx=v_idx+1;
 END WHILE;
 -- 清理后的目标表逐张检查；不关闭外键约束。
 SET v_idx=0;
 WHILE v_idx<JSON_LENGTH(@reset_clear_tables) DO
  SET v_table=JSON_UNQUOTE(JSON_EXTRACT(@reset_clear_tables,CONCAT('$[',v_idx,']')));
  SET @reset_sql=CONCAT('SELECT COUNT(*) INTO @reset_remaining FROM `',v_table,'`');
  PREPARE reset_stmt FROM @reset_sql; EXECUTE reset_stmt; DEALLOCATE PREPARE reset_stmt;
  IF @reset_remaining<>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='目标表没有清空，整体回滚'; END IF;
  SET v_idx=v_idx+1;
 END WHILE;
 -- 事务内保护保留表行数；提交后必须追加逐表校验值比对。
 SET v_idx=0;
 WHILE v_idx<JSON_LENGTH(@reset_keep_tables) DO
  SET v_table=JSON_UNQUOTE(JSON_EXTRACT(@reset_keep_tables,CONCAT('$[',v_idx,']')));
  SET @reset_sql=CONCAT('SELECT (SELECT COUNT(*) FROM `',v_table,'`)-(SELECT COUNT(*) FROM `',v_archive,'`.`',v_table,'`) INTO @reset_difference');
  PREPARE reset_stmt FROM @reset_sql; EXECUTE reset_stmt; DEALLOCATE PREPARE reset_stmt;
  IF @reset_difference<>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='保留表发生变化，整体回滚'; END IF;
  SET v_idx=v_idx+1;
 END WHILE;
 IF v_mode='REHEARSAL' THEN ROLLBACK; SELECT '全量演练通过，已回滚' AS 结果;
 ELSE
  SET @reset_sql=CONCAT('UPDATE `',v_archive,'`._full_reset_manifest SET state=''APPLIED'',applied_at=NOW() WHERE batch_no=''all_test_business_20261111''');
  PREPARE reset_stmt FROM @reset_sql; EXECUTE reset_stmt; DEALLOCATE PREPARE reset_stmt;
  COMMIT; SELECT '全量业务清理已提交，配置表保留' AS 结果;
 END IF;
END$$
DELIMITER ;
CALL spacetime_reset_all_test_business();
DROP PROCEDURE IF EXISTS spacetime_reset_all_test_business;
