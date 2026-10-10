-- Authorized recovery of the 2026-10-10 14:16:37 cancellation only.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ops_relation_restore_log (
 operation_key VARCHAR(96) PRIMARY KEY, user_id BIGINT NOT NULL,
 summary_json JSON NOT NULL, executed_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ops_bak_20261010_cancel_likes LIKE app_relation_like;
CREATE TABLE IF NOT EXISTS ops_bak_20261010_cancel_visits LIKE app_relation_visit;
DROP PROCEDURE IF EXISTS spacetime_ops_restore_cancel_20261010;
DELIMITER $$
CREATE PROCEDURE spacetime_ops_restore_cancel_20261010()
restore_main: BEGIN
 DECLARE v_key VARCHAR(96) DEFAULT 'restore_cancel_20261010_141637_a27e58';
 DECLARE v_hash CHAR(64) DEFAULT 'a27e5899573ad6b7e16f4778a8d453ea3f7faae700d48368875f48f2f244d56a';
 DECLARE v_time DATETIME DEFAULT '2026-10-10 14:16:37';
 DECLARE v_user BIGINT;
 DECLARE v_locked BIGINT;
 DECLARE v_count INT;
 DECLARE v_likes INT;
 DECLARE v_visits INT;
 DECLARE v_outgoing INT;
 DECLARE v_incoming INT;
 DECLARE v_summary JSON;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 SELECT COUNT(*), MIN(id) INTO v_count,v_user FROM app_user WHERE deleted=0
 AND (phone_hash=v_hash OR SHA2(TRIM(phone),256)=v_hash);
 IF v_count<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Target identity is not unique'; END IF;
 START TRANSACTION;
 SELECT id INTO v_locked FROM app_user WHERE id=v_user AND deleted=0 AND account_status='NORMAL' FOR UPDATE;
 IF v_locked IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Target account is not normal'; END IF;
 IF EXISTS(SELECT 1 FROM ops_relation_restore_log WHERE operation_key=v_key) THEN
  SELECT summary_json INTO v_summary FROM ops_relation_restore_log WHERE operation_key=v_key;
  COMMIT;
  SELECT 'already_completed' AS operation_status,v_summary AS summary_json;
  LEAVE restore_main;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM app_user_cancel_request WHERE user_id=v_user AND deleted=0
   AND create_time=v_time AND status='RESTORED' AND revoked_time='2026-10-10 14:16:40')
 OR EXISTS(SELECT 1 FROM app_user_cancel_request WHERE user_id=v_user AND deleted=0 AND create_time>v_time)
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cancellation recovery guard failed'; END IF;
 DROP TEMPORARY TABLE IF EXISTS tmp_restore_likes;
 DROP TEMPORARY TABLE IF EXISTS tmp_restore_visits;
 CREATE TEMPORARY TABLE tmp_restore_likes(id BIGINT PRIMARY KEY) ENGINE=InnoDB;
 CREATE TEMPORARY TABLE tmp_restore_visits(id BIGINT PRIMARY KEY) ENGINE=InnoDB;
 INSERT INTO tmp_restore_likes
 SELECT l.id FROM app_relation_like l
 JOIN app_user a ON a.id=l.from_user_id AND a.deleted=0 AND a.account_status='NORMAL'
 JOIN app_user b ON b.id=l.to_user_id AND b.deleted=0 AND b.account_status='NORMAL'
 WHERE (l.from_user_id=v_user OR l.to_user_id=v_user) AND l.deleted=0
 AND l.like_status='invalid' AND l.active_marker IS NULL AND l.cancelled_time IS NULL
 AND l.invalid_reason='account_deleted' AND l.invalid_time=v_time
 AND NOT EXISTS(SELECT 1 FROM app_relation_like newer WHERE newer.from_user_id=l.from_user_id
  AND newer.to_user_id=l.to_user_id AND newer.deleted=0
  AND (newer.id>l.id OR (newer.like_status='active' AND newer.active_marker=1)))
 AND NOT EXISTS(SELECT 1 FROM app_user_relation_block blocked WHERE blocked.deleted=0
  AND blocked.status='ENABLED' AND blocked.block_type='BLACKLIST'
  AND ((blocked.user_id=l.from_user_id AND blocked.target_user_id=l.to_user_id)
   OR (blocked.user_id=l.to_user_id AND blocked.target_user_id=l.from_user_id)));
 INSERT INTO tmp_restore_visits
 SELECT v.id FROM app_relation_visit v
 JOIN app_user u ON u.id=v.visitor_user_id AND u.deleted=0 AND u.account_status='NORMAL'
 WHERE v.target_user_id=v_user AND v.deleted=0 AND v.visit_status='invalid'
 AND v.invalid_reason='account_deleted' AND v.invalid_time=v_time
 AND NOT EXISTS(SELECT 1 FROM app_user_relation_block blocked WHERE blocked.deleted=0
  AND blocked.status='ENABLED' AND blocked.block_type='BLACKLIST'
  AND ((blocked.user_id=v.visitor_user_id AND blocked.target_user_id=v.target_user_id)
   OR (blocked.user_id=v.target_user_id AND blocked.target_user_id=v.visitor_user_id)));
 SELECT COUNT(*) INTO v_likes FROM tmp_restore_likes;
 SELECT COUNT(*) INTO v_visits FROM tmp_restore_visits;
 IF v_likes>34 OR v_visits>16 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Restore exceeds audited scope'; END IF;
 INSERT INTO ops_bak_20261010_cancel_likes SELECT l.* FROM app_relation_like l JOIN tmp_restore_likes t ON t.id=l.id;
 IF ROW_COUNT()<>v_likes THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Like backup mismatch'; END IF;
 INSERT INTO ops_bak_20261010_cancel_visits SELECT v.* FROM app_relation_visit v JOIN tmp_restore_visits t ON t.id=v.id;
 IF ROW_COUNT()<>v_visits THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Visit backup mismatch'; END IF;
 SELECT COUNT(*) INTO v_outgoing FROM app_relation_like l JOIN tmp_restore_likes t ON t.id=l.id WHERE l.from_user_id=v_user;
 SET v_incoming=v_likes-v_outgoing;
 UPDATE app_relation_like l JOIN tmp_restore_likes t ON t.id=l.id
 SET l.like_status='active',l.active_marker=1,l.invalid_reason=NULL,l.invalid_time=NULL,l.update_time=CURRENT_TIMESTAMP
 WHERE l.like_status='invalid' AND l.invalid_reason='account_deleted' AND l.invalid_time=v_time;
 IF ROW_COUNT()<>v_likes THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Like restore mismatch'; END IF;
 UPDATE app_relation_visit v JOIN tmp_restore_visits t ON t.id=v.id
 SET v.visit_status='visible',v.invalid_reason=NULL,v.invalid_time=NULL,v.update_time=CURRENT_TIMESTAMP
 WHERE v.visit_status='invalid' AND v.invalid_reason='account_deleted' AND v.invalid_time=v_time;
 IF ROW_COUNT()<>v_visits THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Visit restore mismatch'; END IF;
 SET v_summary=JSON_OBJECT('restored_outgoing',v_outgoing,'restored_incoming',v_incoming,'restored_visit_rows',v_visits,
  'active_outgoing_total',(SELECT COUNT(*) FROM app_relation_like WHERE from_user_id=v_user AND deleted=0 AND like_status='active' AND active_marker=1),
  'active_incoming_total',(SELECT COUNT(*) FROM app_relation_like WHERE to_user_id=v_user AND deleted=0 AND like_status='active' AND active_marker=1),
  'recent_7d_visitors',(SELECT COUNT(DISTINCT visitor_user_id) FROM app_relation_visit WHERE target_user_id=v_user AND deleted=0
    AND visit_status='visible' AND last_visit_time>=DATE_SUB(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),INTERVAL 7 DAY)));
 INSERT INTO ops_relation_restore_log VALUES(v_key,v_user,v_summary,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR));
 COMMIT;
 SELECT 'completed' AS operation_status,v_summary AS summary_json;
END$$
DELIMITER ;
CALL spacetime_ops_restore_cancel_20261010();
DROP PROCEDURE IF EXISTS spacetime_ops_restore_cancel_20261010;
