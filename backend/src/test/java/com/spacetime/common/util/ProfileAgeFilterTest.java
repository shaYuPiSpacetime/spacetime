package com.spacetime.common.util;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.spacetime.common.entity.AppUser;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.ZoneId;
import static org.assertj.core.api.Assertions.assertThat;

/** 出生日期优先及年龄查询边界回归。 */
class ProfileAgeFilterTest {
    @Test
    void birthdayShouldOverrideStaleAgeAndQueryShouldKeepLegacyFallbackSeparate() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        AppUser user = new AppUser();
        user.setAge(20);
        user.setBirthday(today.minusYears(30));
        assertThat(ProfileAgeFilter.currentAge(user)).isEqualTo(30);
        user.setBirthday(null);
        assertThat(ProfileAgeFilter.currentAge(user)).isEqualTo(20);
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), AppUser.class);
        LambdaQueryWrapper<AppUser> query = new LambdaQueryWrapper<>();
        ProfileAgeFilter.apply(query, 24, 34);
        assertThat(query.getSqlSegment()).contains("birthday BETWEEN", "birthday IS NULL", "age BETWEEN", " OR ");
        assertThat(query.getParamNameValuePairs().values()).contains(today.minusYears(35).plusDays(1), today.minusYears(24), 24, 34);
    }
}
