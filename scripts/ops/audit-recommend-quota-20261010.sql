-- 只读审计授权账号的额度与回看统计；仅输出聚合数量，不输出个人资料。
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET TRANSACTION READ ONLY;
START TRANSACTION;
SET @target_hash = 'a27e5899573ad6b7e16f4778a8d453ea3f7faae700d48368875f48f2f244d56a';
SELECT COUNT(*), IF(COUNT(*) = 1, MIN(id), NULL) INTO @target_count, @target_user
  FROM app_user WHERE deleted = 0
   AND (phone_hash = @target_hash OR SHA2(TRIM(phone), 256) = @target_hash);
SET @audit_now = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR);
SET @cycle_start = TIMESTAMP(DATE(DATE_SUB(@audit_now, INTERVAL 12 HOUR)), '12:00:00');
SET @cycle_end = DATE_ADD(@cycle_start, INTERVAL 1 DAY);
SET @replay_start = TIMESTAMP(DATE_SUB(DATE(@audit_now), INTERVAL 2 DAY));
SET @last_reset = (SELECT MAX(executed_at) FROM ops_recommend_reset_log WHERE user_id = @target_user);
SELECT 'account' AS section, JSON_OBJECT(
    'matched_accounts', @target_count, 'audit_time', @audit_now,
    'cycle_start', @cycle_start, 'cycle_end', @cycle_end, 'last_reset', @last_reset,
    'vip_effective', EXISTS(SELECT 1 FROM app_user_asset WHERE user_id=@target_user AND deleted=0
        AND vip_status='active' AND (vip_expire_time IS NULL OR vip_expire_time>@audit_now)),
    'normal_quota', (SELECT MAX(config_value) FROM app_config WHERE config_key='commercial.view.quota.normal' AND deleted=0),
    'vip_quota', (SELECT MAX(config_value) FROM app_config WHERE config_key='commercial.view.quota.vip' AND deleted=0)
) AS result;
SELECT 'current_cycle' AS section, action, COUNT(*) AS rows_count,
       COUNT(DISTINCT candidate_user_id) AS unique_candidates,
       MIN(viewed_at) AS first_at, MAX(viewed_at) AS last_at
  FROM ct_recommend_view_log WHERE user_id=@target_user AND deleted=0
   AND viewed_at>=@cycle_start AND viewed_at<@cycle_end
 GROUP BY action;
SELECT 'replay_day' AS section, DATE(viewed_at) AS calendar_day,
       COUNT(DISTINCT candidate_user_id) AS replay_candidates,
       COUNT(DISTINCT CASE WHEN action='view' THEN candidate_user_id END) AS viewed_candidates,
       COUNT(DISTINCT CASE WHEN viewed_at>=@last_reset THEN candidate_user_id END) AS after_reset_candidates
  FROM ct_recommend_view_log WHERE user_id=@target_user AND deleted=0
   AND viewed_at>=@replay_start AND action IN ('view','skip','detail','like')
 GROUP BY DATE(viewed_at) ORDER BY calendar_day DESC;
SELECT 'after_reset' AS section, action, COUNT(*) AS rows_count,
       COUNT(DISTINCT candidate_user_id) AS unique_candidates
  FROM ct_recommend_view_log WHERE user_id=@target_user AND deleted=0 AND viewed_at>=@last_reset
 GROUP BY action;
SELECT 'replay_without_view_same_day' AS section, DATE(a.viewed_at) AS calendar_day,
       COUNT(DISTINCT a.candidate_user_id) AS candidates_without_view
  FROM ct_recommend_view_log a
 WHERE a.user_id=@target_user AND a.deleted=0 AND a.viewed_at>=@replay_start
   AND a.action IN ('skip','detail','like')
   AND NOT EXISTS (SELECT 1 FROM ct_recommend_view_log v
        WHERE v.user_id=a.user_id AND v.candidate_user_id=a.candidate_user_id AND v.deleted=0
          AND v.action='view' AND DATE(v.viewed_at)=DATE(a.viewed_at))
 GROUP BY DATE(a.viewed_at) ORDER BY calendar_day DESC;
COMMIT;
