package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.model.community.CommunityInteractionProjection;
import com.spacetime.common.model.community.CommunityPersonalStats;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 个人区统计与历史查询；所有动态过滤均在数据库分页前执行。 */
@Mapper
public interface CommunityPersonalQueryMapper {
    /** 社区入口关注数字仅返回一个聚合值。 */
    @Select("""
            SELECT COUNT(*) FROM community_follow f WHERE f.follower_id=#{userId} AND f.deleted=0 AND f.status='FOLLOW'
             AND NOT EXISTS (SELECT 1 FROM app_user_relation_block b
                   WHERE b.deleted=0 AND b.status='ENABLED' AND b.block_type='BLACKLIST'
                   AND ((b.user_id=f.follower_id AND b.target_user_id=f.target_user_id)
                     OR (b.user_id=f.target_user_id AND b.target_user_id=f.follower_id)))
            """)
    long countFollowing(@Param("userId") Long userId);

    /** 动态数仅统计发布成功的内容，获赞口径保持不变。 */
    @Select("""
            SELECT
              (SELECT COUNT(*) FROM community_post p WHERE p.author_id=#{userId}
                 AND p.deleted=0 AND p.status='published') AS post_count,
              (SELECT COUNT(*) FROM community_follow f WHERE f.follower_id=#{userId}
                 AND f.deleted=0 AND f.status='FOLLOW' AND NOT EXISTS (SELECT 1 FROM app_user_relation_block b
                   WHERE b.deleted=0 AND b.status='ENABLED' AND b.block_type='BLACKLIST'
                   AND ((b.user_id=f.follower_id AND b.target_user_id=f.target_user_id)
                     OR (b.user_id=f.target_user_id AND b.target_user_id=f.follower_id)))) AS following_count,
              (SELECT COUNT(*) FROM community_follow f WHERE f.target_user_id=#{userId}
                 AND f.deleted=0 AND f.status='FOLLOW' AND NOT EXISTS (SELECT 1 FROM app_user_relation_block b
                   WHERE b.deleted=0 AND b.status='ENABLED' AND b.block_type='BLACKLIST'
                   AND ((b.user_id=f.follower_id AND b.target_user_id=f.target_user_id)
                     OR (b.user_id=f.target_user_id AND b.target_user_id=f.follower_id)))) AS follower_count,
              (SELECT COALESCE(SUM(p.like_count),0) FROM community_post p WHERE p.author_id=#{userId}
                 AND p.deleted=0 AND p.status NOT IN ('deleted','blocked'))
              + (SELECT COUNT(*) FROM community_comment c JOIN community_comment_like l
                   ON l.comment_id=c.id AND l.deleted=0 AND l.status='enabled'
                 WHERE c.author_id=#{userId} AND c.deleted=0) AS received_like_count
            """)
    CommunityPersonalStats selectStats(@Param("userId") Long userId);

