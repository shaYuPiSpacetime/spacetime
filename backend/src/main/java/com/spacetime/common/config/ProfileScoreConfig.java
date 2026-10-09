package com.spacetime.common.config;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.util.ProfileZodiac;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.Period;

/**
 * 资料完整度评分计算器
 * 首版硬编码权重，后续迁移到 app_config 配置
 */
@Component
public class ProfileScoreConfig {

    /**
     * 根据已填资料字段计算完整度分数
     * 昵称5 + 头像10 + 性别5 + 生日5 + 身高5 + 居住城市5 + 家乡城市5
     * + 脱单目标5 + 感情状态5 + 婚姻状态5 + 学校10 + 学历5
     * + 关于我(>=20字)10 = 最高80分
     * @param user 用户实体
     * @return 0-100 的完整度分数
     */
    public int calculate(AppUser user) {
        int score = 0;
        if (StrUtil.isNotBlank(user.getNickname())) score += 5;
        if (StrUtil.isNotBlank(user.getGender())) score += 5;
        if (user.getBirthday() != null) score += 5;
        if (user.getHeight() != null) score += 5;
        if (StrUtil.isNotBlank(user.getLocationCity())) score += 5;
        if (StrUtil.isNotBlank(user.getHometownCity())) score += 5;
        if (StrUtil.isNotBlank(user.getDatingGoal())) score += 5;
        if (StrUtil.isNotBlank(user.getEmotionalStatus())) score += 5;
        if (StrUtil.isNotBlank(user.getMaritalStatus())) score += 5;
        if (StrUtil.isNotBlank(user.getSchool())) score += 10;
        if (StrUtil.isNotBlank(user.getEducationLevel())) score += 5;
        return Math.min(score, 100);
    }

    /**
     * 由生日计算年龄
     * @param birthday 出生日期
     * @return 周岁年龄
     */
    public Integer calculateAge(LocalDate birthday) {
        if (birthday == null) return null;
        return Period.between(birthday, LocalDate.now()).getYears();
    }

    /**
     * 由生日计算星座
     * @param birthday 出生日期
     * @return 中文星座名
     */
    public String calculateZodiac(LocalDate birthday) {
        return ProfileZodiac.calculate(birthday);
    }
}
