-- ======================================================
-- PRD-01 学历认证审核场景测试数据
-- 说明：
-- 1. 仅维护 openid 以 prd01_edu_scene_ 开头的测试用户。
-- 2. 覆盖待审核、审核中、已通过、已驳回、已失效，以及四种学历认证方式。
-- 3. 学历身份按业务路径派生：STUDENT=在校生，MAINLAND_GRADUATE=职场人。
-- ======================================================

INSERT INTO app_user (
    openid, unionid, phone, register_source, register_time, last_login_time,
    account_status, first_login_completed, first_login_next_step, nickname,
    gender, birthday, age, identity, school, education_level,
    create_time, update_time, deleted
)
SELECT 'prd01_edu_scene_pending', 'prd01_edu_scene_pending_u', '13910001001', 'WECHAT',
       '2026-07-13 09:00:00', '2026-07-13 18:00:00', 'ACTIVE', 1, NULL, '学历待审-在校生',
       'FEMALE', '2003-03-06', 23, 'STUDENT', '浙江大学', 'BACHELOR',
       NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE openid = 'prd01_edu_scene_pending');

INSERT INTO app_user (
    openid, unionid, phone, register_source, register_time, last_login_time,
    account_status, first_login_completed, first_login_next_step, nickname,
    gender, birthday, age, identity, school, education_level,
    create_time, update_time, deleted
)
SELECT 'prd01_edu_scene_reviewing', 'prd01_edu_scene_reviewing_u', '13910001002', 'WECHAT',
       '2026-07-12 09:00:00', '2026-07-12 20:00:00', 'ACTIVE', 1, NULL, '学历审核中-职场人',
       'MALE', '1997-08-18', 29, 'WORKER', '浙江工业大学', 'BACHELOR',
       NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE openid = 'prd01_edu_scene_reviewing');

INSERT INTO app_user (
    openid, unionid, phone, register_source, register_time, last_login_time,
    account_status, first_login_completed, first_login_next_step, nickname,
    gender, birthday, age, identity, school, education_level,
    create_time, update_time, deleted
)
SELECT 'prd01_edu_scene_approved', 'prd01_edu_scene_approved_u', '13910001003', 'WECHAT',
       '2026-07-02 09:00:00', '2026-07-13 12:00:00', 'ACTIVE', 1, NULL, '学历通过-证书编号',
       'FEMALE', '1995-05-20', 31, 'WORKER', '上海交通大学', 'MASTER',
       NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE openid = 'prd01_edu_scene_approved');

INSERT INTO app_user (
    openid, unionid, phone, register_source, register_time, last_login_time,
    account_status, first_login_completed, first_login_next_step, nickname,
    gender, birthday, age, identity, school, education_level,
    create_time, update_time, deleted
)
SELECT 'prd01_edu_scene_rejected', 'prd01_edu_scene_rejected_u', '13910001004', 'WECHAT',
       '2026-07-05 09:00:00', '2026-07-11 11:00:00', 'ACTIVE', 1, NULL, '学历驳回-材料上传',
       'MALE', '1992-11-08', 34, 'WORKER', '南京大学', 'BACHELOR',
       NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE openid = 'prd01_edu_scene_rejected');

INSERT INTO app_user (
    openid, unionid, phone, register_source, register_time, last_login_time,
    account_status, first_login_completed, first_login_next_step, nickname,
    gender, birthday, age, identity, school, education_level,
    create_time, update_time, deleted
)
SELECT 'prd01_edu_scene_expired', 'prd01_edu_scene_expired_u', '13910001005', 'WECHAT',
       '2026-06-28 09:00:00', '2026-07-10 10:00:00', 'ACTIVE', 1, NULL, '学历失效-学生证',
       'FEMALE', '2004-02-14', 22, 'STUDENT', '复旦大学', 'BACHELOR',
       NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE openid = 'prd01_edu_scene_expired');

UPDATE app_user
SET deleted = 0,
    first_login_completed = 1,
    first_login_next_step = NULL,
    update_time = NOW()
WHERE openid IN (
    'prd01_edu_scene_pending',
    'prd01_edu_scene_reviewing',
    'prd01_edu_scene_approved',
    'prd01_edu_scene_rejected',
    'prd01_edu_scene_expired'
);

