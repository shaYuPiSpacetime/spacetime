package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.dao.impl.CommercialConfigLogDaoImpl;
import com.spacetime.common.entity.CommercialConfigLog;
import com.spacetime.common.mapper.CommercialConfigLogMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommercialConfigLogDaoImpl L3 测试")
class CommercialConfigLogDaoImplTest {

    @Mock
    private CommercialConfigLogMapper mapper;

    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), CommercialConfigLog.class);
    }

    @Test
    @DisplayName("L3-01 配置首页日志摘要查询不得读取前后快照大字段")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void latestSummariesShouldExcludeSnapshotColumns() {
        when(mapper.selectList(any())).thenReturn(List.of());
        CommercialConfigLogDaoImpl dao = new CommercialConfigLogDaoImpl(mapper);

        dao.selectLatestSummaries(5);

        ArgumentCaptor<LambdaQueryWrapper<CommercialConfigLog>> captor =
                ArgumentCaptor.forClass((Class) LambdaQueryWrapper.class);
        verify(mapper).selectList(captor.capture());
        assertThat(captor.getValue().getSqlSelect())
                .contains("config_version")
                .doesNotContain("before_snapshot")
                .doesNotContain("after_snapshot");
        assertThat(captor.getValue().getSqlSegment())
                .contains("create_time DESC")
                .contains("id DESC")
                .contains("LIMIT 5");
    }
}
