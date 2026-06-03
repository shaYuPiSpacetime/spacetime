package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 首登资料保存请求
 * 分3步：step1基础信息 → step2教育/感情 → step3自我介绍
 */
@Data
public class ProfileInitSaveReq {
    /** 当前步骤号 1/2/3 */
    @NotNull(message = "步骤不能为空")
    private Integer step;
    /** 昵称 */
    private String nickname;
    /** 性别 @see com.spacetime.common.enums.GenderEnum */
    private String gender;
    /** 出生日期 yyyy-MM-dd */
    private String birthday;
    /** 身高cm */
    private Integer height;
    /** 居住省 */
    private String locationProvince;
    /** 居住市 */
    private String locationCity;
    /** 居住区县 */
    private String locationDistrict;
    /** 家乡省 */
    private String hometownProvince;
    /** 家乡市 */
    private String hometownCity;
    /** 学校全称 */
    private String school;
    /** 专业 */
    private String major;
    /** 最高学历 */
    private String educationLevel;
    /** 感情状态 */
    private String emotionalStatus;
    /** 脱单目标 */
    private String datingGoal;
    /** 婚姻状态 */
    private String maritalStatus;
    /** 头像URL */
    private String avatar;
    /** 关于我（20-300字） */
    private String aboutMe;
    /** 希望TA了解 */
    private String hopeTheyKnow;
}
