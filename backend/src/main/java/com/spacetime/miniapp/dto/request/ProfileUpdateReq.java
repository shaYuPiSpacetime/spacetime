package com.spacetime.miniapp.dto.request;

import lombok.Data;

/**
 * 资料增量更新请求，null字段不更新
 */
@Data
public class ProfileUpdateReq {
    /** 昵称 */
    private String nickname;
    /** 出生日期 yyyy-MM-dd */
    private String birthday;
    /** 身高cm */
    private Integer height;
    /** 体重 kg */
    private Integer weight;
    /** 身份字典 code */
    private String identity;
    /** 职业字典 code */
    private String occupation;
    /** 年收入字典 code */
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
    /** 学历字典 code */
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
    /** MBTI类型 */
    private String mbtiType;
}
