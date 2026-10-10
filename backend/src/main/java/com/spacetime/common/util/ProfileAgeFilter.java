package com.spacetime.common.util;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.entity.AppUser;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;

/** 推荐与理想型按北京时间出生日期计算年龄，兼容无出生日期的旧资料。 */
public final class ProfileAgeFilter {
    private static final ZoneId BEIJING = ZoneId.of("Asia/Shanghai");
    private ProfileAgeFilter() { }

    /** 查询按完整周岁筛选，只有生日缺失时才使用历史年龄字段。 */
    public static void apply(LambdaQueryWrapper<AppUser> wrapper, int minAge, int maxAge) {
        LocalDate today = LocalDate.now(BEIJING);
        wrapper.and(age -> age.between(AppUser::getBirthday,
                today.minusYears(maxAge + 1L).plusDays(1), today.minusYears(minAge))
                .or(legacy -> legacy.isNull(AppUser::getBirthday).between(AppUser::getAge, minAge, maxAge)));
    }

    /** 返回当前周岁，避免资料保存后的年龄缓存跨年失效。 */
    public static Integer currentAge(AppUser user) {
        if (user.getBirthday() == null) return user.getAge();
        return Period.between(user.getBirthday(), LocalDate.now(BEIJING)).getYears();
    }
}
