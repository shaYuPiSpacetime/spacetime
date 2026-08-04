-- =============================================================
-- PRD-05 家园话题真实封面与演示数据丰富
-- 说明：封面复用项目 OSS 已验收 WebP；按话题编码幂等补齐 10 个话题。
-- =============================================================

INSERT INTO community_topic (
    topic_code, topic_name, description, cover_url, cover_audit_status,
    display_scenes, recommended, sort, status, version,
    create_time, update_time, deleted
)
VALUES
    ('camp', '露营交友', '在自然里认识聊得来的人',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/c68220654bccd343/camping.webp',
     'approved', JSON_ARRAY('hot', 'topic_list', 'publish'), 1, 10, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('serious_love', '认真脱单', '真诚表达期待，寻找长期关系',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/7defd83c31c6dea6/lake.webp',
     'approved', JSON_ARRAY('hot', 'topic_list', 'publish'), 1, 20, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('weekend_buddy', '周末搭子', '周末活动、短途出游与同城邀约',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/6cbefc15fb2a45d3/greenery.webp',
     'approved', JSON_ARRAY('hot', 'topic_list', 'publish'), 1, 30, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('city_walk', '城市漫步', '发现城市街区与适合约会的小路',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/0d21b8004eaeb0b2/city.webp',
     'approved', JSON_ARRAY('hot', 'topic_list', 'publish'), 1, 40, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('coffee_chat', '咖啡碰面', '分享咖啡馆，也约一场轻松见面',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/11ed2f2331e972fb/coffee.webp',
     'approved', JSON_ARRAY('hot', 'topic_list', 'publish'), 1, 50, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('museum_date', '一起看展', '展览、博物馆与城市文化活动',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/657edf371fe06d7e/museum.webp',
     'approved', JSON_ARRAY('topic_list', 'publish'), 0, 60, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('hiking_buddy', '徒步搭子', '轻徒步、登山和户外路线分享',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/5a904705a92fa0c8/hiking.webp',
     'approved', JSON_ARRAY('topic_list', 'publish'), 0, 70, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('cycling_club', '骑行同伴', '城市骑行、环湖路线与组队计划',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/98e751a59a35983d/cycling.webp',
     'approved', JSON_ARRAY('topic_list', 'publish'), 0, 80, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('book_club', '读书会', '交换书单，分享最近打动你的文字',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/415aef3f60d3c52a/bookstore.webp',
     'approved', JSON_ARRAY('topic_list', 'publish'), 0, 90, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('food_hunt', '美食探店', '小店、烘焙与值得再去的味道',
     'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/033a649fca399de0/bakery.webp',
     'approved', JSON_ARRAY('topic_list', 'publish'), 0, 100, 'enabled', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON DUPLICATE KEY UPDATE
    description = COALESCE(NULLIF(description, ''), VALUES(description)),
    cover_audit_status = CASE
        WHEN cover_url IS NULL OR cover_url = '' THEN VALUES(cover_audit_status)
        ELSE cover_audit_status
    END,
    cover_url = COALESCE(NULLIF(cover_url, ''), VALUES(cover_url)),
    display_scenes = COALESCE(display_scenes, VALUES(display_scenes)),
    recommended = VALUES(recommended),
    sort = VALUES(sort),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;
