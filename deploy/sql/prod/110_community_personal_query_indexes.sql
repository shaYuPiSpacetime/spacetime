-- 我的动态/互动个人区索引：与实时聚合、数据库分页和稳定倒序查询配套。
-- 只新增索引，不修改业务数据；information_schema 检查确保可重复执行。
DROP PROCEDURE IF EXISTS add_community_personal_query_indexes;
DELIMITER $$
CREATE PROCEDURE add_community_personal_query_indexes()
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_post')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_post' AND INDEX_NAME='idx_post_author_page') THEN
        ALTER TABLE `community_post` ADD INDEX `idx_post_author_page` (author_id, deleted, create_time DESC, id DESC);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_comment')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_comment' AND INDEX_NAME='idx_comment_author_history') THEN
        ALTER TABLE `community_comment` ADD INDEX `idx_comment_author_history` (author_id, deleted, status, create_time DESC, id DESC, post_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_like')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_like' AND INDEX_NAME='idx_like_user_history') THEN
        ALTER TABLE `community_like` ADD INDEX `idx_like_user_history` (user_id, deleted, status, update_time DESC, id DESC, post_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_view_history')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_view_history' AND INDEX_NAME='idx_view_user_page') THEN
        ALTER TABLE `community_view_history` ADD INDEX `idx_view_user_page` (user_id, deleted, viewed_at DESC, id DESC, post_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_follow')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_follow' AND INDEX_NAME='idx_follow_follower_page') THEN
        ALTER TABLE `community_follow` ADD INDEX `idx_follow_follower_page` (follower_id, deleted, status, update_time DESC, id DESC, target_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_follow')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_follow' AND INDEX_NAME='idx_follow_target_page') THEN
        ALTER TABLE `community_follow` ADD INDEX `idx_follow_target_page` (target_user_id, deleted, status, update_time DESC, id DESC, follower_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_comment_like')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_comment_like' AND INDEX_NAME='idx_comment_like_count') THEN
        ALTER TABLE `community_comment_like` ADD INDEX `idx_comment_like_count` (comment_id, deleted, status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='app_user_unlock_record')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='app_user_unlock_record' AND INDEX_NAME='idx_unlock_user_history') THEN
        ALTER TABLE `app_user_unlock_record` ADD INDEX `idx_unlock_user_history` (user_id, deleted, effective_time DESC, id DESC, target_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_content_preference')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_content_preference' AND INDEX_NAME='idx_preference_user_page') THEN
        ALTER TABLE `community_content_preference` ADD INDEX `idx_preference_user_page` (user_id, deleted, action_type, status, update_time DESC, id DESC, target_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_like')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_like' AND INDEX_NAME='idx_like_post_interactors') THEN
        ALTER TABLE `community_like` ADD INDEX `idx_like_post_interactors` (post_id, deleted, status, update_time DESC, id DESC, user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_comment')
       AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_comment' AND INDEX_NAME='idx_comment_post_interactors') THEN
        ALTER TABLE `community_comment` ADD INDEX `idx_comment_post_interactors` (post_id, deleted, status, create_time DESC, id DESC, author_id);
    END IF;
END $$
DELIMITER ;
CALL add_community_personal_query_indexes();
DROP PROCEDURE IF EXISTS add_community_personal_query_indexes;
