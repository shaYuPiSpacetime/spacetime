package com.spacetime.common.mapper;

import org.apache.ibatis.annotations.Select;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/** 最近访客分页 SQL 必须保持一人一卡、有限集合和最近访问排序。 */
class AppRelationVisitMapperContractTest {

    @Test
    void visibleVisitorQueryAggregatesByUserAndKeepsRecentVisitOrdering() throws Exception {
        Method method = AppRelationVisitMapper.class.getMethod(
                "selectVisibleRecentVisitors",
                Long.class, boolean.class, LocalDateTime.class, long.class, int.class);
        Select select = method.getAnnotation(Select.class);
        String sql = String.join(" ", Arrays.asList(select.value()))
                .replaceAll("\\s+", " ")
                .toLowerCase();

        assertThat(sql)
                .contains("partition by v.visitor_user_id")
                .contains("sum(v.pv_count) over")
                .contains("u.target_user_id = rv.visitor_user_id")
                .contains("locked_rank <= 10")
                .contains("order by last_visit_time desc, id desc")
                .doesNotContain("order by unlock_time");
    }

    @Test
    void visitorCountsUseDistinctAggregatedPeopleInsteadOfVisitWindows() throws Exception {
        Method totalMethod = AppRelationVisitMapper.class.getMethod(
                "countRecentVisitors", Long.class, LocalDateTime.class);
        Method visibleMethod = AppRelationVisitMapper.class.getMethod(
                "countVisibleRecentVisitors", Long.class, boolean.class, LocalDateTime.class);
        Method unlockedMethod = AppRelationVisitMapper.class.getMethod(
                "countUnlockedRecentVisitors", Long.class, LocalDateTime.class);

        String totalSql = sql(totalMethod);
        String visibleSql = sql(visibleMethod);
        String unlockedSql = sql(unlockedMethod);

        assertThat(totalSql).contains("visitor_rank = 1");
        assertThat(visibleSql)
                .contains("visitor_rank = 1")
                .contains("locked_rank <= 10");
        assertThat(unlockedSql).contains("count(distinct rv.visitor_user_id)");
    }

    private String sql(Method method) {
        Select select = method.getAnnotation(Select.class);
        return String.join(" ", Arrays.asList(select.value()))
                .replaceAll("\\s+", " ")
                .toLowerCase();
    }
}