DELETE h
FROM app_user_audit_history h
JOIN app_user_audit_record r ON r.id = h.audit_record_id
JOIN app_user u ON u.id = r.user_id
WHERE u.openid LIKE 'prd01_edu_scene_%'
  AND r.audit_type IN ('REAL_NAME', 'EDUCATION');

DELETE r
FROM app_user_audit_record r
JOIN app_user u ON u.id = r.user_id
WHERE u.openid LIKE 'prd01_edu_scene_%'
  AND r.audit_type IN ('REAL_NAME', 'EDUCATION');

INSERT INTO app_user_audit_record (
    user_id, audit_group, audit_type, status, audit_source,
    real_name, id_card, bound_phone, submit_time, audit_time,
    create_time, update_time, deleted
)
SELECT id, 'CERTIFICATION', 'REAL_NAME', 'APPROVED', 'MACHINE',
       CONCAT('测试实名', RIGHT(phone, 2)), CONCAT('11010119900101', RIGHT(phone, 4)), phone,
       register_time, DATE_ADD(register_time, INTERVAL 3 MINUTE),
       NOW(), NOW(), 0
FROM app_user
WHERE openid LIKE 'prd01_edu_scene_%';

INSERT INTO app_user_audit_record (
    user_id, audit_group, audit_type, status, audit_source, education_method, school_name,
    real_name, material_json, reject_reason, expired_reason, submit_time, audit_time,
    machine_signal_json, create_time, update_time, deleted
)
SELECT id, 'CERTIFICATION', 'EDUCATION', 'PENDING', 'MACHINE', 'STUDENT_CARD', '浙江大学',
       '测试实名01',
       JSON_OBJECT(
           'educationUserType', 'STUDENT',
           'educationLevel', 'BACHELOR',
           'identity', 'STUDENT',
           'materialUrls', JSON_ARRAY('https://example.test/prd01/student-card-a.jpg', 'https://example.test/prd01/student-card-b.jpg')
       ),
       NULL, NULL, '2026-07-13 18:04:16', NULL,
       JSON_OBJECT('mocked', true, 'scene', 'pending'),
       NOW(), NOW(), 0
FROM app_user
WHERE openid = 'prd01_edu_scene_pending';

INSERT INTO app_user_audit_record (
    user_id, audit_group, audit_type, status, audit_source, education_method, school_name,
    real_name, material_json, reject_reason, expired_reason, submit_time, audit_time,
    machine_signal_json, create_time, update_time, deleted
)
SELECT id, 'CERTIFICATION', 'EDUCATION', 'REVIEWING', 'MACHINE', 'CHSI', '浙江工业大学',
       '测试实名02',
       JSON_OBJECT(
           'educationUserType', 'MAINLAND_GRADUATE',
           'educationLevel', 'BACHELOR',
           'identity', 'WORKER',
           'chsiCode', '123456789012'
       ),
       NULL, NULL, '2026-07-12 21:30:00', NULL,
       JSON_OBJECT('mocked', true, 'scene', 'reviewing'),
       NOW(), NOW(), 0
FROM app_user
WHERE openid = 'prd01_edu_scene_reviewing';

INSERT INTO app_user_audit_record (
    user_id, audit_group, audit_type, status, audit_source, education_method, school_name,
    real_name, material_json, reject_reason, expired_reason, submit_time, audit_time,
    machine_signal_json, create_time, update_time, deleted
)
SELECT id, 'CERTIFICATION', 'EDUCATION', 'APPROVED', 'MACHINE', 'DIPLOMA_NO', '上海交通大学',
       '测试实名03',
       JSON_OBJECT(
           'educationUserType', 'MAINLAND_GRADUATE',
           'educationLevel', 'MASTER',
           'identity', 'WORKER',
           'diplomaNo', 'BY202607020001',
           'certificateName', '测试实名03'
       ),
       NULL, NULL, '2026-07-02 09:20:00', '2026-07-14 09:30:00',
       JSON_OBJECT('mocked', true, 'result', 'pass'),
       NOW(), NOW(), 0
FROM app_user
WHERE openid = 'prd01_edu_scene_approved';

