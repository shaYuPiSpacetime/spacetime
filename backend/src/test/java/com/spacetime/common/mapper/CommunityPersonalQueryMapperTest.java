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
    void everyInteractionBranchFiltersBeforePagingAndHasStableOrder() {
        var config = new MybatisConfiguration();
        config.addMapper(CommunityPersonalQueryMapper.class);
        for (String type : new String[]{"commented", "liked", "viewed", "unlocked"}) {
            var statement = config.getMappedStatement(CommunityPersonalQueryMapper.class.getName() + ".selectInteractions");
            String sql = statement.getBoundSql(Map.of("userId", 1L, "type", type)).getSql();
            assertThat(sql).contains("i.deleted=0", "i.id DESC");
            if (!"unlocked".equals(type)) assertThat(sql).contains("p.deleted=0", "p.status='published'");
            Page<?> page = new Page<>(2,50); page.setOptimizeJoinOfCountSql(false);
            String countSql = new PaginationInnerInterceptor().autoCountSql(page, sql);
            assertThat(countSql).containsIgnoringCase("COUNT(*)");
            if (!"unlocked".equals(type)) assertThat(countSql).contains("community_post", "p.deleted = 0");
        }
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