    /** 类型通过固定 SQL 分支选择，禁止用户输入拼接表名或排序字段。 */
    @Select("""
            <script>
            <choose>
              <when test="type == 'commented'">
                SELECT CONCAT('comment-post-',r.post_id) AS id, r.post_id, r.target_user_id,
                       r.description, r.interaction_time FROM (
                  SELECT i.id, i.post_id, p.author_id AS target_user_id,
                         i.content AS description, i.create_time AS interaction_time,
                         ROW_NUMBER() OVER (PARTITION BY i.post_id ORDER BY i.create_time DESC, i.id DESC) AS rn
                  FROM community_comment i JOIN community_post p ON p.id=i.post_id
                  WHERE i.author_id=#{userId} AND i.deleted=0 AND i.status='published'
                    AND p.deleted=0 AND p.status='published' AND NOT EXISTS (
                    SELECT 1 FROM app_user_relation_block b WHERE b.deleted=0 AND b.status='ENABLED'
                      AND b.block_type='BLACKLIST'
                      AND ((b.user_id=#{userId} AND b.target_user_id=p.author_id)
                        OR (b.target_user_id=#{userId} AND b.user_id=p.author_id)))
                ) r WHERE r.rn=1 ORDER BY r.interaction_time DESC, r.id DESC
              </when>
              <when test="type == 'liked'">
                SELECT CONCAT('like-',i.id) AS id, i.post_id, p.author_id AS target_user_id,
                       NULL AS description, i.update_time AS interaction_time
                FROM community_like i JOIN community_post p ON p.id=i.post_id
                WHERE i.user_id=#{userId} AND i.deleted=0 AND i.status='ENABLED'
                  AND p.deleted=0 AND p.status='published' AND NOT EXISTS (
                    SELECT 1 FROM app_user_relation_block b WHERE b.deleted=0 AND b.status='ENABLED'
                      AND b.block_type='BLACKLIST'
                      AND ((b.user_id=#{userId} AND b.target_user_id=p.author_id)
                        OR (b.target_user_id=#{userId} AND b.user_id=p.author_id)))
                ORDER BY i.update_time DESC, i.id DESC
              </when>
              <when test="type == 'viewed'">
                SELECT CONCAT('view-',i.id) AS id, i.post_id, p.author_id AS target_user_id,
                       NULL AS description, i.viewed_at AS interaction_time
                FROM community_view_history i JOIN community_post p ON p.id=i.post_id
                WHERE i.user_id=#{userId} AND i.deleted=0 AND p.deleted=0 AND p.status='published' AND NOT EXISTS (
                    SELECT 1 FROM app_user_relation_block b WHERE b.deleted=0 AND b.status='ENABLED'
                      AND b.block_type='BLACKLIST'
                      AND ((b.user_id=#{userId} AND b.target_user_id=p.author_id)
                        OR (b.target_user_id=#{userId} AND b.user_id=p.author_id)))
                ORDER BY i.viewed_at DESC, i.id DESC
              </when>
              <otherwise>
                SELECT i.unlock_no AS id, NULL AS post_id, i.target_user_id,
                       NULL AS description, i.effective_time AS interaction_time
                FROM app_user_unlock_record i WHERE i.user_id=#{userId} AND i.deleted=0
                  AND NOT EXISTS (
                    SELECT 1 FROM app_user_relation_block b WHERE b.deleted=0 AND b.status='ENABLED'
                      AND b.block_type='BLACKLIST'
                      AND ((b.user_id=#{userId} AND b.target_user_id=i.target_user_id)
                        OR (b.target_user_id=#{userId} AND b.user_id=i.target_user_id)))
                ORDER BY i.effective_time DESC, i.id DESC
              </otherwise>
            </choose>
            </script>
            """)
    Page<CommunityInteractionProjection> selectInteractions(Page<CommunityInteractionProjection> page,
            @Param("userId") Long userId, @Param("type") String type);

    /** 评论用户按最新评论去重；头像与关系在分页后批量查询。 */
    @Select("""
            <script>
            <choose>
              <when test="type == 'liked'">
                SELECT i.user_id AS target_user_id, i.update_time AS interaction_time
                FROM community_like i JOIN app_user u ON u.id=i.user_id AND u.deleted=0
                WHERE i.post_id=#{postId} AND i.deleted=0 AND i.status='ENABLED'
                ORDER BY i.update_time DESC, i.id DESC
              </when>
              <otherwise>
                SELECT r.target_user_id, r.description, r.interaction_time FROM (
                  SELECT i.author_id AS target_user_id, i.content AS description,
                         i.create_time AS interaction_time, i.id,
                         ROW_NUMBER() OVER (PARTITION BY i.author_id ORDER BY i.create_time DESC, i.id DESC) AS rn
                  FROM community_comment i JOIN app_user u ON u.id=i.author_id AND u.deleted=0
                  WHERE i.post_id=#{postId} AND i.deleted=0 AND i.status='published'
                ) r WHERE r.rn=1 ORDER BY r.interaction_time DESC, r.id DESC
              </otherwise>
            </choose>
            </script>
            """)
    Page<CommunityInteractionProjection> selectInteractors(Page<CommunityInteractionProjection> page,
            @Param("postId") Long postId, @Param("type") String type);

    /** 隐藏名单只读当前页，避免为全部历史记录逐个加载个人资料。 */
    @Select("""
            SELECT i.target_user_id, i.update_time AS interaction_time
            FROM community_content_preference i JOIN app_user u ON u.id=i.target_user_id AND u.deleted=0
            WHERE i.user_id=#{userId} AND i.deleted=0 AND i.action_type='hide_author_posts' AND i.status='enabled'
            ORDER BY i.update_time DESC, i.id DESC
            """)
    Page<CommunityInteractionProjection> selectHiddenAuthors(Page<CommunityInteractionProjection> page,
            @Param("userId") Long userId);
}