INSERT INTO app_user_audit_record (
    user_id, audit_group, audit_type, status, audit_source, education_method, school_name,
    real_name, material_json, reject_reason, expired_reason, submit_time, audit_time,
    auditor_id, machine_signal_json, create_time, update_time, deleted
)
SELECT id, 'CERTIFICATION', 'EDUCATION', 'REJECTED', 'MANUAL', 'MATERIAL_UPLOAD', '南京大学',
       '测试实名04',
       JSON_OBJECT(
           'educationUserType', 'MAINLAND_GRADUATE',
           'educationLevel', 'BACHELOR',
           'identity', 'WORKER',
           'certificateName', '测试实名04',
           'materialUrls', JSON_ARRAY('https://example.test/prd01/diploma-a.jpg', 'https://example.test/prd01/degree-a.jpg')
       ),
       '证书材料姓名不清晰', NULL, '2026-07-05 10:15:00', '2026-07-06 10:30:00',
       1, JSON_OBJECT('mocked', true, 'result', 'manual_reject'),
       NOW(), NOW(), 0
FROM app_user
WHERE openid = 'prd01_edu_scene_rejected';

INSERT INTO app_user_audit_record (
    user_id, audit_group, audit_type, status, audit_source, education_method, school_name,
    real_name, material_json, reject_reason, expired_reason, submit_time, audit_time,
    auditor_id, machine_signal_json, create_time, update_time, deleted
)
SELECT id, 'CERTIFICATION', 'EDUCATION', 'EXPIRED', 'MANUAL', 'STUDENT_CARD', '复旦大学',
       '测试实名05',
       JSON_OBJECT(
           'educationUserType', 'STUDENT',
           'educationLevel', 'BACHELOR',
           'identity', 'STUDENT',
           'materialUrls', JSON_ARRAY('https://example.test/prd01/student-card-expired.jpg')
       ),
       NULL, '学生证已过有效期', '2026-06-28 09:30:00', '2026-07-01 09:30:00',
       1, JSON_OBJECT('mocked', true, 'result', 'manual_expire'),
       NOW(), NOW(), 0
FROM app_user
WHERE openid = 'prd01_edu_scene_expired';

INSERT INTO app_user_audit_history (
    audit_record_id, user_id, audit_type, from_status, to_status, audit_source,
    action, reason, operator_type, operator_id, operator_name, snapshot_json,
    create_time, update_time, deleted
)
SELECT r.id, r.user_id, r.audit_type, NULL, 'PENDING', r.audit_source,
       'SUBMIT', NULL, 'USER', r.user_id, '用户',
       JSON_OBJECT('auditType', r.audit_type, 'status', 'PENDING', 'educationMethod', r.education_method, 'schoolName', r.school_name, 'material', r.material_json),
       r.submit_time, NOW(), 0
FROM app_user_audit_record r
JOIN app_user u ON u.id = r.user_id
WHERE u.openid LIKE 'prd01_edu_scene_%';

INSERT INTO app_user_audit_history (
    audit_record_id, user_id, audit_type, from_status, to_status, audit_source,
    action, reason, operator_type, operator_id, operator_name, snapshot_json,
    create_time, update_time, deleted
)
SELECT r.id, r.user_id, r.audit_type, 'PENDING', r.status, r.audit_source,
       CASE
           WHEN r.status = 'APPROVED' AND r.audit_source = 'MACHINE' THEN 'MACHINE_PASS'
           WHEN r.status = 'REJECTED' THEN 'MANUAL_REJECT'
           WHEN r.status = 'EXPIRED' THEN 'MANUAL_EXPIRE'
           WHEN r.status = 'REVIEWING' THEN 'MACHINE_START'
           ELSE 'MACHINE_PASS'
       END,
       COALESCE(r.reject_reason, r.expired_reason),
       CASE WHEN r.audit_source = 'MANUAL' THEN 'ADMIN' ELSE 'PROVIDER' END,
       CASE WHEN r.audit_source = 'MANUAL' THEN r.auditor_id ELSE r.provider_task_id END,
       CASE WHEN r.audit_source = 'MANUAL' THEN 'peter' ELSE 'Provider' END,
       JSON_OBJECT('auditType', r.audit_type, 'status', r.status, 'educationMethod', r.education_method, 'schoolName', r.school_name, 'material', r.material_json),
       COALESCE(r.audit_time, DATE_ADD(r.submit_time, INTERVAL 5 MINUTE)), NOW(), 0
FROM app_user_audit_record r
JOIN app_user u ON u.id = r.user_id
WHERE u.openid LIKE 'prd01_edu_scene_%'
  AND r.status <> 'PENDING';
