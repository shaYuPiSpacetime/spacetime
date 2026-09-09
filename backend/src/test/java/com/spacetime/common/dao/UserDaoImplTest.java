package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.dao.impl.UserDaoImpl;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.mapper.SysUserMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("后台工作人员数据访问")
class UserDaoImplTest {

    @Mock private SysUserMapper sysUserMapper;
    @InjectMocks private UserDaoImpl userDao;

    @Test
    @DisplayName("按手机号识别工作人员时必须使用手机号精确匹配")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void selectByPhone_shouldUseExactPhoneCondition() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), SysUser.class);

        userDao.selectByPhone("13800138000");

        ArgumentCaptor<LambdaQueryWrapper<SysUser>> captor =
                ArgumentCaptor.forClass((Class) LambdaQueryWrapper.class);
        verify(sysUserMapper).selectOne(captor.capture());
        assertThat(captor.getValue().getSqlSegment()).contains("phone =");
        assertThat(captor.getValue().getParamNameValuePairs().values())
                .containsExactly("13800138000");
    }
}
