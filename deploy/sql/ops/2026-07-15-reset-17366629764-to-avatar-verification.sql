-- =====================================================
-- 将指定账号回退到“头像认证”步骤
-- 目标账号：17366629764
--
-- 处理原则：
-- 1. 保留首登资料和基本资料，不清空用户已经填写的字段。
-- 2. 若家乡省市区为空，复用该账号已有的现居省市区，确保基本资料已完成。
-- 3. 将头像、自我介绍、实名、学历的现存审核记录统一置为 EXPIRED。
-- 4. 为每条发生变化的审核记录写入 SYSTEM_EXPIRE 历史，保留审计链路。
-- 5. 可重复执行；已经 EXPIRED 的记录不会重复写历史。
-- =====================================================

DROP PROCEDURE IF EXISTS spacetime_reset_17366629764_to_avatar;

DELIMITER $$

CREATE PROCEDURE spacetime_reset_17366629764_to_avatar()
BEGIN
    DECLARE v_target_phone VARCHAR(30) DEFAULT '17366629764';
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_expired_count INT DEFAULT 0;
    DECLARE v_updated_count INT DEFAULT 0;
    DECLARE v_reason VARCHAR(500) DEFAULT '测试账号认证流程回退到头像认证，2026-07-15';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT COUNT(*), MAX(id)
      INTO v_user_count, v_user_id
      FROM app_user
     WHERE BINARY phone = BINARY v_target_phone
       AND deleted = 0;

    IF v_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '目标手机号不存在或存在重复账号，已停止回退';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM app_user
         WHERE id = v_user_id
           AND (hometown_province IS NULL OR hometown_province = '')
           AND (location_province IS NULL OR location_province = '')
    ) OR EXISTS (
        SELECT 1
          FROM app_user
         WHERE id = v_user_id
           AND (hometown_city IS NULL OR hometown_city = '')
           AND (location_city IS NULL OR location_city = '')
    ) OR EXISTS (
        SELECT 1
          FROM app_user
         WHERE id = v_user_id
           AND (hometown_district IS NULL OR hometown_district = '')
           AND (location_district IS NULL OR location_district = '')
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '目标账号缺少可复用的现居省市区，无法直接回退到头像认证';
    END IF;

    START TRANSACTION;

    UPDATE app_user
       SET hometown_province = COALESCE(NULLIF(hometown_province, ''), location_province),
           hometown_city = COALESCE(NULLIF(hometown_city, ''), location_city),
           hometown_district = COALESCE(NULLIF(hometown_district, ''), location_district),
           updated_by = v_user_id,
           update_time = CURRENT_TIMESTAMP
     WHERE id = v_user_id
       AND deleted = 0;

    INSERT INTO app_user_audit_history (
        audit_record_id,
        user_id,
        audit_type,
        from_status,
        to_status,
        audit_source,
        action,
        reason,
        operator_type,
        operator_id,
        operator_name,
        provider_task_id,
        snapshot_json,
        create_time,
        update_time,
        created_by,
        updated_by,
        deleted
    )
    SELECT record.id,
           record.user_id,
           record.audit_type,
           record.status,
           'EXPIRED',
           record.audit_source,
           'SYSTEM_EXPIRE',
           v_reason,
           'SYSTEM',
           NULL,
           '认证流程回退脚本',
           record.provider_task_id,
           JSON_OBJECT(
               'operation', 'RESET_TO_AVATAR',
               'previousStatus', record.status,
               'reason', v_reason
           ),
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP,
           NULL,
           NULL,
           0
      FROM app_user_audit_record AS record
     WHERE record.user_id = v_user_id
       AND record.audit_type IN ('AVATAR', 'ABOUT_ME', 'REAL_NAME', 'EDUCATION')
       AND record.status <> 'EXPIRED'
       AND record.deleted = 0;

    SET v_expired_count = ROW_COUNT();

    UPDATE app_user_audit_record
       SET status = 'EXPIRED',
           expired_reason = v_reason,
           audit_time = CURRENT_TIMESTAMP,
           auditor_id = NULL,
           updated_by = NULL,
           update_time = CURRENT_TIMESTAMP
     WHERE user_id = v_user_id
       AND audit_type IN ('AVATAR', 'ABOUT_ME', 'REAL_NAME', 'EDUCATION')
       AND status <> 'EXPIRED'
       AND deleted = 0;

    SET v_updated_count = ROW_COUNT();

    IF v_updated_count <> v_expired_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '审核记录与历史写入数量不一致，已回滚';
    END IF;

    COMMIT;

    SELECT v_user_id AS user_id,
           v_updated_count AS expired_record_count,
           'AVATAR' AS next_verification_step;
END $$

DELIMITER ;

CALL spacetime_reset_17366629764_to_avatar();

DROP PROCEDURE IF EXISTS spacetime_reset_17366629764_to_avatar;

-- 执行后回查：基本资料应完整，四类记录最新状态应为 EXPIRED。
SELECT id,
       phone,
       first_login_completed,
       hometown_province,
       hometown_city,
       hometown_district
  FROM app_user
 WHERE phone = '17366629764'
   AND deleted = 0;

SELECT audit_type,
       status,
       submit_time,
       audit_time,
       expired_reason
  FROM app_user_audit_record
 WHERE user_id = (
           SELECT id
             FROM app_user
            WHERE phone = '17366629764'
              AND deleted = 0
            LIMIT 1
       )
   AND audit_type IN ('AVATAR', 'ABOUT_ME', 'REAL_NAME', 'EDUCATION')
   AND deleted = 0
 ORDER BY audit_type, submit_time DESC, id DESC;
