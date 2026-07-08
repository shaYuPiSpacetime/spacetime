package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 首登资料保存请求
 * 分5步：基础信息、生日身高、关系目标、学历、地域资料
 */
@Data
public class ProfileInitSaveReq {
    /** 当前步骤号 1-5 */
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
    /** 体重 kg */
    private Integer weight;
    /** 身份类型：在校生、职场人等 */
    private String identity;
    /** 职业 */
    private String occupation;
    /** 年收入区间 */
    private String annualIncome;
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
    /** 家乡区县 */
    private String hometownDistrict;
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
    /** 子女计划 */
    private String childrenPlan;
    /** 是否想要孩子 */
    private String wantChild;
    /** 头像URL */
    private String avatar;
    /** 关于我（20-300字） */
    private String aboutMe;
    /** 希望TA了解 */
    private String hopeTheyKnow;
}
