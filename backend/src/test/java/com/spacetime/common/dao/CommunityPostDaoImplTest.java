package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.dao.impl.CommunityPostDaoImpl;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.mapper.CommunityPostMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("社区帖子数据访问")
class CommunityPostDaoImplTest {

    @Mock
    private CommunityPostMapper mapper;

    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), CommunityPost.class);
    }

    @Test
    @DisplayName("驳回帖重提抢占必须同时校验帖子、版本和驳回状态")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void claimRejectedForResubmit_shouldUseStatusAndVersionCas() {
        when(mapper.update(isNull(), any())).thenReturn(1);
        CommunityPostDaoImpl dao = new CommunityPostDaoImpl(mapper);

        assertThat(dao.claimRejectedForResubmit(42L, 3)).isEqualTo(1);

        ArgumentCaptor<LambdaUpdateWrapper<CommunityPost>> captor =
                ArgumentCaptor.forClass((Class) LambdaUpdateWrapper.class);
        verify(mapper).update(isNull(), captor.capture());
        LambdaUpdateWrapper<CommunityPost> wrapper = captor.getValue();
        assertThat(wrapper.getSqlSegment().toLowerCase())
                .contains("id")
                .contains("version")
                .contains("status");
        assertThat(wrapper.getSqlSet().toLowerCase()).contains("version");
        assertThat(wrapper.getParamNameValuePairs().values())
                .contains(42L, 3, "rejected", 4);
    }

    @Test
    @DisplayName("竞态后重读帖子必须使用 FOR UPDATE 当前读")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void selectByIdForUpdate_shouldUseCurrentRead() {
        CommunityPostDaoImpl dao = new CommunityPostDaoImpl(mapper);

        dao.selectByIdForUpdate(42L);

        ArgumentCaptor<com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<CommunityPost>> captor =
                ArgumentCaptor.forClass((Class) com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper.class);
        verify(mapper).selectOne(captor.capture());
        assertThat(captor.getValue().getSqlSegment().toLowerCase())
                .contains("id")
                .contains("limit 1 for update");
        assertThat(captor.getValue().getParamNameValuePairs().values()).containsExactly(42L);
    }
}
