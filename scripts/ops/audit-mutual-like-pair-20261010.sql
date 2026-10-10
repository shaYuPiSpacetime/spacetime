-- Authorized read-only diagnosis for the explicitly named pair.
-- Outputs only IDs, counts, relation statuses and timestamps; no chat content or account identifiers.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET TRANSACTION READ ONLY;
START TRANSACTION;

SELECT COUNT(*), IF(COUNT(*) = 1, MIN(id), NULL)
INTO @princess_count, @princess_user
FROM app_user
WHERE nickname = '小坏公主' AND deleted = 0;

SELECT COUNT(*), IF(COUNT(*) = 1, MIN(id), NULL)
INTO @user1052_count, @user1052
FROM app_user
WHERE id = 1052 AND deleted = 0;

SET @pair_low = LEAST(@princess_user, @user1052);
SET @pair_high = GREATEST(@princess_user, @user1052);

SELECT 'resolved_users' AS section,
       @princess_count AS princess_matches,
       @princess_user AS princess_user_id,
       @user1052_count AS user1052_matches,
       @user1052 AS user1052_user_id;

SELECT 'pair_summary' AS section,
       (SELECT COUNT(*) FROM app_relation_like
        WHERE from_user_id = @princess_user AND to_user_id = @user1052
          AND like_status = 'active' AND active_marker = 1 AND deleted = 0) AS princess_to_1052_active_likes,
       (SELECT COUNT(*) FROM app_relation_like
        WHERE from_user_id = @user1052 AND to_user_id = @princess_user
          AND like_status = 'active' AND active_marker = 1 AND deleted = 0) AS user1052_to_princess_active_likes,
       (SELECT COUNT(*) FROM app_relation_match m
        WHERE m.user_low_id = @pair_low AND m.user_high_id = @pair_high
          AND m.match_status = 'matched' AND m.active_marker = 1 AND m.deleted = 0) AS active_matches,
       (SELECT COUNT(*) FROM app_relation_match m
        JOIN app_relation_match_source s ON s.match_id = m.id
        WHERE m.user_low_id = @pair_low AND m.user_high_id = @pair_high
          AND m.match_status = 'matched' AND m.active_marker = 1 AND m.deleted = 0
          AND s.source_type = 'double_like' AND s.source_status = 'active' AND s.deleted = 0) AS active_double_like_sources,
       (SELECT COUNT(*) FROM app_message_conversation c
        WHERE c.user_low_id = @pair_low AND c.user_high_id = @pair_high
          AND c.status = 'active' AND c.active_marker = 1 AND c.deleted = 0) AS active_conversations;

SELECT 'likes' AS section,
       CASE WHEN from_user_id = @princess_user THEN 'princess_to_1052' ELSE '1052_to_princess' END AS direction,
       like_status, active_marker, deleted, COALESCE(invalid_reason, '-') AS invalid_reason,
       COUNT(*) AS rows_count, MIN(liked_time) AS first_liked_time, MAX(update_time) AS last_update_time
FROM app_relation_like
WHERE (from_user_id = @princess_user AND to_user_id = @user1052)
   OR (from_user_id = @user1052 AND to_user_id = @princess_user)
GROUP BY direction, like_status, active_marker, deleted, invalid_reason
ORDER BY direction, last_update_time;

SELECT 'matches' AS section, id AS match_id, primary_source, match_status, active_marker, deleted,
       COALESCE(invalid_reason, '-') AS invalid_reason, matched_time, update_time
FROM app_relation_match
WHERE user_low_id = @pair_low AND user_high_id = @pair_high
ORDER BY id;

SELECT 'match_sources' AS section, s.match_id, s.source_type, s.source_status, s.deleted,
       COALESCE(s.invalid_reason, '-') AS invalid_reason, s.effective_time, s.update_time
FROM app_relation_match_source s
JOIN app_relation_match m ON m.id = s.match_id
WHERE m.user_low_id = @pair_low AND m.user_high_id = @pair_high
ORDER BY s.match_id, s.id;

SELECT 'conversations' AS section, match_id, status, active_marker, deleted,
       COALESCE(invalid_reason, '-') AS invalid_reason,
       IF(last_message_id IS NULL, 0, 1) AS has_last_message,
       last_message_time, create_time, update_time
FROM app_message_conversation
WHERE user_low_id = @pair_low AND user_high_id = @pair_high
ORDER BY id;

COMMIT;
