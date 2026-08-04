-- =============================================================
-- PRD-05 社区演示内容图片补齐与列表查询索引优化
-- 说明：仅更新固定演示帖子；图片已转为 960x720 WebP 并存入项目 OSS。
-- =============================================================

DROP PROCEDURE IF EXISTS prd05_add_community_index_if_missing;
DELIMITER $$
CREATE PROCEDURE prd05_add_community_index_if_missing(
    IN p_table_name VARCHAR(64), IN p_index_name VARCHAR(64), IN p_index_ddl TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = p_table_name
           AND index_name = p_index_name
    ) THEN
        SET @prd05_community_ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD ', p_index_ddl);
        PREPARE prd05_community_stmt FROM @prd05_community_ddl;
        EXECUTE prd05_community_stmt;
        DEALLOCATE PREPARE prd05_community_stmt;
    END IF;
END$$
DELIMITER ;

CALL prd05_add_community_index_if_missing(
    'community_audit_record',
    'idx_community_audit_biz_id_time',
    'INDEX idx_community_audit_biz_id_time (biz_type, biz_id, deleted, create_time)'
);

DROP PROCEDURE IF EXISTS prd05_add_community_index_if_missing;

UPDATE community_post
   SET image_urls = JSON_ARRAY(
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/c68220654bccd343/camping.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/7defd83c31c6dea6/lake.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/6cbefc15fb2a45d3/greenery.webp'
   )
 WHERE post_no = 'POST-0000000000000001' AND deleted = 0;

UPDATE community_post
   SET image_urls = JSON_ARRAY(
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/11ed2f2331e972fb/coffee.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/415aef3f60d3c52a/bookstore.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/5a904705a92fa0c8/hiking.webp'
   )
 WHERE post_no = 'POST-0000000000000002' AND deleted = 0;

UPDATE community_post
   SET image_urls = JSON_ARRAY(
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/657edf371fe06d7e/museum.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/0d21b8004eaeb0b2/city.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/11ed2f2331e972fb/coffee.webp'
   )
 WHERE post_no = 'POST-0000000000000003' AND deleted = 0;

UPDATE community_post
   SET image_urls = JSON_ARRAY(
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/033a649fca399de0/bakery.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/657edf371fe06d7e/museum.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/415aef3f60d3c52a/bookstore.webp'
   )
 WHERE post_no = 'POST-0000000000000004' AND deleted = 0;

UPDATE community_post
   SET image_urls = JSON_ARRAY(
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/0d21b8004eaeb0b2/city.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/11ed2f2331e972fb/coffee.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/033a649fca399de0/bakery.webp'
   )
 WHERE post_no = 'POST-0000000000000005' AND deleted = 0;

UPDATE community_post
   SET image_urls = JSON_ARRAY(
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/6cbefc15fb2a45d3/greenery.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/98e751a59a35983d/cycling.webp',
       'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/7defd83c31c6dea6/lake.webp'
   )
 WHERE post_no = 'POST-0000000000000006' AND deleted = 0;
