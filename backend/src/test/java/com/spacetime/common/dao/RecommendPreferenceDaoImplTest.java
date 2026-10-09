package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.dao.impl.RecommendPreferenceDaoImpl;
import com.spacetime.common.entity.RecommendPreference;
import com.spacetime.common.mapper.RecommendPreferenceMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

/** 推荐偏好清空与乐观锁持久化回归。 */
@ExtendWith(MockitoExtension.class)
class RecommendPreferenceDaoImplTest {
    @Mock private RecommendPreferenceMapper mapper;
    @InjectMocks private RecommendPreferenceDaoImpl dao;

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void clearingAdvancedRangesShouldExplicitlyWriteNullWithVersionGuard() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), RecommendPreference.class);
        RecommendPreference entity = new RecommendPreference();
        entity.setUserId(7L);
        entity.setVersion(3);
        dao.updateByVersion(entity, 2);

        ArgumentCaptor<LambdaUpdateWrapper<RecommendPreference>> captor = ArgumentCaptor.forClass((Class) LambdaUpdateWrapper.class);
        verify(mapper).update(any(RecommendPreference.class), captor.capture());
        assertThat(captor.getValue().getSqlSet()).contains("min_height", "max_height", "min_weight", "max_weight");
        assertThat(captor.getValue().getSqlSegment()).contains("user_id =", "version =");
        assertThat(captor.getValue().getParamNameValuePairs().values()).containsNull();
    }
}
