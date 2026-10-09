package com.spacetime.common.util;

import com.spacetime.common.entity.AppUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** 出生日期到星座的统一映射测试。 */
@DisplayName("用户星座派生")
class ProfileZodiacTest {

    @ParameterizedTest(name = "{0} 应为 {1}")
    @CsvSource({
            "2000-01-19, 摩羯座", "2000-01-20, 水瓶座",
            "2000-02-18, 水瓶座", "2000-02-19, 双鱼座",
            "2000-03-20, 双鱼座", "2000-03-21, 白羊座",
            "2000-04-19, 白羊座", "2000-04-20, 金牛座",
            "2000-05-20, 金牛座", "2003-05-28, 双子座",
            "2000-06-21, 双子座", "2000-06-22, 巨蟹座",
            "2000-07-22, 巨蟹座", "2000-07-23, 狮子座",
            "2000-08-22, 狮子座", "2000-08-23, 处女座",
            "2000-09-22, 处女座", "2000-09-23, 天秤座",
            "2000-10-23, 天秤座", "2000-10-24, 天蝎座",
            "2000-11-22, 天蝎座", "2000-11-23, 射手座",
            "2000-12-21, 射手座", "2000-12-22, 摩羯座"
    })
    void shouldCalculateZodiacFromBirthday(String birthday, String expected) {
        assertThat(ProfileZodiac.calculate(LocalDate.parse(birthday))).isEqualTo(expected);
    }

    @Test
    @DisplayName("生日存在时不应信任历史星座缓存")
    void shouldIgnoreStaleZodiacWhenBirthdayExists() {
        AppUser user = new AppUser();
        user.setBirthday(LocalDate.of(2003, 5, 28));
        user.setZodiac("水瓶座");

        assertThat(ProfileZodiac.resolve(user)).isEqualTo("双子座");
    }

    @Test
    @DisplayName("仅生日缺失时兼容历史星座值")
    void shouldFallbackToStoredZodiacWithoutBirthday() {
        AppUser user = new AppUser();
        user.setZodiac("水瓶座");

        assertThat(ProfileZodiac.resolve(user)).isEqualTo("水瓶座");
    }
}
