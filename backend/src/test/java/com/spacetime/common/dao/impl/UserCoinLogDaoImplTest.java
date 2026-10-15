package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.mapper.UserCoinLogMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class UserCoinLogDaoImplTest {
    @ParameterizedTest
    @ValueSource(strings = {"income", "expense"})
    void groupedDirectionFiltersAmountBeforePagingAndKeepsStableOrder(String direction) {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), "test"), UserCoinLog.class);
        UserCoinLogMapper mapper = mock(UserCoinLogMapper.class);
        UserCoinLogDaoImpl dao = new UserCoinLogDaoImpl(mapper);
        when(mapper.selectPage(any(Page.class), any())).thenAnswer(invocation -> {
            LambdaQueryWrapper<UserCoinLog> query = invocation.getArgument(1);
            assertThat(query.getSqlSegment()).contains("income".equals(direction) ? "change_amount >=" : "change_amount <")
                    .contains("create_time DESC,id DESC").doesNotContain("flow_type =");
            assertThat(query.getParamNameValuePairs().values()).contains(7L, 0);
            return invocation.getArgument(0);
        });
        dao.selectPageByUserId(new Page<>(2, 20), 7L, direction);
    }
}
