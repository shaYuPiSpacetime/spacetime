-- Read-only aggregate audit for the explicitly authorized account; no profile content.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET TRANSACTION READ ONLY;
START TRANSACTION;
SET @target_hash = 'a27e5899573ad6b7e16f4778a8d453ea3f7faae700d48368875f48f2f244d56a';
SELECT COUNT(*), IF(COUNT(*)=1, MIN(id), NULL) INTO @target_count, @target_user
FROM app_user WHERE deleted=0
AND (phone_hash=@target_hash OR SHA2(TRIM(phone),256)=@target_hash);
SELECT 'account' AS section, @target_count AS matches, account_status, first_login_completed,
 create_time, update_time FROM app_user WHERE id=@target_user;
SELECT 'certification' AS section, audit_type, status, COUNT(*) AS n, MAX(submit_time) AS latest_submit
FROM app_user_audit_record WHERE user_id=@target_user AND deleted=0
AND audit_type IN ('real_name','avatar','education') GROUP BY audit_type,status;
SELECT 'outgoing_likes' AS section, like_status, deleted, invalid_reason, COUNT(*) AS n,
 MIN(liked_time) AS first_like, MAX(liked_time) AS last_like, MAX(invalid_time) AS last_invalid,
 MAX(update_time) AS last_update FROM app_relation_like WHERE from_user_id=@target_user
GROUP BY like_status,deleted,invalid_reason;
SELECT 'incoming_likes' AS section, like_status, deleted, invalid_reason, COUNT(*) AS n,
 MIN(liked_time) AS first_like, MAX(liked_time) AS last_like, MAX(invalid_time) AS last_invalid,
 MAX(update_time) AS last_update FROM app_relation_like WHERE to_user_id=@target_user
GROUP BY like_status,deleted,invalid_reason;
SELECT 'visits' AS section, visit_status, deleted, invalid_reason, COUNT(*) AS n,
 COUNT(DISTINCT visitor_user_id) AS visitors, MAX(last_visit_time) AS latest_visit,
 MAX(invalid_time) AS last_invalid, MAX(update_time) AS last_update
FROM app_relation_visit WHERE target_user_id=@target_user GROUP BY visit_status,deleted,invalid_reason;
SELECT 'visit_events' AS section, COUNT(*) AS n, COUNT(DISTINCT visitor_user_id) AS visitors,
 MAX(visit_time) AS latest_visit FROM app_relation_visit_event WHERE target_user_id=@target_user AND deleted=0;
SELECT 'counterparties' AS section, p.scene, u.account_status, u.deleted, u.first_login_completed,
 COUNT(*) AS relation_rows, COUNT(DISTINCT p.other_id) AS users
FROM (
 SELECT 'outgoing' AS scene,to_user_id AS other_id FROM app_relation_like
 WHERE from_user_id=@target_user AND deleted=0 AND like_status='active' AND active_marker=1
 UNION ALL SELECT 'incoming',from_user_id FROM app_relation_like
 WHERE to_user_id=@target_user AND deleted=0 AND like_status='active' AND active_marker=1
 UNION ALL SELECT 'visitors',visitor_user_id FROM app_relation_visit
 WHERE target_user_id=@target_user AND deleted=0 AND visit_status='visible'
) p LEFT JOIN app_user u ON u.id=p.other_id
GROUP BY p.scene,u.account_status,u.deleted,u.first_login_completed;
SELECT 'recommend_likes' AS section, COUNT(*) AS n, MAX(viewed_at) AS latest
FROM ct_recommend_view_log WHERE user_id=@target_user AND deleted=0 AND action='like';
SELECT 'cancel_requests' AS section, status, create_time, update_time, revoked_time, final_cancel_time
FROM app_user_cancel_request WHERE user_id=@target_user ORDER BY id DESC LIMIT 5;
SELECT 'security_events' AS section, biz_type, action, create_time
FROM app_user_security_audit_log WHERE user_id=@target_user
AND create_time>='2026-10-10 00:00:00' ORDER BY id DESC LIMIT 15;
SELECT 'admin_events' AS section, action, create_time
FROM content_operation_log WHERE biz_type='APP_USER' AND biz_id=@target_user
AND create_time>='2026-10-10 00:00:00' ORDER BY id DESC LIMIT 15;
SELECT 'like_invalid_times' AS section, invalid_time, COUNT(*) AS n
FROM app_relation_like WHERE (from_user_id=@target_user OR to_user_id=@target_user)
AND invalid_reason='account_deleted' GROUP BY invalid_time ORDER BY invalid_time DESC;
SELECT 'invalid_counterparties' AS section, p.scene, u.account_status, u.deleted, COUNT(*) AS n
FROM (
 SELECT 'outgoing' AS scene,to_user_id AS other_id FROM app_relation_like
 WHERE from_user_id=@target_user AND invalid_reason='account_deleted' AND invalid_time='2026-10-10 14:16:37'
 UNION ALL SELECT 'incoming',from_user_id FROM app_relation_like
 WHERE to_user_id=@target_user AND invalid_reason='account_deleted' AND invalid_time='2026-10-10 14:16:37'
 UNION ALL SELECT 'visitors',visitor_user_id FROM app_relation_visit
 WHERE target_user_id=@target_user AND invalid_reason='account_deleted' AND invalid_time='2026-10-10 14:16:37'
) p LEFT JOIN app_user u ON u.id=p.other_id GROUP BY p.scene,u.account_status,u.deleted;
COMMIT;
