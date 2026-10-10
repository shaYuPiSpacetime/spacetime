-- 用户授权账号的只读状态诊断；不输出手机号、正文、图片、Token 或审核原始载荷。
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET TRANSACTION READ ONLY;
START TRANSACTION;
SET @target_hash = 'a27e5899573ad6b7e16f4778a8d453ea3f7faae700d48368875f48f2f244d56a';
SELECT COUNT(*), IF(COUNT(*) = 1, MIN(id), NULL) INTO @target_count, @target_user
  FROM app_user WHERE deleted = 0
   AND (phone_hash = @target_hash OR SHA2(TRIM(phone), 256) = @target_hash);
SELECT 'account' AS section, @target_count AS matched_accounts;
SELECT 'post' AS section, id, status, audit_status, machine_result, machine_code,
       CHAR_LENGTH(content) AS text_length, JSON_LENGTH(image_urls) AS image_count,
       version, deleted_by_user, deleted, create_time, update_time,
       CASE WHEN audit_remark IS NULL OR audit_remark='' THEN 0 ELSE 1 END AS has_reason
  FROM community_post WHERE author_id=@target_user
 ORDER BY id DESC LIMIT 12;
SELECT 'audit' AS section, a.biz_id, a.action, a.result, a.provider_code, a.create_time
  FROM community_audit_record a JOIN community_post p ON p.id=a.biz_id AND a.biz_type='post'
 WHERE p.author_id=@target_user ORDER BY a.id DESC LIMIT 18;
SELECT 'media' AS section, t.post_id, t.status, t.provider_label, t.callback_time
  FROM community_media_audit_task t JOIN community_post p ON p.id=t.post_id
 WHERE p.author_id=@target_user ORDER BY t.id DESC LIMIT 12;
-- 只读取本账号最新驳回实际命中的规则，核对误判；仍不输出用户正文。
SELECT 'matched_rule' AS section, w.id, w.word, w.category_code, w.status, w.deleted,
       CHAR_LENGTH(w.word) AS word_length,
       (SELECT COUNT(*) FROM community_post p WHERE p.author_id=@target_user
          AND p.machine_code=CONCAT('local_sensitive_word:', w.id)
          AND LOCATE(w.word, p.content)>0) AS literal_match_posts
  FROM content_sensitive_word w
 WHERE w.id=(SELECT CAST(SUBSTRING_INDEX(machine_code, ':', -1) AS UNSIGNED)
   FROM community_post WHERE author_id=@target_user AND machine_code LIKE 'local_sensitive_word:%'
   ORDER BY id DESC LIMIT 1);
COMMIT;
