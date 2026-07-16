-- 指定测试账号三重认证置为成功；仅处理头像、实名、学历各自最新记录。
-- 材料不完整、手机号不唯一或三类记录不全时整单回滚，可重复执行。

DROP PROCEDURE IF EXISTS spacetime_approve_triple_17366629764;

DELIMITER $$

CREATE PROCEDURE spacetime_approve_triple_17366629764()
BEGIN
    DECLARE v_phone VARCHAR(30) DEFAULT '17366629764';
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_avatar_id BIGINT DEFAULT NULL;
    DECLARE v_real_name_id BIGINT DEFAULT NULL;
    DECLARE v_education_id BIGINT DEFAULT NULL;
    DECLARE v_history_count INT DEFAULT 0;
    DECLARE v_updated_count INT DEFAULT 0;
    DECLARE v_approved_count INT DEFAULT 0;
    DECLARE v_reason VARCHAR(500) DEFAULT '定向测试账号三重认证置为成功，2026-07-15';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*), MAX(id) INTO v_user_count, v_user_id
      FROM app_user
     WHERE BINARY phone = BINARY v_phone AND deleted = 0;

    IF v_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '目标手机号不存在或存在重复账号，已停止执行';
    END IF;

    SET v_avatar_id = (SELECT id FROM app_user_audit_record WHERE user_id = v_user_id AND audit_type = 'AVATAR' AND deleted = 0 ORDER BY submit_time DESC, id DESC LIMIT 1);
    SET v_real_name_id = (SELECT id FROM app_user_audit_record WHERE user_id = v_user_id AND audit_type = 'REAL_NAME' AND deleted = 0 ORDER BY submit_time DESC, id DESC LIMIT 1);
    SET v_education_id = (SELECT id FROM app_user_audit_record WHERE user_id = v_user_id AND audit_type = 'EDUCATION' AND deleted = 0 ORDER BY submit_time DESC, id DESC LIMIT 1);

    IF v_avatar_id IS NULL OR v_real_name_id IS NULL OR v_education_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '目标账号缺少头像、实名或学历最新审核记录';
    END IF;
    IF EXISTS (SELECT 1 FROM app_user_audit_record WHERE id = v_avatar_id AND (media_url IS NULL OR media_url = '')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '最新头像记录缺少图片，禁止直接通过';
    END IF;
    IF EXISTS (SELECT 1 FROM app_user_audit_record WHERE id = v_real_name_id AND (real_name IS NULL OR real_name = '' OR id_card IS NULL OR id_card = '')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '最新实名记录缺少姓名或身份证信息';
    END IF;
    IF EXISTS (SELECT 1 FROM app_user_audit_record WHERE id = v_education_id AND (education_method IS NULL OR education_method = '' OR school_name IS NULL OR school_name = '' OR material_json IS NULL)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '最新学历记录材料不完整';
    END IF;

    INSERT INTO app_user_audit_history (
        audit_record_id, user_id, audit_type, from_status, to_status,
        audit_source, action, reason, operator_type, operator_id, operator_name,
        provider_task_id, snapshot_json, create_time, update_time,
        created_by, updated_by, deleted
    )
    SELECT record.id, record.user_id, record.audit_type, record.status, 'APPROVED',
           'MANUAL', 'MANUAL_APPROVE', v_reason, 'ADMIN', NULL, '定向测试账号修复脚本',
           record.provider_task_id,
           JSON_OBJECT('operation', 'TARGET_ACCOUNT_TRIPLE_APPROVE', 'previousStatus', record.status, 'reason', v_reason),
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, 0
      FROM app_user_audit_record record
     WHERE record.id IN (v_avatar_id, v_real_name_id, v_education_id)
       AND record.status <> 'APPROVED' AND record.deleted = 0;

    SET v_history_count = ROW_COUNT();

    UPDATE app_user_audit_record
       SET status = 'APPROVED', audit_source = 'MANUAL', reject_reason = NULL,
           expired_reason = NULL, audit_time = CURRENT_TIMESTAMP, auditor_id = NULL,
           update_time = CURRENT_TIMESTAMP, updated_by = NULL
     WHERE id IN (v_avatar_id, v_real_name_id, v_education_id)
       AND status <> 'APPROVED' AND deleted = 0;

    SET v_updated_count = ROW_COUNT();
    IF v_updated_count <> v_history_count THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '审核记录与历史写入数量不一致';
    END IF;

    SELECT COUNT(*) INTO v_approved_count
      FROM app_user_audit_record
     WHERE id IN (v_avatar_id, v_real_name_id, v_education_id)
       AND status = 'APPROVED' AND deleted = 0;
    IF v_approved_count <> 3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '三类最新记录未全部通过';
    END IF;

    COMMIT;
    SELECT v_user_id AS user_id, v_avatar_id AS avatar_record_id,
           v_real_name_id AS real_name_record_id, v_education_id AS education_record_id,
           v_updated_count AS changed_record_count, 3 AS expected_verify_level,
           'CORE_ALLOWED' AS expected_core_access_status;
END $$

DELIMITER ;

CALL spacetime_approve_triple_17366629764();
DROP PROCEDURE IF EXISTS spacetime_approve_triple_17366629764;
