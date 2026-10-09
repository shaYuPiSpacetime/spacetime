package com.spacetime.common.util;

import com.spacetime.common.entity.AppUser;

import java.time.LocalDate;

/** 用户星座统一由出生日期派生，避免历史缓存值与生日不一致。 */
public final class ProfileZodiac {

    private ProfileZodiac() {
    }

    /**
     * 根据公历出生日期计算中文星座。
     *
     * @param birthday 出生日期
     * @return 中文星座名；生日为空时返回 null
     */
    public static String calculate(LocalDate birthday) {
        if (birthday == null) {
            return null;
        }
        int month = birthday.getMonthValue();
        int day = birthday.getDayOfMonth();
        if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "水瓶座";
        if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "双鱼座";
        if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "白羊座";
        if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "金牛座";
        if ((month == 5 && day >= 21) || (month == 6 && day <= 21)) return "双子座";
        if ((month == 6 && day >= 22) || (month == 7 && day <= 22)) return "巨蟹座";
        if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "狮子座";
        if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "处女座";
        if ((month == 9 && day >= 23) || (month == 10 && day <= 23)) return "天秤座";
        if ((month == 10 && day >= 24) || (month == 11 && day <= 22)) return "天蝎座";
        if ((month == 11 && day >= 23) || (month == 12 && day <= 21)) return "射手座";
        return "摩羯座";
    }

    /** 有生日时始终实时计算；仅生日缺失的旧数据回退历史星座字段。 */
    public static String resolve(AppUser user) {
        if (user == null) {
            return null;
        }
        return user.getBirthday() == null ? user.getZodiac() : calculate(user.getBirthday());
    }
}
