package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** 验证真实 MyBatis 动态分支与分页 COUNT 解析，不依赖生产会话或业务数据。 */
class CommunityPersonalQueryMapperTest {
    @Test
    void commentsAreOnePostPerPageAndAllFeedHistoryExcludesBlockedAuthors() {
        var config = new MybatisConfiguration(); config.addMapper(CommunityPersonalQueryMapper.class);
        var statement = config.getMappedStatement(CommunityPersonalQueryMapper.class.getName() + ".selectInteractions");
        for (String type : new String[]{"commented", "liked", "viewed", "unlocked"}) {
            String sql = statement.getBoundSql(Map.of("userId", 1L, "type", type)).getSql();
            assertThat(sql).contains("app_user_relation_block", "BLACKLIST", "NOT EXISTS");
            if ("unlocked".equals(type)) assertThat(sql).contains("b.target_user_id=i.target_user_id", "b.user_id=i.target_user_id");
            if ("commented".equals(type)) assertThat(sql).contains("PARTITION BY i.post_id", "r.rn=1");
        }
    }

    @Test
    void everyInteractionBranchFiltersBeforePagingAndHasStableOrder() {
        var config = new MybatisConfiguration();
        config.addMapper(CommunityPersonalQueryMapper.class);
        for (String type : new String[]{"commented", "liked", "viewed", "unlocked"}) {
            var statement = config.getMappedStatement(CommunityPersonalQueryMapper.class.getName() + ".selectInteractions");
            String sql = statement.getBoundSql(Map.of("userId", 1L, "type", type)).getSql();
            assertThat(sql).contains("i.deleted=0");
            assertThat(sql).contains("ORDER BY", "id DESC");
            if (!"unlocked".equals(type)) assertThat(sql).contains("p.deleted=0", "p.status='published'");
            Page<?> page = new Page<>(2,50); page.setOptimizeJoinOfCountSql(false);
            String countSql = new PaginationInnerInterceptor().autoCountSql(page, sql);
            assertThat(countSql).containsIgnoringCase("COUNT(*)");
            assertThat(countSql).contains("app_user_relation_block", "BLACKLIST", "NOT EXISTS");
            if (!"unlocked".equals(type)) assertThat(countSql).contains("community_post", "p.deleted = 0");
        }
    }

    @Test
    void postCountIncludesOnlyPublishedPosts() {
        var config = new MybatisConfiguration(); config.addMapper(CommunityPersonalQueryMapper.class);
        String sql = config.getMappedStatement(CommunityPersonalQueryMapper.class.getName() + ".selectStats")
                .getBoundSql(Map.of("userId", 1L)).getSql();
        String postCount = sql.substring(0, sql.indexOf("AS post_count"));
        assertThat(postCount).contains("p.deleted=0", "p.status='published'").doesNotContain("NOT IN");
    }

    @Test
    void relationBranchesAndAggregateAreValidMappedStatements() {
        var config = new MybatisConfiguration(); config.addMapper(CommunityPersonalQueryMapper.class);
        for (String type : new String[]{"liked","commented"}) {
            var statement = config.getMappedStatement(CommunityPersonalQueryMapper.class.getName() + ".selectInteractors");
            String sql = statement.getBoundSql(Map.of("postId",100L,"type",type)).getSql();
            assertThat(sql).contains("u.deleted=0", "i.deleted=0");
            if ("commented".equals(type)) assertThat(sql).contains("ROW_NUMBER()", "r.rn=1");
            Page<?> page = new Page<>(1,20); page.setOptimizeJoinOfCountSql(false);
            assertThat(new PaginationInnerInterceptor().autoCountSql(page,sql)).containsIgnoringCase("COUNT(*)");
        }
        String stats = config.getMappedStatement(CommunityPersonalQueryMapper.class.getName()+".selectStats")
                .getBoundSql(Map.of("userId",1L)).getSql();
        assertThat(stats).contains("SUM(p.like_count)", "l.deleted=0", "c.deleted=0", "f.status='FOLLOW'");
    }
}
